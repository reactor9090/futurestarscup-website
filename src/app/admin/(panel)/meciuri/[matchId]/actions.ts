"use server";

import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { dbError, firstError, idSchema, optionalInt, refresh } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";

const optionalId = z
  .string()
  .transform((v) => v || null)
  .pipe(idSchema.nullable());

const eventSchema = z.object({
  match_id: idSchema,
  type: z.enum(["goal", "own_goal", "yellow_card", "red_card"], "Alege tipul evenimentului"),
  player_id: optionalId,
  assist_player_id: optionalId,
  minute: optionalInt(0, 150, "Minutul trebuie să fie între 0 și 150"),
});

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

/** Echipele meciului, sau null dacă meciul nu există. */
async function matchTeams(supabase: Supabase, matchId: string) {
  const { data } = await supabase.from("matches").select("home_team_id, away_team_id").eq("id", matchId).maybeSingle();
  return data ? [data.home_team_id, data.away_team_id] : null;
}

type GoalEvent = { type: string; team_id: string };

/** Echipa care primește golul: marcatorul la gol, adversarul la autogol; null pentru cartonașe. */
function scoringTeam(e: GoalEvent, homeId: string, awayId: string): string | null {
  if (e.type === "goal") return e.team_id;
  if (e.type === "own_goal") return e.team_id === homeId ? awayId : homeId;
  return null;
}

/**
 * La un meci live, un gol adăugat (+1) sau șters (−1) mută și scorul de pe site.
 * La un meci terminat scorul rămâne cel introdus de admin (el e cel oficial).
 */
async function adjustLiveScore(supabase: Supabase, matchId: string, e: GoalEvent, delta: 1 | -1) {
  const { data: m } = await supabase
    .from("matches")
    .select("status, home_team_id, away_team_id, home_score, away_score")
    .eq("id", matchId)
    .maybeSingle();
  if (!m || m.status !== "live") return;
  const team = scoringTeam(e, m.home_team_id, m.away_team_id);
  if (!team) return;
  const column = team === m.home_team_id ? "home_score" : "away_score";
  await supabase
    .from("matches")
    .update({ [column]: Math.max(0, (m[column] ?? 0) + delta) })
    .eq("id", matchId);
}

const refreshMatch = (matchId: string) => {
  refresh(`/admin/meciuri/${matchId}`, "matches");
  refresh("/admin/meciuri");
};

/** Pornește meciul: starea devine „live”, scorul pornește de la golurile deja introduse (de obicei 0–0). */
export async function startMatch(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("match_id"));
  if (!id.success) return { error: "Meci invalid" };

  const [match, events] = await Promise.all([
    supabase.from("matches").select("status, home_team_id, away_team_id").eq("id", id.data).single(),
    supabase.from("match_events").select("type, team_id").eq("match_id", id.data),
  ]);
  if (match.error || events.error) return { error: "Meciul nu mai există" };
  if (match.data.status === "finished") return { error: "Meciul e deja terminat" };

  const { home_team_id: home, away_team_id: away } = match.data;
  const goals = events.data.map((e) => scoringTeam(e, home, away));
  const { error } = await supabase
    .from("matches")
    .update({
      status: "live",
      home_score: goals.filter((t) => t === home).length,
      away_score: goals.filter((t) => t === away).length,
      home_penalties: null,
      away_penalties: null,
    })
    .eq("id", id.data);
  if (error) return dbError(error, "");

  refreshMatch(id.data);
  return { ok: "Meciul a început. Golurile adăugate actualizează scorul live." };
}

/** Termină meciul: scorul live devine scorul final și meciul intră în clasament și statistici. */
export async function finishMatch(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("match_id"));
  if (!id.success) return { error: "Meci invalid" };

  const { error } = await supabase
    .from("matches")
    .update({ status: "finished" })
    .eq("id", id.data)
    .eq("status", "live");
  if (error) return dbError(error, "");

  refreshMatch(id.data);
  return { ok: "Meci terminat. Clasamentul și golgheterii s-au actualizat." };
}

/** Echipa din lotul căreia face parte jucătorul, dintre echipele meciului. */
async function teamOfPlayer(supabase: Supabase, playerId: string, teamIds: string[]): Promise<string | null> {
  const { data } = await supabase
    .from("roster_entries")
    .select("team_id")
    .eq("player_id", playerId)
    .in("team_id", teamIds)
    .limit(1)
    .maybeSingle();
  return data?.team_id ?? null;
}

