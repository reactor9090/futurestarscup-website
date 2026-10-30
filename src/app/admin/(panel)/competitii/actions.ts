"use server";

import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { dbError, firstError, idSchema, optionalInt, refresh } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";

const PATH = "/admin/competitii";
const yearField = optionalInt(1990, 2100, "Anul nașterii trebuie să fie între 1990 și 2100");

const competitionFields = {
  name: z.string().trim().max(80, "Numele e prea lung"),
  min_birth_year: yearField,
  max_birth_year: yearField,
};

const yearsOrdered = {
  check: (c: { min_birth_year: number | null; max_birth_year: number | null }) =>
    c.min_birth_year === null || c.max_birth_year === null || c.min_birth_year <= c.max_birth_year,
  params: { message: "Anul minim nu poate fi mai mare decât cel maxim", path: ["max_birth_year"] },
};

const createCompetitionSchema = z
  .object({ season_id: idSchema, category_id: idSchema, ...competitionFields })
  .refine(yearsOrdered.check, yearsOrdered.params);

const updateCompetitionSchema = z
  .object({
    id: idSchema,
    name: competitionFields.name.min(1, "Numele competiției e obligatoriu"),
    min_birth_year: yearField,
    max_birth_year: yearField,
  })
  .refine(yearsOrdered.check, yearsOrdered.params);

const flags = (formData: FormData) => ({
  registration_open: formData.get("registration_open") === "on",
  is_published: formData.get("is_published") === "on",
});

/* --------------------------- Competiții --------------------------- */

export async function createCompetition(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = createCompetitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  // Fără nume explicit: „U12 – 2026/2027”
  let name = parsed.data.name;
  if (!name) {
    const [season, category] = await Promise.all([
      supabase.from("seasons").select("name").eq("id", parsed.data.season_id).single(),
      supabase.from("categories").select("name").eq("id", parsed.data.category_id).single(),
    ]);
    if (season.error || category.error) return { error: "Sezonul sau categoria nu există" };
    name = `${category.data.name} – ${season.data.name}`;
  }

  const { error } = await supabase.from("competitions").insert({ ...parsed.data, name, ...flags(formData) });
  if (error) return dbError(error, "Există deja o competiție pentru acest sezon și această categorie");

  refresh(PATH);
  return { ok: "Competiție creată" };
}

export async function updateCompetition(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = updateCompetitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  const { id, ...values } = parsed.data;
  const { error } = await supabase
    .from("competitions")
    .update({ ...values, ...flags(formData) })
    .eq("id", id);
  if (error) return dbError(error, "Există deja o competiție cu aceste date");

  refresh(PATH);
  return { ok: "Salvat" };
}

export async function deleteCompetition(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Competiție invalidă" };

  // Ștergerea ar șterge în cascadă echipele, meciurile și rezultatele.
  const [teams, matches] = await Promise.all([
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("competition_id", id.data),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("competition_id", id.data),
  ]);
  if (teams.error || matches.error) return { error: "Nu am putut verifica conținutul competiției" };
  if (teams.count || matches.count) {
    return { error: "Competiția are echipe sau meciuri. Șterge-le întâi, ca să nu pierzi rezultatele." };
  }

  const { error } = await supabase.from("competitions").delete().eq("id", id.data);
  if (error) return dbError(error, "");

  refresh(PATH);
  return { ok: "Competiție ștearsă" };
}

/* ------------------------------ Faze ------------------------------ */

const stageSchema = z.object({
  name: z.string().trim().min(1, "Numele fazei e obligatoriu").max(60, "Numele e prea lung"),
  sort_order: z.coerce.number().int("Ordinea trebuie să fie un număr întreg").min(0).max(1000),
});

