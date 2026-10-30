// Rulează migrările + seed-ul într-un Postgres în memorie (PGlite) și verifică
// view-urile de statistici, securitatea (RLS) și fluxul de înscriere.
// Schema `auth` și rolurile Supabase sunt simulate minimal.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { rankStandings, type FinishedMatch, type StandingRow } from "@/lib/standings";

const root = join(__dirname, "..");
const ADMIN_ID = "00000000-0000-0000-0000-00000000ad01";

const supabaseStub = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;

let db: PGlite;

async function as<T>(role: "anon" | "authenticated", userId: string | null, fn: () => Promise<T>) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

async function one<T>(sql: string, params: unknown[] = []) {
  const res = await db.query<T>(sql, params);
  return res.rows[0];
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(supabaseStub);
  const migrations = readdirSync(join(root, "migrations"))
    .filter((f) => f.endsWith(".sql") && !f.includes("storage"))
    .sort();
  for (const file of migrations) {
    await db.exec(readFileSync(join(root, "migrations", file), "utf8"));
  }
  await db.exec(readFileSync(join(root, "seed.sql"), "utf8"));
  await db.exec(`
    insert into auth.users (id) values ('${ADMIN_ID}');
    insert into admins (user_id) values ('${ADMIN_ID}');
  `);
}, 60_000);

async function u12Standings() {
  const { rows } = await db.query<StandingRow & { team_name: string }>(`
    select s.* from standings s
    join stages st on st.id = s.stage_id
    join competitions c on c.id = st.competition_id
    where c.name like 'U12%'`);
  const { rows: matches } = await db.query<FinishedMatch>(`
    select home_team_id, away_team_id, home_score, away_score from matches m
    join competitions c on c.id = m.competition_id
    where c.name like 'U12%' and m.status = 'finished'`);
  return rankStandings(rows, matches);
}

describe("clasament calculat din meciuri", () => {
  it("calculează punctele și golurile corect (U12)", async () => {
    const table = await u12Standings();
    expect(table.map((r) => [r.team_name, r.played, r.points, r.goals_for, r.goals_against])).toEqual([
      ["Viitorul Chișinău", 2, 6, 5, 1],
      ["Academia Cahul", 2, 4, 2, 1],
      ["Dinamo Orhei", 2, 1, 0, 3],
      ["Sporting Bălți", 2, 0, 2, 4],
    ]);
  });

  it("include echipele fără meciuri jucate și separă grupele (U10)", async () => {
    const { rows } = await db.query<{ group_name: string; team_name: string; played: number; points: number }>(`
      select g.name as group_name, s.team_name, s.played, s.points
      from standings s join stage_groups g on g.id = s.group_id
      order by g.name, s.points desc, s.team_name`);
    expect(rows).toHaveLength(6);
    expect(rows.filter((r) => r.group_name === "Grupa A").map((r) => [r.team_name, r.points])).toEqual([
      ["Real Ungheni", 3],
      ["Olimp Comrat", 0],
      ["Speranța Soroca", 0],
    ]);
  });

  it("corectarea unui scor recalculează automat clasamentul", async () => {
    await db.exec(`
      update matches set home_score = 0, away_score = 1
      where home_team_id = (select id from teams where name = 'Viitorul Chișinău')
        and away_team_id = (select id from teams where name = 'Sporting Bălți')`);
    const table = await u12Standings();
    expect(table.find((r) => r.team_name === "Sporting Bălți")!.points).toBe(3);
    await db.exec(`
      update matches set home_score = 2, away_score = 1
      where home_team_id = (select id from teams where name = 'Viitorul Chișinău')
        and away_team_id = (select id from teams where name = 'Sporting Bălți')`);
  });
});

describe("statistici jucători", () => {
  it("numără goluri, pase decisive și meciuri jucate; autogolul nu e gol", async () => {
    const { rows } = await db.query<{ team_name: string; shirt_number: number; goals: number; assists: number; matches_played: number }>(`
      select team_name, shirt_number, goals, assists, matches_played
      from player_stats where team_name in ('Viitorul Chișinău', 'Sporting Bălți')
        and (goals > 0 or assists > 0 or (team_name = 'Sporting Bălți' and shirt_number = 2))
      order by team_name, shirt_number`);
    expect(rows).toEqual([
      { team_name: "Sporting Bălți", shirt_number: 2, goals: 0, assists: 0, matches_played: 1 },
      { team_name: "Sporting Bălți", shirt_number: 4, goals: 0, assists: 1, matches_played: 1 },
      { team_name: "Sporting Bălți", shirt_number: 6, goals: 1, assists: 0, matches_played: 1 },
      { team_name: "Sporting Bălți", shirt_number: 7, goals: 1, assists: 0, matches_played: 1 },
      { team_name: "Viitorul Chișinău", shirt_number: 4, goals: 0, assists: 1, matches_played: 1 },
      { team_name: "Viitorul Chișinău", shirt_number: 5, goals: 0, assists: 1, matches_played: 1 },
      { team_name: "Viitorul Chișinău", shirt_number: 6, goals: 3, assists: 2, matches_played: 2 },
      { team_name: "Viitorul Chișinău", shirt_number: 7, goals: 2, assists: 0, matches_played: 2 },
    ]);
  });

  it("statistici echipă pe toată competiția", async () => {
    const r = await one<{ played: number; won: number; drawn: number; lost: number; goal_difference: number }>(
      `select played, won, drawn, lost, goal_difference from team_stats where team_name = 'Academia Cahul'`,
    );
    expect(r).toEqual({ played: 2, won: 1, drawn: 1, lost: 0, goal_difference: 1 });
  });
});

