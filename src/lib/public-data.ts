import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { rankStandings, type FinishedMatch, type RankedRow, type StandingRow } from "@/lib/standings";

// Citiri publice, cache-uite. Tag-urile sunt invalidate de Server Actions din admin
// (vezi `refresh()` în lib/admin-actions.ts): catalog, teams, matches.

export type PublicCompetition = {
  id: string;
  name: string;
  season: { name: string; start_date: string | null; is_current: boolean } | null;
  category: { name: string; sort_order: number } | null;
};

export async function getCompetitions(): Promise<PublicCompetition[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const { data, error } = await createPublicClient()
    .from("competitions")
    .select("id, name, season:seasons(name, start_date, is_current), category:categories(name, sort_order)")
    .eq("is_published", true)
    .overrideTypes<PublicCompetition[]>();
  if (error) throw new Error(error.message);

  return data.sort(
    (a, b) =>
      Number(b.season?.is_current ?? false) - Number(a.season?.is_current ?? false) ||
      (b.season?.start_date ?? "").localeCompare(a.season?.start_date ?? "") ||
      (a.category?.sort_order ?? 0) - (b.category?.sort_order ?? 0),
  );
}

/** Competiția cerută în adresă, sau prima (sezonul curent) dacă lipsește ori e necunoscută. */
export function pickCompetition(list: PublicCompetition[], requested: string | string[] | undefined) {
  const id = Array.isArray(requested) ? requested[0] : requested;
  return list.find((c) => c.id === id) ?? list[0] ?? null;
}

/* ------------------------------ Clasament ------------------------------ */

export type StandingsTable = {
  groupName: string | null;
  rows: (RankedRow<StandingRow> & { club_slug: string; logo_url: string | null })[];
};
export type StageStandings = { id: string; name: string; type: "league" | "group" | "knockout"; tables: StandingsTable[] };

type RawStanding = StandingRow & { stage_id: string; group_id: string | null; club_slug: string; logo_url: string | null };

export async function getStandings(competitionId: string): Promise<StageStandings[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog", "teams", "matches");

  const supabase = createPublicClient();
  const stages = await supabase
    .from("stages")
    .select("id, name, type, sort_order, stage_groups(id, name, sort_order)")
    .eq("competition_id", competitionId)
    .order("sort_order");
  if (stages.error) throw new Error(stages.error.message);

  const [rows, matches] = await Promise.all([
    supabase.from("standings").select("*").in("stage_id", stages.data.map((s) => s.id)),
    supabase
      .from("matches")
      .select("stage_id, group_id, home_team_id, away_team_id, home_score, away_score")
      .eq("competition_id", competitionId)
      .eq("status", "finished")
      .overrideTypes<(FinishedMatch & { stage_id: string; group_id: string | null })[]>(),
  ]);
  if (rows.error ?? matches.error) throw new Error((rows.error ?? matches.error)!.message);
  const finished = matches.data ?? [];

  const standings = (rows.data ?? []) as unknown as RawStanding[];
  return stages.data
    .filter((s) => s.type !== "knockout")
    .map((stage) => {
      const groups = [...stage.stage_groups].sort((a, b) => a.sort_order - b.sort_order);
      const tableFor = (groupId: string | null, groupName: string | null): StandingsTable => ({
        groupName,
        rows: rankStandings(
          standings.filter((r) => r.stage_id === stage.id && r.group_id === groupId),
          finished.filter((m) => m.stage_id === stage.id && m.group_id === groupId),
        ),
      });
      const tables =
        stage.type === "group" ? groups.map((g) => tableFor(g.id, g.name)) : [tableFor(null, null)];
      return { id: stage.id, name: stage.name, type: stage.type, tables };
    });
}

/* ------------------------- Program și rezultate ------------------------- */

