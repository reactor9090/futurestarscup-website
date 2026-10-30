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

  refresh(`/admin/meciuri/${match_id}`, "matches");
  return { ok: "Eveniment adăugat" };
}

export async function deleteEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const matchId = idSchema.safeParse(formData.get("match_id"));
  if (!id.success || !matchId.success) return { error: "Eveniment invalid" };

  const { error } = await supabase.from("match_events").delete().eq("id", id.data).eq("match_id", matchId.data);
  if (error) return dbError(error, "");

  refresh(`/admin/meciuri/${matchId.data}`, "matches");
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
