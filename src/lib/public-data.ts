import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { teamForm, type FormResult } from "@/lib/form";
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
  rows: (RankedRow<StandingRow> & { club_slug: string; logo_url: string | null; form: FormResult[] })[];
};
export type StageStandings = {
  id: string;
  name: string;
  type: "league" | "group" | "knockout";
  /** Toate meciurile fazei s-au jucat (cel puțin unul): liderul e campion. */
  complete: boolean;
  tables: StandingsTable[];
};

type RawStanding = StandingRow & { stage_id: string; group_id: string | null; club_slug: string; logo_url: string | null };
type StageMatch = FinishedMatch & {
  stage_id: string;
  group_id: string | null;
  status: PublicMatch["status"];
  kickoff_at: string | null;
};

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
      .select("stage_id, group_id, status, kickoff_at, home_team_id, away_team_id, home_score, away_score")
      .eq("competition_id", competitionId)
      .overrideTypes<StageMatch[]>(),
  ]);
  if (rows.error ?? matches.error) throw new Error((rows.error ?? matches.error)!.message);
  const all = matches.data ?? [];
  const finished = all.filter((m) => m.status === "finished");

  const standings = (rows.data ?? []) as unknown as RawStanding[];
  return stages.data
    .filter((s) => s.type !== "knockout")
    .map((stage) => {
      const groups = [...stage.stage_groups].sort((a, b) => a.sort_order - b.sort_order);
      const tableFor = (groupId: string | null, groupName: string | null): StandingsTable => {
        const played = finished.filter((m) => m.stage_id === stage.id && m.group_id === groupId);
        return {
          groupName,
          rows: rankStandings(
            standings.filter((r) => r.stage_id === stage.id && r.group_id === groupId),
            played,
          ).map((r) => ({ ...r, form: teamForm(played, r.team_id) })),
        };
      };
      const tables =
        stage.type === "group" ? groups.map((g) => tableFor(g.id, g.name)) : [tableFor(null, null)];
      // Meciurile anulate nu mai țin faza deschisă.
      const stageMatches = all.filter((m) => m.stage_id === stage.id && m.status !== "cancelled");
      const complete = stageMatches.length > 0 && stageMatches.every((m) => m.status === "finished");
      return { id: stage.id, name: stage.name, type: stage.type, complete, tables };
    });
}

/* ------------------------- Program și rezultate ------------------------- */

export type PublicMatch = {
  id: string;
  round: number | null;
  round_label: string | null;
  kickoff_at: string | null;
  venue: string | null;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
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

const playerStatCols =
  "player_id, team_id, team_name, first_name, last_name, position, shirt_number, matches_played, goals, assists, yellow_cards, red_cards";

export type PlayerCardRow = PlayerStatRow & {
  birth_year: number | null;
  /** Doar cu acordul părinților (`photo_consent`). */
  photo_url: string | null;
  logo_url: string | null;
};

type PlayerExtra = { id: string; birth_year: number | null; photo_url: string | null; photo_consent: boolean };
const publicPhoto = (p: Pick<PlayerExtra, "photo_url" | "photo_consent">) => (p.photo_consent ? p.photo_url : null);

export async function getPlayerStats(competitionId: string): Promise<PlayerCardRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("teams", "matches");

  const supabase = createPublicClient();
  const [stats, players, teams] = await Promise.all([
    supabase.from("player_stats").select(playerStatCols).eq("competition_id", competitionId).overrideTypes<PlayerStatRow[]>(),
    supabase
      .from("players")
      .select("id, birth_year, photo_url, photo_consent, roster_entries!inner(team:teams!inner(competition_id))")
      .eq("roster_entries.team.competition_id", competitionId)
      .overrideTypes<PlayerExtra[]>(),
    supabase
      .from("teams")
      .select("id, club:clubs(logo_url)")
      .eq("competition_id", competitionId)
      .overrideTypes<{ id: string; club: { logo_url: string | null } | null }[]>(),
  ]);
  const failed = stats.error ?? players.error ?? teams.error;
  if (failed) throw new Error(failed.message);

  const extra = new Map((players.data ?? []).map((p) => [p.id, p]));
  const logos = new Map((teams.data ?? []).map((t) => [t.id, t.club?.logo_url ?? null]));
  return (stats.data ?? []).map((s) => {
    const p = extra.get(s.player_id);
    return {
      ...s,
      birth_year: p?.birth_year ?? null,
      photo_url: p ? publicPhoto(p) : null,
      logo_url: logos.get(s.team_id) ?? null,
    };
  });
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
  coach_name: string | null;
  roster_size: number;
  /** Locul în primul clasament în care apare echipa; null dacă nu e în niciun clasament. */
  position: number | null;
};