export type PublicMatch = {
  id: string;
  round: number | null;
  round_label: string | null;
  kickoff_at: string | null;
  venue: string | null;
  status: "scheduled" | "finished" | "postponed" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  stage: { name: string; sort_order: number } | null;
  group: { name: string } | null;
  home: { id: string; name: string; club: { logo_url: string | null } | null };
  away: { id: string; name: string; club: { logo_url: string | null } | null };
};

export async function getMatches(competitionId: string): Promise<PublicMatch[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog", "teams", "matches");

  const team = "id, name, club:clubs(logo_url)";
  const { data, error } = await createPublicClient()
    .from("matches")
    .select(
      `id, round, round_label, kickoff_at, venue, status, home_score, away_score, home_penalties, away_penalties,
       stage:stages(name, sort_order), group:stage_groups(name),
       home:teams!matches_home_team_id_fkey(${team}), away:teams!matches_away_team_id_fkey(${team})`,
    )
    .eq("competition_id", competitionId)
    .order("kickoff_at", { ascending: true, nullsFirst: false })
    .overrideTypes<PublicMatch[]>();
  if (error) throw new Error(error.message);
  return data;
}

/* ------------------------------ Golgheteri ------------------------------ */

export type PlayerStatRow = {
  player_id: string;
  team_id: string;
  team_name: string;
  first_name: string;
  last_name: string;
  position: "portar" | "fundas" | "mijlocas" | "atacant" | null;
  shirt_number: number | null;
  matches_played: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
};

export async function getPlayerStats(competitionId: string): Promise<PlayerStatRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("teams", "matches");

  const { data, error } = await createPublicClient()
    .from("player_stats")
    .select(
      "player_id, team_id, team_name, first_name, last_name, position, shirt_number, matches_played, goals, assists, yellow_cards, red_cards",
    )
    .eq("competition_id", competitionId)
    .overrideTypes<PlayerStatRow[]>();
  if (error) throw new Error(error.message);
  return data;
}

/* -------------------------------- Echipe -------------------------------- */

export type PublicTeam = {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
};

export async function getTeams(competitionId: string): Promise<PublicTeam[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("teams", "matches");

  const supabase = createPublicClient();
  const [teams, stats] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, club:clubs(logo_url, city)")
      .eq("competition_id", competitionId)
      .overrideTypes<{ id: string; name: string; club: { logo_url: string | null; city: string | null } | null }[]>(),
    supabase
      .from("team_stats")
      .select("team_id, played, won, drawn, lost, goals_for, goals_against")
      .eq("competition_id", competitionId)
      .overrideTypes<
        { team_id: string; played: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number }[]
      >(),
  ]);
  const failed = teams.error ?? stats.error;
  if (failed) throw new Error(failed.message);

  const byTeam = new Map((stats.data ?? []).map((s) => [s.team_id, s]));
  return (teams.data ?? [])
    .map((t) => {
      const s = byTeam.get(t.id);
      const won = s?.won ?? 0;
      const drawn = s?.drawn ?? 0;
      return {
        id: t.id,
        name: t.name,
        logo_url: t.club?.logo_url ?? null,
        city: t.club?.city ?? null,
        played: s?.played ?? 0,
        won,
        drawn,
        lost: s?.lost ?? 0,
        goals_for: s?.goals_for ?? 0,
        goals_against: s?.goals_against ?? 0,
        points: 3 * won + drawn,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ro"));
}

export type TeamProfile = {
  id: string;
  name: string;
  club: { name: string; logo_url: string | null; city: string | null; coach_name: string | null; description: string | null } | null;
  competition: { id: string; name: string } | null;
  players: PlayerStatRow[];
  matches: PublicMatch[];
};

export async function getTeamProfile(teamId: string): Promise<TeamProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog", "teams", "matches");

  const supabase = createPublicClient();
  const { data: team, error } = await supabase
    .from("teams")
    .select(
      "id, name, club:clubs(name, logo_url, city, coach_name, description), competition:competitions!inner(id, name, is_published)",
    )
    .eq("id", teamId)
    .eq("competition.is_published", true)
    .maybeSingle()
    .overrideTypes<Omit<TeamProfile, "players" | "matches">>();
  if (error) throw new Error(error.message);
  if (!team) return null;

  const teamCols = "id, name, club:clubs(logo_url)";
  const [players, matches] = await Promise.all([
    supabase
      .from("player_stats")
      .select(
        "player_id, team_id, team_name, first_name, last_name, position, shirt_number, matches_played, goals, assists, yellow_cards, red_cards",
      )
      .eq("team_id", teamId)
      .overrideTypes<PlayerStatRow[]>(),
    supabase
      .from("matches")
      .select(
        `id, round, round_label, kickoff_at, venue, status, home_score, away_score, home_penalties, away_penalties,
         stage:stages(name, sort_order), group:stage_groups(name),
         home:teams!matches_home_team_id_fkey(${teamCols}), away:teams!matches_away_team_id_fkey(${teamCols})`,
      )
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order("kickoff_at", { ascending: true, nullsFirst: false })
      .overrideTypes<PublicMatch[]>(),
  ]);
  const failed = players.error ?? matches.error;
  if (failed) throw new Error(failed.message);

  return { ...team, players: players.data ?? [], matches: matches.data ?? [] };
}

/* ------------------------- Conținut: anunțuri, sponsori, premii ------------------------- */

export type PublicAnnouncement = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  link_url: string | null;
  is_banner: boolean;
  published_at: string;
};