export async function createStage(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = stageSchema
    .extend({ competition_id: idSchema, type: z.enum(["league", "group", "knockout"], "Alege tipul fazei") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  const { error } = await supabase.from("stages").insert(parsed.data);
  if (error) return dbError(error, "");

  refresh(PATH);
  return { ok: "Fază adăugată" };
}

export async function updateStage(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = stageSchema.extend({ id: idSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  // Tipul fazei nu se schimbă după creare: meciurile și clasamentul depind de el.
  const { id, ...values } = parsed.data;
  const { error } = await supabase.from("stages").update(values).eq("id", id);
  if (error) return dbError(error, "");

  refresh(PATH);
  return { ok: "Salvat" };
}

export async function deleteStage(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Fază invalidă" };

  const { count, error: countError } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", id.data);
  if (countError) return dbError(countError, "");
  if (count) return { error: "Faza are meciuri. Șterge-le întâi, ca să nu pierzi rezultatele." };

  const { error } = await supabase.from("stages").delete().eq("id", id.data);
  if (error) return dbError(error, "");

  refresh(PATH);
  return { ok: "Fază ștearsă" };
}

/* ------------------------------ Grupe ------------------------------ */

export async function createGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = z
    .object({
      stage_id: idSchema,
      name: z.string().trim().min(1, "Numele grupei e obligatoriu").max(30, "Numele e prea lung"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  const stage = await supabase.from("stages").select("type").eq("id", parsed.data.stage_id).single();
  if (stage.error) return { error: "Faza nu există" };
  if (stage.data.type !== "group") return { error: "Grupele se pot adăuga doar la o fază de tip „Grupe”" };

  const { count } = await supabase
    .from("stage_groups")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", parsed.data.stage_id);

  const { error } = await supabase.from("stage_groups").insert({ ...parsed.data, sort_order: (count ?? 0) + 1 });
  if (error) return dbError(error, "Există deja o grupă cu acest nume în această fază");

  refresh(PATH);
  return { ok: "Grupă adăugată" };
}

export async function deleteGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Grupă invalidă" };

  const { count, error: countError } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("group_id", id.data);
  if (countError) return dbError(countError, "");
  if (count) return { error: "Grupa are meciuri. Șterge-le întâi." };

  const { error } = await supabase.from("stage_groups").delete().eq("id", id.data);
  if (error) return dbError(error, "");

  refresh(PATH);
  return { ok: "Grupă ștearsă" };
}

/* ------------------------ Echipe în grupe ------------------------ */

const groupTeamSchema = z.object({ group_id: idSchema, team_id: idSchema });

export async function addTeamToGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = groupTeamSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Alege o echipă" };

  const [group, team] = await Promise.all([
    supabase.from("stage_groups").select("stage_id, stages(competition_id)").eq("id", parsed.data.group_id).single(),
    supabase.from("teams").select("competition_id").eq("id", parsed.data.team_id).single(),
  ]);
  if (group.error || team.error) return { error: "Grupa sau echipa nu există" };

  const stage = group.data.stages as unknown as { competition_id: string } | null;
  if (stage?.competition_id !== team.data.competition_id) {
    return { error: "Echipa nu face parte din această competiție" };
  }

  // O echipă poate fi într-o singură grupă dintr-o fază.
  const siblings = await supabase.from("stage_groups").select("id").eq("stage_id", group.data.stage_id);
  if (siblings.error) return dbError(siblings.error, "");
  const { count } = await supabase
    .from("group_teams")
    .select("team_id", { count: "exact", head: true })
    .eq("team_id", parsed.data.team_id)
    .in("group_id", siblings.data.map((g) => g.id));
  if (count) return { error: "Echipa e deja într-o grupă din această fază" };

  const { error } = await supabase.from("group_teams").insert(parsed.data);
  if (error) return dbError(error, "Echipa e deja în această grupă");

  refresh(PATH);
  return { ok: "Echipă adăugată în grupă" };
}

export async function removeTeamFromGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = groupTeamSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Echipă invalidă" };

  // Meciurile jucate în grupă ar rămâne fără clasament.
  const { count, error: countError } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("group_id", parsed.data.group_id)
    .or(`home_team_id.eq.${parsed.data.team_id},away_team_id.eq.${parsed.data.team_id}`);
  if (countError) return dbError(countError, "");
  if (count) return { error: "Echipa are meciuri în această grupă. Șterge-le întâi." };

  const { error } = await supabase
    .from("group_teams")
    .delete()
    .eq("group_id", parsed.data.group_id)
    .eq("team_id", parsed.data.team_id);
  if (error) return dbError(error, "");

  refresh(PATH);
  return { ok: "Echipă scoasă din grupă" };
}
