"use server";

import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { dbError, firstError, idSchema, refresh } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";

const optionalDate = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(z.iso.date("Dată invalidă").nullable());

const seasonSchema = z
  .object({
    name: z.string().trim().min(1, "Numele sezonului e obligatoriu").max(40, "Numele e prea lung"),
    start_date: optionalDate,
    end_date: optionalDate,
  })
  .refine((s) => !s.start_date || !s.end_date || s.end_date >= s.start_date, {
    message: "Data de sfârșit nu poate fi înaintea celei de început",
    path: ["end_date"],
  });

const categorySchema = z.object({
  name: z.string().trim().min(1, "Numele categoriei e obligatoriu").max(30, "Numele e prea lung"),
  sort_order: z.coerce.number().int("Ordinea trebuie să fie un număr întreg").min(0).max(1000),
});

/* ----------------------------- Sezoane ----------------------------- */

export async function createSeason(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = seasonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  const slug = slugify(parsed.data.name);
  if (!slug) return { error: "Numele sezonului trebuie să conțină litere sau cifre" };

  const makeCurrent = formData.get("make_current") === "on";
  if (makeCurrent) {
    const { error } = await supabase.from("seasons").update({ is_current: false }).eq("is_current", true);
    if (error) return dbError(error, "");
  }

  const { error } = await supabase.from("seasons").insert({ ...parsed.data, slug, is_current: makeCurrent });
  if (error) return dbError(error, "Există deja un sezon cu acest nume");

  refresh("/admin/sezoane");
  return { ok: "Sezon adăugat" };
}

export async function updateSeason(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const parsed = seasonSchema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: "Sezon invalid" };
  if (!parsed.success) return firstError(parsed.error);

  const { error } = await supabase.from("seasons").update(parsed.data).eq("id", id.data);
  if (error) return dbError(error, "Există deja un sezon cu acest nume");

  refresh("/admin/sezoane");
  return { ok: "Salvat" };
}

export async function setCurrentSeason(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Sezon invalid" };

  // Un singur sezon poate fi curent (index unic), deci îl dezactivăm întâi pe cel vechi.
  const unset = await supabase.from("seasons").update({ is_current: false }).eq("is_current", true);
  if (unset.error) return dbError(unset.error, "");
  const { error } = await supabase.from("seasons").update({ is_current: true }).eq("id", id.data);
  if (error) return dbError(error, "");

  refresh("/admin/sezoane");
  return { ok: "Sezon curent actualizat" };
}

export async function deleteSeason(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Sezon invalid" };

  // Ștergerea unui sezon ar șterge în cascadă competițiile, meciurile și rezultatele lui.
  const { count, error: countError } = await supabase
    .from("competitions")
    .select("id", { count: "exact", head: true })
    .eq("season_id", id.data);
  if (countError) return dbError(countError, "");
  if (count) return { error: "Sezonul are competiții. Șterge-le întâi, ca să nu pierzi meciurile și rezultatele." };

  const { error } = await supabase.from("seasons").delete().eq("id", id.data);
  if (error) return dbError(error, "");

  refresh("/admin/sezoane");
  return { ok: "Sezon șters" };
}

/* ---------------------------- Categorii ---------------------------- */

export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  const slug = slugify(parsed.data.name);
  if (!slug) return { error: "Numele categoriei trebuie să conțină litere sau cifre" };

  const { error } = await supabase.from("categories").insert({ ...parsed.data, slug });
  if (error) return dbError(error, "Există deja o categorie cu acest nume");

  refresh("/admin/sezoane");
  return { ok: "Categorie adăugată" };
}

export async function updateCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: "Categorie invalidă" };
  if (!parsed.success) return firstError(parsed.error);

  // Slug-ul rămâne neschimbat, ca linkurile existente să nu se rupă.
  const { error } = await supabase.from("categories").update(parsed.data).eq("id", id.data);
  if (error) return dbError(error, "Există deja o categorie cu acest nume");

  refresh("/admin/sezoane");
  return { ok: "Salvat" };
}

export async function deleteCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Categorie invalidă" };

  const { error } = await supabase.from("categories").delete().eq("id", id.data);
  if (error) {
    return error.code === "23503"
      ? { error: "Categoria e folosită de o competiție și nu poate fi ștearsă." }
      : dbError(error, "");
  }

  refresh("/admin/sezoane");
  return { ok: "Categorie ștearsă" };
}