export async function getAnnouncements(): Promise<PublicAnnouncement[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("content");

  const { data, error } = await createPublicClient()
    .from("announcements")
    .select("id, title, body, image_url, link_url, is_banner, published_at")
    .eq("is_published", true)
    .order("sort_order")
    .order("published_at", { ascending: false })
    .overrideTypes<PublicAnnouncement[]>();
  if (error) throw new Error(error.message);
  return data;
}

export type PublicSponsor = { id: string; name: string; logo_url: string | null; website_url: string | null; tier: string | null };

export async function getSponsors(): Promise<PublicSponsor[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("content");

  const { data, error } = await createPublicClient()
    .from("sponsors")
    .select("id, name, logo_url, website_url, tier")
    .eq("is_active", true)
    .order("sort_order")
    .order("name")
    .overrideTypes<PublicSponsor[]>();
  if (error) throw new Error(error.message);
  return data;
}

export type PublicPrize = {
  id: string;
  title: string;
  description: string | null;
  winner_text: string | null;
  winner_team: { id: string; name: string } | null;
};

export async function getPrizes(competitionId: string): Promise<PublicPrize[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("content", "teams");

  const { data, error } = await createPublicClient()
    .from("prizes")
    .select("id, title, description, winner_text, winner_team:teams(id, name)")
    .eq("competition_id", competitionId)
    .order("sort_order")
    .overrideTypes<PublicPrize[]>();
  if (error) throw new Error(error.message);
  return data;
}

/* ------------------------------- Înscrieri ------------------------------- */

export type OpenCompetition = {
  id: string;
  name: string;
  min_birth_year: number | null;
  max_birth_year: number | null;
};

/** Competițiile care primesc înscrieri acum (publicate și cu înscrieri deschise). */
export async function getOpenCompetitions(): Promise<OpenCompetition[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const { data, error } = await createPublicClient()
    .from("competitions")
    .select("id, name, min_birth_year, max_birth_year, season:seasons(start_date), category:categories(sort_order)")
    .eq("is_published", true)
    .eq("registration_open", true)
    .overrideTypes<
      (OpenCompetition & { season: { start_date: string | null } | null; category: { sort_order: number } | null })[]
    >();
  if (error) throw new Error(error.message);

  return data
    .sort(
      (a, b) =>
        (b.season?.start_date ?? "").localeCompare(a.season?.start_date ?? "") ||
        (a.category?.sort_order ?? 0) - (b.category?.sort_order ?? 0),
    )
    .map(({ id, name, min_birth_year, max_birth_year }) => ({ id, name, min_birth_year, max_birth_year }));
}
