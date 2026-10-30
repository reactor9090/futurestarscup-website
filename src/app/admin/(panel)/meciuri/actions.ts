"use server";

import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { dbError, firstError, idSchema, optionalInt, optionalText, refresh } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { fromLocalInput } from "@/lib/datetime";

const PATH = "/admin/meciuri";
const score = optionalInt(0, 99, "Scorul trebuie să fie între 0 și 99");
const optionalId = z
  .string()
  .transform((v) => v || null)
  .pipe(idSchema.nullable());

const matchSchema = z.object({
  stage_id: idSchema,
  group_id: optionalId,
  home_team_id: idSchema,
  away_team_id: idSchema,
  round: optionalInt(1, 99, "Etapa trebuie să fie între 1 și 99"),
  round_label: optionalText(40, "Eticheta etapei e prea lungă"),
  kickoff_at: z.string().trim().transform((v) => (v ? fromLocalInput(v) : null)),
  venue: optionalText(80, "Locația e prea lungă"),
  notes: optionalText(500, "Observațiile sunt prea lungi"),
  status: z.enum(["scheduled", "finished", "postponed", "cancelled"], "Alege starea meciului"),
  home_score: score,
  away_score: score,
  home_penalties: score,
  away_penalties: score,
});

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];
type MatchInput = z.infer<typeof matchSchema>;

/** Verifică regulile care depind de alte tabele și întoarce valorile de salvat. */
async function checkMatch(
  supabase: Supabase,
  input: MatchInput,
  rawKickoff: string,
): Promise<{ error: string } | { values: MatchInput & { competition_id: string } }> {
  if (input.home_team_id === input.away_team_id) return { error: "Echipa gazdă și cea oaspete trebuie să fie diferite" };
  if (rawKickoff.trim() && !input.kickoff_at) return { error: "Data și ora meciului sunt invalide" };

  const stage = await supabase.from("stages").select("competition_id, type").eq("id", input.stage_id).single();
  if (stage.error) return { error: "Faza nu există" };
  const competitionId = stage.data.competition_id;

  const teams = await supabase
    .from("teams")
    .select("id, competition_id")
    .in("id", [input.home_team_id, input.away_team_id]);
  if (teams.error || teams.data.length !== 2 || teams.data.some((t) => t.competition_id !== competitionId)) {
    return { error: "Ambele echipe trebuie să facă parte din competiția fazei" };
  }

  if (stage.data.type === "group") {
    if (!input.group_id) return { error: "Alege grupa meciului" };
    const group = await supabase.from("stage_groups").select("stage_id").eq("id", input.group_id).single();
    if (group.error || group.data.stage_id !== input.stage_id) return { error: "Grupa nu aparține acestei faze" };
    const members = await supabase
      .from("group_teams")
      .select("team_id")
      .eq("group_id", input.group_id)
      .in("team_id", [input.home_team_id, input.away_team_id]);
    if (members.error) return { error: "Nu am putut verifica grupa" };
    if (members.data.length !== 2) return { error: "Ambele echipe trebuie să fie în grupa aleasă" };
  } else if (input.group_id) {
    return { error: "Doar fazele de tip „Grupe” au grupe" };
  }

  const values = { ...input, competition_id: competitionId };
  if (input.status !== "finished") {
    // Scorul există doar pentru meciurile terminate.
    values.home_score = values.away_score = values.home_penalties = values.away_penalties = null;
    return { values };
  }

  if (input.home_score === null || input.away_score === null) {
    return { error: "Un meci terminat are nevoie de scor pentru ambele echipe" };
  }
  if (input.home_penalties !== null || input.away_penalties !== null) {
    if (stage.data.type !== "knockout") return { error: "Loviturile de departajare există doar la faza play-off" };
    if (input.home_score !== input.away_score) return { error: "Loviturile de departajare se introduc doar la egalitate" };
    if (input.home_penalties === null || input.away_penalties === null) {
      return { error: "Completează loviturile de departajare pentru ambele echipe" };
    }
    if (input.home_penalties === input.away_penalties) return { error: "Loviturile de departajare nu pot fi la egalitate" };
  }
  return { values };
}

export async function createMatch(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = matchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  const checked = await checkMatch(supabase, parsed.data, String(formData.get("kickoff_at") ?? ""));
  if ("error" in checked) return checked;

  const { error } = await supabase.from("matches").insert(checked.values);
  if (error) return dbError(error, "");

  refresh(PATH, "matches");
  return { ok: "Meci adăugat" };
}

export async function updateMatch(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const parsed = matchSchema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: "Meci invalid" };
  if (!parsed.success) return firstError(parsed.error);

  const checked = await checkMatch(supabase, parsed.data, String(formData.get("kickoff_at") ?? ""));
  if ("error" in checked) return checked;

  // Golurile și prezențele sunt legate de echipele meciului; schimbarea lor le-ar face greșite.
  const current = await supabase.from("matches").select("home_team_id, away_team_id").eq("id", id.data).single();
  if (current.error) return { error: "Meciul nu mai există" };
  const teamsChanged =
    current.data.home_team_id !== checked.values.home_team_id || current.data.away_team_id !== checked.values.away_team_id;
  if (teamsChanged && (await hasDetails(supabase, id.data))) {
    return { error: "Meciul are marcatori sau prezențe. Șterge-le întâi dacă vrei să schimbi echipele." };
  }

  const { error } = await supabase.from("matches").update(checked.values).eq("id", id.data);
  if (error) return dbError(error, "");

  refresh(PATH, "matches");
  return { ok: "Salvat" };
}

export async function deleteMatch(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Meci invalid" };

  if (await hasDetails(supabase, id.data)) {
    return { error: "Meciul are marcatori sau prezențe. Șterge-le întâi, ca să nu pierzi statisticile." };
  }

  const { error } = await supabase.from("matches").delete().eq("id", id.data);
  if (error) return dbError(error, "");

  refresh(PATH, "matches");
  return { ok: "Meci șters" };
}

async function hasDetails(supabase: Supabase, matchId: string): Promise<boolean> {
  const [events, appearances] = await Promise.all([
    supabase.from("match_events").select("id", { count: "exact", head: true }).eq("match_id", matchId),
    supabase.from("match_appearances").select("player_id", { count: "exact", head: true }).eq("match_id", matchId),
  ]);
  return Boolean(events.count || appearances.count);
}