type RawTeam = {
  id: string;
  name: string;
  club: { logo_url: string | null; city: string | null; coach_name: string | null } | null;
  roster_entries: { count: number }[];
};

export async function getTeams(competitionId: string): Promise<PublicTeam[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog", "teams", "matches");

  const supabase = createPublicClient();
  const [teams, stats, standings] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, club:clubs(logo_url, city, coach_name), roster_entries(count)")
      .eq("competition_id", competitionId)
      .overrideTypes<RawTeam[]>(),
    supabase
      .from("team_stats")
      .select("team_id, played, won, drawn, lost, goals_for, goals_against")
      .eq("competition_id", competitionId)
      .overrideTypes<
        { team_id: string; played: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number }[]
      >(),
    getStandings(competitionId),
  ]);
  const failed = teams.error ?? stats.error;
  if (failed) throw new Error(failed.message);

  const byTeam = new Map((stats.data ?? []).map((s) => [s.team_id, s]));
  const positions = new Map<string, number>();
  for (const row of standings.flatMap((s) => s.tables.flatMap((t) => t.rows))) {
    if (!positions.has(row.team_id)) positions.set(row.team_id, row.position);
  }
  return (teams.data ?? [])
    .map((t) => {
      const s = byTeam.get(t.id);
      const won = s?.won ?? 0;
      const drawn = s?.drawn ?? 0;
      return {
        coach_name: t.club?.coach_name ?? null,
        roster_size: t.roster_entries[0]?.count ?? 0,
        position: positions.get(t.id) ?? null,
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

/* ------------------------------ Rezultate recente ------------------------------ */

export type RecentResult = PublicMatch & {
  competition: { id: string; name: string; season: { name: string } | null; category: { name: string } | null };
};

/** Ultimele meciuri terminate (cel mai recent primul) din competițiile date, publicate. */
export async function getRecentResults(limit: number, competitionIds: string[]): Promise<RecentResult[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog", "teams", "matches");
  if (competitionIds.length === 0) return [];

  const team = "id, name, club:clubs(logo_url)";
  const { data, error } = await createPublicClient()
    .from("matches")
    .select(
      `id, round, round_label, kickoff_at, venue, status, home_score, away_score, home_penalties, away_penalties,
       stage:stages(name, sort_order), group:stage_groups(name),
       home:teams!matches_home_team_id_fkey(${team}), away:teams!matches_away_team_id_fkey(${team}),
       competition:competitions!inner(id, name, is_published, season:seasons(name), category:categories(name))`,
    )
    .eq("status", "finished")
    .eq("competition.is_published", true)
    .in("competition_id", competitionIds)
    .order("kickoff_at", { ascending: false, nullsFirst: false })
    .limit(limit)
    .overrideTypes<RecentResult[]>();
  if (error) throw new Error(error.message);
  return data;
}

/* ------------------------------ Profil jucător ------------------------------ */

export type PlayerMatch = PublicMatch & { goals: number; assists: number; teamId: string };

export type PlayerProfile = {
  id: string;
  first_name: string;
  last_name: string;
  birth_year: number | null;
  position: PlayerStatRow["position"];
  photo_url: string | null;
  /** Câte un rând pe fiecare echipă (competiție publicată) în care a jucat. */
  seasons: (PlayerStatRow & { competition: { id: string; name: string }; logo_url: string | null })[];
  matches: PlayerMatch[];
};

export async function getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog", "teams", "matches");

  const supabase = createPublicClient();
  const { data: player, error } = await supabase
    .from("players")
    .select("id, first_name, last_name, birth_year, position, photo_url, photo_consent")
    .eq("id", playerId)
    .maybeSingle()
    .overrideTypes<Omit<PlayerProfile, "seasons" | "matches"> & { photo_consent: boolean }>();
  if (error) throw new Error(error.message);
  if (!player) return null;

  const [competitions, stats, appearances, events] = await Promise.all([
    getCompetitions(),
    supabase
      .from("player_stats")
      .select(`${playerStatCols}, competition_id`)
      .eq("player_id", playerId)
      .overrideTypes<(PlayerStatRow & { competition_id: string })[]>(),
    supabase.from("match_appearances").select("match_id, team_id").eq("player_id", playerId),
    supabase
      .from("match_events")
      .select("match_id, team_id, type, player_id, assist_player_id")
      .or(`player_id.eq.${playerId},assist_player_id.eq.${playerId}`),
  ]);
  const failed = stats.error ?? appearances.error ?? events.error;
  if (failed) throw new Error(failed.message);

  // Doar competițiile publicate; un jucător dintr-o competiție nepublicată nu are profil.
  // Ordinea din getCompetitions: sezonul curent primul.
  const published = new Map(competitions.map((c, i) => [c.id, { ...c, order: i }]));
  const rows = (stats.data ?? [])
    .filter((s) => published.has(s.competition_id))
    .sort((a, b) => published.get(a.competition_id)!.order - published.get(b.competition_id)!.order);
  if (rows.length === 0) return null;
  const teamIds = new Set(rows.map((r) => r.team_id));

  const logos = await supabase
    .from("teams")
    .select("id, club:clubs(logo_url)")
    .in("id", [...teamIds])
    .overrideTypes<{ id: string; club: { logo_url: string | null } | null }[]>();
  if (logos.error) throw new Error(logos.error.message);
  const logoOf = new Map((logos.data ?? []).map((t) => [t.id, t.club?.logo_url ?? null]));

  // Meciurile în care a jucat: prezență sau orice eveniment al lui.
  const played = new Map<string, { teamId: string; goals: number; assists: number }>();
  for (const a of appearances.data ?? []) {
    if (teamIds.has(a.team_id)) played.set(a.match_id, { teamId: a.team_id, goals: 0, assists: 0 });
  }
  for (const e of events.data ?? []) {
    if (!teamIds.has(e.team_id)) continue;
    const entry = played.get(e.match_id) ?? { teamId: e.team_id, goals: 0, assists: 0 };
    if (e.type === "goal" && e.player_id === playerId) entry.goals++;
    if (e.type === "goal" && e.assist_player_id === playerId) entry.assists++;
    played.set(e.match_id, entry);
  }

  let matches: PlayerMatch[] = [];
  if (played.size > 0) {
    const team = "id, name, club:clubs(logo_url)";
    const res = await supabase
      .from("matches")
      .select(
        `id, round, round_label, kickoff_at, venue, status, home_score, away_score, home_penalties, away_penalties,
         stage:stages(name, sort_order), group:stage_groups(name),
         home:teams!matches_home_team_id_fkey(${team}), away:teams!matches_away_team_id_fkey(${team})`,
      )
      .in("id", [...played.keys()])
      .eq("status", "finished")
      .order("kickoff_at", { ascending: false, nullsFirst: false })
      .overrideTypes<PublicMatch[]>();
    if (res.error) throw new Error(res.error.message);
    matches = (res.data ?? []).map((m) => ({ ...m, ...played.get(m.id)! }));
  }

  const { photo_consent, ...rest } = player;
  return {
    ...rest,
    photo_url: publicPhoto({ photo_url: player.photo_url, photo_consent }),
    seasons: rows.map((r) => ({
      ...r,
      competition: { id: r.competition_id, name: published.get(r.competition_id)!.name },
      logo_url: logoOf.get(r.team_id) ?? null,
    })),
    matches,
  };
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

export type RoundAward = {
  id: string;
  round: number | null;
  title: string;
  body: string | null;
  competition: { id: string; name: string };
  player: {
    id: string;
    first_name: string;
    last_name: string;
    position: PlayerStatRow["position"];
    photo_url: string | null;
  };
  team: { id: string; name: string; club: { logo_url: string | null } | null };
  shirt_number: number | null;
  sponsor: { name: string; logo_url: string | null; website_url: string | null } | null;
};

/** Jucătorii etapei publicați, cel mai recent primul (pentru caruselul de pe prima pagină). */
export async function getRoundAwards(): Promise<RoundAward[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog", "content", "teams");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("round_awards")
    .select(
      `id, round, title, body, player_id, team_id,
       competition:competitions!inner(id, name, is_published),
       player:players(id, first_name, last_name, position, photo_url, photo_consent),
       team:teams(id, name, club:clubs(logo_url)),
       sponsor:sponsors(name, logo_url, website_url)`,
    )
    .eq("is_published", true)
    .eq("competition.is_published", true)
    .order("sort_order")
    .order("created_at", { ascending: false })
    .overrideTypes<
      (Omit<RoundAward, "player" | "shirt_number"> & {
        player_id: string;
        team_id: string;
        player: Omit<RoundAward["player"], "photo_url"> & { photo_url: string | null; photo_consent: boolean };
      })[]
    >();
  if (error) throw new Error(error.message);
  if (data.length === 0) return [];

  const numbers = await supabase
    .from("roster_entries")
    .select("player_id, team_id, shirt_number")
    .in("player_id", data.map((a) => a.player_id));
  if (numbers.error) throw new Error(numbers.error.message);

  return data.map(({ player_id, team_id, player: { photo_consent, ...player }, ...award }) => ({
    ...award,
    player: { ...player, photo_url: photo_consent ? player.photo_url : null },
    shirt_number:
      numbers.data.find((n) => n.player_id === player_id && n.team_id === team_id)?.shirt_number ?? null,
  }));
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