export async function addEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);
  const { match_id, type, player_id, assist_player_id, minute } = parsed.data;

  if (!player_id) return { error: "Alege jucătorul" };
  if (type !== "goal" && assist_player_id) return { error: "Assistul se poate adăuga doar la un gol" };
  if (assist_player_id === player_id) return { error: "Marcatorul nu poate fi și pasatorul" };

  const teams = await matchTeams(supabase, match_id);
  if (!teams) return { error: "Meciul nu mai există" };

  // team_id = echipa jucătorului; la autogol, golul se contabilizează adversarului în view.
  const team_id = await teamOfPlayer(supabase, player_id, teams);
  if (!team_id) return { error: "Jucătorul nu face parte din niciuna dintre echipele meciului" };
  if (assist_player_id) {
    const assistTeam = await teamOfPlayer(supabase, assist_player_id, [team_id]);
    if (!assistTeam) return { error: "Pasatorul trebuie să fie din aceeași echipă cu marcatorul" };
  }

  const { error } = await supabase
    .from("match_events")
    .insert({ match_id, type, team_id, player_id, assist_player_id, minute });
  if (error) return dbError(error, "");
  await adjustLiveScore(supabase, match_id, { type, team_id }, 1);

  refreshMatch(match_id);
  return { ok: "Eveniment adăugat" };
}

export async function deleteEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const matchId = idSchema.safeParse(formData.get("match_id"));
  if (!id.success || !matchId.success) return { error: "Eveniment invalid" };

  const { data: deleted, error } = await supabase
    .from("match_events")
    .delete()
    .eq("id", id.data)
    .eq("match_id", matchId.data)
    .select("type, team_id")
    .maybeSingle();
  if (error) return dbError(error, "");
  if (deleted) await adjustLiveScore(supabase, matchId.data, deleted, -1);

  refreshMatch(matchId.data);
  return { ok: "Eveniment șters" };
}

/** Înlocuiește lista celor care au jucat în meci cu jucătorii bifați. */
export async function saveAppearances(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const matchId = idSchema.safeParse(formData.get("match_id"));
  const players = z.array(idSchema).safeParse(formData.getAll("player_id"));
  if (!matchId.success || !players.success) return { error: "Date invalide" };

  const teams = await matchTeams(supabase, matchId.data);
  if (!teams) return { error: "Meciul nu mai există" };

  const roster = await supabase.from("roster_entries").select("player_id, team_id").in("team_id", teams);
  if (roster.error) return dbError(roster.error, "");
  const teamOf = new Map(roster.data.map((r) => [r.player_id, r.team_id]));
  const rows = [...new Set(players.data)].map((player_id) => ({
    match_id: matchId.data,
    player_id,
    team_id: teamOf.get(player_id),
  }));
  if (rows.some((r) => !r.team_id)) return { error: "Un jucător bifat nu face parte din echipele meciului" };

  const del = await supabase.from("match_appearances").delete().eq("match_id", matchId.data);
  if (del.error) return dbError(del.error, "");
  if (rows.length) {
    const { error } = await supabase.from("match_appearances").insert(rows);
    if (error) return dbError(error, "");
  }

  refresh(`/admin/meciuri/${matchId.data}`, "matches");
  return { ok: `Prezențe salvate (${rows.length})` };
}

const statKeys = ["shots", "shots_on_target", "corners", "fouls", "offsides"] as const;
const statNumber = optionalInt(0, 999, "Statisticile trebuie să fie numere între 0 și 999");
const possessionNumber = optionalInt(0, 100, "Posesia trebuie să fie între 0 și 100");

/** Salvează statisticile echipelor. Posesia se introduce pentru gazde; oaspeții primesc restul până la 100. */
export async function saveStats(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const matchId = idSchema.safeParse(formData.get("match_id"));
  if (!matchId.success) return { error: "Meci invalid" };

  const { data: match } = await supabase
    .from("matches")
    .select("home_team_id, away_team_id")
    .eq("id", matchId.data)
    .maybeSingle();
  if (!match) return { error: "Meciul nu mai există" };

  const read = (field: string, schema: typeof statNumber) => schema.safeParse(formData.get(field) ?? "");
  const rows = [];
  for (const [side, team_id] of [["home", match.home_team_id], ["away", match.away_team_id]] as const) {
    const row: Record<string, number | string | null> = { match_id: matchId.data, team_id };
    for (const key of statKeys) {
      const v = read(`${side}_${key}`, statNumber);
      if (!v.success) return firstError(v.error);
      row[key] = v.data;
    }
    rows.push(row);
  }
  const possession = read("home_possession", possessionNumber);
  if (!possession.success) return firstError(possession.error);
  rows[0].possession = possession.data;
  rows[1].possession = possession.data === null ? null : 100 - possession.data;

  for (const row of rows) {
    if (row.shots !== null && row.shots_on_target !== null && Number(row.shots_on_target) > Number(row.shots)) {
      return { error: "Șuturile pe poartă nu pot depăși totalul șuturilor" };
    }
  }

  const { error } = await supabase.from("match_team_stats").upsert(rows, { onConflict: "match_id,team_id" });
  if (error) return dbError(error, "");

  refresh(`/admin/meciuri/${matchId.data}`, "matches");
  return { ok: "Statistici salvate" };
}
