"use server";

import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { dbError, firstError, idSchema, optionalInt, optionalText, refresh } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";

const PATH = "/admin/jucatorul-etapei";

const awardSchema = z.object({
  // „echipă:jucător”, ca o singură listă să ajungă pentru alegere.
  pick: z
    .string()
    .regex(/^[0-9a-f-]{36}:[0-9a-f-]{36}$/i, "Alege jucătorul")
    .transform((v) => {
      const [team_id, player_id] = v.split(":");
      return { team_id, player_id };
    })
    .pipe(z.object({ team_id: idSchema, player_id: idSchema })),
  round: optionalInt(1, 200, "Etapa trebuie să fie un număr între 1 și 200"),
  title: optionalText(80, "Titlul e prea lung"),
  body: optionalText(600, "Textul e prea lung (maxim 600 de caractere)"),
  sponsor_id: z
    .string()
    .transform((v) => v || null)
    .pipe(idSchema.nullable()),
  sort_order: z.coerce.number().int("Ordinea trebuie să fie un număr întreg").min(0).max(1000),
});

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

/** Rândul de salvat, după ce verificăm că jucătorul e chiar în lotul echipei alese. */
async function toRow(supabase: Supabase, formData: FormData) {
  const parsed = awardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);
  const { pick, round, title, ...rest } = parsed.data;

  const entry = await supabase
    .from("roster_entries")
    .select("team:teams(competition_id)")
    .eq("team_id", pick.team_id)
    .eq("player_id", pick.player_id)
    .maybeSingle()
    .overrideTypes<{ team: { competition_id: string } | null }>();
  if (entry.error) return dbError(entry.error, "");
  if (!entry.data?.team) return { error: "Jucătorul nu e în lotul acestei echipe" };

  return {
    row: {
      ...rest,
      ...pick,
      round,
      competition_id: entry.data.team.competition_id,
      title: title ?? (round ? `Jucătorul etapei ${round}` : "Jucătorul etapei"),
      is_published: formData.get("is_published") === "on",
    },
  };
}

export async function createAward(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const result = await toRow(supabase, formData);
  if (!("row" in result)) return result;

  const { error } = await supabase.from("round_awards").insert(result.row);
  if (error) return dbError(error, "");
  refresh(PATH, "content");
  return { ok: "Jucătorul etapei a fost adăugat" };
}

export async function updateAward(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Premiu invalid" };
  const result = await toRow(supabase, formData);
  if (!("row" in result)) return result;

  const { error } = await supabase.from("round_awards").update(result.row).eq("id", id.data);
  if (error) return dbError(error, "");
  refresh(PATH, "content");
  return { ok: "Salvat" };
}

export async function deleteAward(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Premiu invalid" };

  const { error } = await supabase.from("round_awards").delete().eq("id", id.data);
  if (error) return dbError(error, "");
  refresh(PATH, "content");
  return { ok: "Șters" };
}
