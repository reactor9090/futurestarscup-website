"use server";

import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { dbError, firstError, idSchema, optionalText, refresh } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { pickedFile, removeImage, uploadImage } from "@/lib/media";

const PATH = "/admin/continut";
const done = (ok: string): FormState => {
  refresh(PATH, "content");
  return { ok };
};

const sortOrder = z.coerce.number().int("Ordinea trebuie să fie un număr întreg").min(0).max(1000);
const optionalId = z
  .string()
  .transform((v) => v || null)
  .pipe(idSchema.nullable());
const optionalUrl = optionalText(300, "Linkul e prea lung").pipe(
  z
    .url("Linkul trebuie să fie o adresă completă (https://…)")
    .refine((u) => /^https?:\/\//i.test(u), "Linkul trebuie să înceapă cu http:// sau https://")
    .nullable(),
);

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

/**
 * Aplică alegerea de imagine din formular: fișier nou (înlocuiește), bifa „remove_image” (șterge) sau nimic.
 * Întoarce noua valoare pentru coloana de imagine, sau o eroare.
 */
async function resolveImage(
  supabase: Supabase,
  formData: FormData,
  field: string,
  folder: string,
  current: string | null,
): Promise<{ url: string | null; replaced: boolean } | { error: string }> {
  const file = pickedFile(formData, field);
  if (file) {
    const uploaded = await uploadImage(supabase, folder, file);
    return "error" in uploaded ? uploaded : { url: uploaded.url, replaced: true };
  }
  if (formData.get("remove_image") === "on") return { url: null, replaced: current !== null };
  return { url: current, replaced: false };
}

/* ------------------------------ Anunțuri ------------------------------ */

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Titlul e obligatoriu").max(120, "Titlul e prea lung"),
  body: optionalText(2000, "Textul e prea lung (maxim 2000 de caractere)"),
  link_url: optionalUrl,
  sort_order: sortOrder,
});

const announcementFlags = (formData: FormData) => ({
  is_banner: formData.get("is_banner") === "on",
  is_published: formData.get("is_published") === "on",
});

export async function createAnnouncement(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  const image = await resolveImage(supabase, formData, "image", "announcements", null);
  if ("error" in image) return image;

  const { error } = await supabase
    .from("announcements")
    .insert({ ...parsed.data, ...announcementFlags(formData), image_url: image.url });
  if (error) {
    await removeImage(supabase, image.url);
    return dbError(error, "");
  }
  return done("Anunț adăugat");
}

export async function updateAnnouncement(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: "Anunț invalid" };
  if (!parsed.success) return firstError(parsed.error);

  const current = await supabase.from("announcements").select("image_url").eq("id", id.data).single();
  if (current.error) return { error: "Anunțul nu mai există" };
  const image = await resolveImage(supabase, formData, "image", "announcements", current.data.image_url);
  if ("error" in image) return image;

  const { error } = await supabase
    .from("announcements")
    .update({ ...parsed.data, ...announcementFlags(formData), image_url: image.url })
    .eq("id", id.data);
  if (error) {
    if (image.replaced && image.url) await removeImage(supabase, image.url);
    return dbError(error, "");
  }
  if (image.replaced) await removeImage(supabase, current.data.image_url);
  return done("Salvat");
}

export async function deleteAnnouncement(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Anunț invalid" };

  const current = await supabase.from("announcements").select("image_url").eq("id", id.data).maybeSingle();
  const { error } = await supabase.from("announcements").delete().eq("id", id.data);
  if (error) return dbError(error, "");
  await removeImage(supabase, current.data?.image_url ?? null);
  return done("Anunț șters");
}

/* ------------------------------ Sponsori ------------------------------ */

const sponsorSchema = z.object({
  name: z.string().trim().min(1, "Numele sponsorului e obligatoriu").max(80, "Numele e prea lung"),
  tier: optionalText(60, "Categoria e prea lungă"),
  website_url: optionalUrl,
  sort_order: sortOrder,
});

export async function createSponsor(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = sponsorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  const image = await resolveImage(supabase, formData, "logo", "sponsors", null);
  if ("error" in image) return image;

  const { error } = await supabase
    .from("sponsors")
    .insert({ ...parsed.data, is_active: formData.get("is_active") === "on", logo_url: image.url });
  if (error) {
    await removeImage(supabase, image.url);
    return dbError(error, "");
  }
  return done("Sponsor adăugat");
}

export async function updateSponsor(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const parsed = sponsorSchema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: "Sponsor invalid" };
  if (!parsed.success) return firstError(parsed.error);

  const current = await supabase.from("sponsors").select("logo_url").eq("id", id.data).single();
  if (current.error) return { error: "Sponsorul nu mai există" };
  const image = await resolveImage(supabase, formData, "logo", "sponsors", current.data.logo_url);
  if ("error" in image) return image;

  const { error } = await supabase
    .from("sponsors")
    .update({ ...parsed.data, is_active: formData.get("is_active") === "on", logo_url: image.url })
    .eq("id", id.data);
  if (error) {
    if (image.replaced && image.url) await removeImage(supabase, image.url);
    return dbError(error, "");
  }
  if (image.replaced) await removeImage(supabase, current.data.logo_url);
  return done("Salvat");
}

export async function deleteSponsor(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Sponsor invalid" };

  const current = await supabase.from("sponsors").select("logo_url").eq("id", id.data).maybeSingle();
  const { error } = await supabase.from("sponsors").delete().eq("id", id.data);
  if (error) return dbError(error, "");
  await removeImage(supabase, current.data?.logo_url ?? null);
  return done("Sponsor șters");
}

/* ------------------------------- Premii ------------------------------- */

const prizeSchema = z.object({
  title: z.string().trim().min(1, "Titlul premiului e obligatoriu").max(80, "Titlul e prea lung"),
  description: optionalText(500, "Descrierea e prea lungă"),
  winner_team_id: optionalId,
  winner_text: optionalText(120, "Câștigătorul e prea lung"),
  sort_order: sortOrder,
});

/** Echipa câștigătoare trebuie să facă parte din competiția premiului. */
async function checkWinnerTeam(supabase: Supabase, competitionId: string, teamId: string | null) {
  if (!teamId) return null;
  const { data } = await supabase.from("teams").select("competition_id").eq("id", teamId).maybeSingle();
  return data?.competition_id === competitionId ? null : "Echipa câștigătoare nu face parte din această competiție";
}

export async function createPrize(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = prizeSchema.extend({ competition_id: idSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);

  const invalid = await checkWinnerTeam(supabase, parsed.data.competition_id, parsed.data.winner_team_id);
  if (invalid) return { error: invalid };

  const { error } = await supabase.from("prizes").insert(parsed.data);
  if (error) return dbError(error, "");
  return done("Premiu adăugat");
}

export async function updatePrize(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const parsed = prizeSchema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: "Premiu invalid" };
  if (!parsed.success) return firstError(parsed.error);

  const prize = await supabase.from("prizes").select("competition_id").eq("id", id.data).single();
  if (prize.error) return { error: "Premiul nu mai există" };
  const invalid = await checkWinnerTeam(supabase, prize.data.competition_id, parsed.data.winner_team_id);
  if (invalid) return { error: invalid };

  const { error } = await supabase.from("prizes").update(parsed.data).eq("id", id.data);
  if (error) return dbError(error, "");
  return done("Salvat");
}

export async function deletePrize(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Premiu invalid" };

  const { error } = await supabase.from("prizes").delete().eq("id", id.data);
  if (error) return dbError(error, "");
  return done("Premiu șters");
}