describe("securitate (RLS)", () => {
  it("vizitatorul citește datele publice, dar nu contactele și înscrierile", async () => {
    await as("anon", null, async () => {
      expect((await one<{ n: number }>(`select count(*)::int n from teams`)).n).toBe(10);
      expect((await one<{ n: number }>(`select count(*)::int n from standings`)).n).toBe(10);
      expect((await one<{ n: number }>(`select count(*)::int n from club_contacts`)).n).toBe(0);
      expect((await one<{ n: number }>(`select count(*)::int n from registrations`)).n).toBe(0);
    });
  });

  it("vizitatorul nu poate modifica date", async () => {
    await as("anon", null, async () => {
      await expect(db.exec(`insert into seasons (name, slug) values ('hack', 'hack')`)).rejects.toThrow();
      await db.exec(`update matches set home_score = 99`);
    });
    expect((await one<{ n: number }>(`select count(*)::int n from matches where home_score = 99`)).n).toBe(0);
  });

  it("un utilizator autentificat care nu e admin nu poate scrie", async () => {
    await as("authenticated", "00000000-0000-0000-0000-000000000bad", async () => {
      await expect(db.exec(`insert into seasons (name, slug) values ('x', 'x')`)).rejects.toThrow();
    });
  });

  it("adminul poate scrie", async () => {
    await as("authenticated", ADMIN_ID, async () => {
      await db.exec(`insert into categories (name, slug, sort_order) values ('U14', 'u14', 14)`);
    });
    expect((await one<{ n: number }>(`select count(*)::int n from categories where slug = 'u14'`)).n).toBe(1);
  });
});

describe("înscriere online", () => {
  const payload = (competition: string) =>
    JSON.stringify({
      competition_id: competition,
      club_name: "Luceafărul Florești",
      city: "Florești",
      coach_name: "Ion Rusu",
      coach_phone: "+37369000000",
      players: [
        { first_name: "Ana", last_name: "Ceban", birth_date: "2016-05-01", position: "atacant", shirt_number: 9 },
        { first_name: "Dan", last_name: "Lungu", birth_date: "2017-02-11", shirt_number: 9 },
      ],
    });

  it("refuză înscrierea dacă e închisă (U12)", async () => {
    const comp = await one<{ id: string }>(`select id from competitions where name like 'U12%'`);
    await as("anon", null, async () => {
      await expect(db.query(`select submit_registration($1::jsonb)`, [payload(comp.id)])).rejects.toThrow(/închise/);
    });
  });

  it("acceptă înscrierea, iar adminul o aprobă → echipă + lot", async () => {
    const comp = await one<{ id: string }>(`select id from competitions where name like 'U10%'`);
    const reg = await as("anon", null, () =>
      one<{ id: string }>(`select submit_registration($1::jsonb) as id`, [payload(comp.id)]),
    );

    // vizitatorul nu poate aproba
    await as("anon", null, async () => {
      await expect(db.query(`select approve_registration($1)`, [reg.id])).rejects.toThrow();
    });

    const team = await as("authenticated", ADMIN_ID, () =>
      one<{ id: string }>(`select approve_registration($1) as id`, [reg.id]),
    );
    const roster = await db.query<{ first_name: string; birth_year: number; shirt_number: number | null }>(
      `select p.first_name, p.birth_year, r.shirt_number from roster_entries r
       join players p on p.id = r.player_id where r.team_id = $1 order by p.first_name`,
      [team.id],
    );
    expect(roster.rows).toEqual([
      { first_name: "Ana", birth_year: 2016, shirt_number: 9 },
      { first_name: "Dan", birth_year: 2017, shirt_number: null }, // număr duplicat ignorat
    ]);
    expect((await one<{ slug: string }>(`select c.slug from teams t join clubs c on c.id = t.club_id where t.id = $1`, [team.id])).slug)
      .toBe("luceafarul-floresti");

    // a doua aprobare e refuzată
    await as("authenticated", ADMIN_ID, async () => {
      await expect(db.query(`select approve_registration($1)`, [reg.id])).rejects.toThrow(/procesat/);
    });
  });
});
