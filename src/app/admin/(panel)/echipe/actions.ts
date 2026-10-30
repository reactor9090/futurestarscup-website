"use server";

import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { dbError, firstError, idSchema, optionalText, refresh } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";

const PATH = "/admin/echipe";
const BUCKET = "media";
const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

const clubSchema = z.object({
  name: z.string().trim().min(1, "Numele clubului e obligatoriu").max(80, "Numele e prea lung"),
  city: optionalText(80, "Orașul e prea lung"),
  coach_name: optionalText(80, "Numele antrenorului e prea lung"),
  description: optionalText(1000, "Descrierea e prea lungă (maxim 1000 de caractere)"),
  phone: optionalText(40, "Telefonul e prea lung"),
  email: optionalText(200, "Email-ul e prea lung").pipe(z.email("Adresă de email invalidă").nullable()),
});

/** Calea unui fișier din bucket, pornind de la URL-ul lui public. */
function storagePath(url: string | null): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const at = url?.indexOf(marker) ?? -1;
  return url && at >= 0 ? url.slice(at + marker.length) : null;
}

/* ------------------------------ Cluburi ------------------------------ */

export async function createClub(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = clubSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);
  const { phone, email, ...club } = parsed.data;

  let slug = slugify(club.name);
  if (!slug) return { error: "Numele clubului trebuie să conțină litere sau cifre" };
  const taken = await supabase.from("clubs").select("id", { count: "exact", head: true }).eq("slug", slug);
  if (taken.count) slug += `-${crypto.randomUUID().slice(0, 4)}`;

  const created = await supabase.from("clubs").insert({ ...club, slug }).select("id").single();
  if (created.error) return dbError(created.error, "Există deja un club cu acest nume");

  const contacts = await supabase.from("club_contacts").insert({ club_id: created.data.id, phone, email });
  if (contacts.error) return dbError(contacts.error, "");

  refresh(PATH, "teams");
  return { ok: "Club adăugat" };
}

export async function updateClub(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const parsed = clubSchema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: "Club invalid" };
  if (!parsed.success) return firstError(parsed.error);
  const { phone, email, ...club } = parsed.data;

  // Slug-ul rămâne neschimbat, ca linkurile existente să nu se rupă.
  const updated = await supabase.from("clubs").update(club).eq("id", id.data);
  if (updated.error) return dbError(updated.error, "Există deja un club cu acest nume");

  const contacts = await supabase.from("club_contacts").upsert({ club_id: id.data, phone, email });
  if (contacts.error) return dbError(contacts.error, "");

  refresh(PATH, "teams");
  return { ok: "Salvat" };
}

export async function deleteClub(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Club invalid" };

  const { count, error: countError } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("club_id", id.data);
  if (countError) return dbError(countError, "");
  if (count) return { error: "Clubul participă la competiții. Scoate-l întâi din ele." };

  const club = await supabase.from("clubs").select("logo_url").eq("id", id.data).maybeSingle();
  const { error } = await supabase.from("clubs").delete().eq("id", id.data);
  if (error) return dbError(error, "");

  const oldPath = storagePath(club.data?.logo_url ?? null);
  if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);

  refresh(PATH, "teams");
  return { ok: "Club șters" };
}

export async function uploadClubLogo(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const file = formData.get("logo");
  if (!id.success) return { error: "Club invalid" };
  if (!(file instanceof File) || file.size === 0) return { error: "Alege o imagine" };

  const ext = LOGO_TYPES[file.type];
  if (!ext) return { error: "Logo-ul trebuie să fie PNG, JPG sau WebP" };
  if (file.size > MAX_LOGO_BYTES) return { error: "Imaginea e prea mare (maxim 1 MB)" };

  const club = await supabase.from("clubs").select("logo_url").eq("id", id.data).single();
  if (club.error) return { error: "Clubul nu există" };

  // Nume nou la fiecare încărcare, ca browserul să nu afișeze logo-ul vechi din cache.
  const path = `clubs/${id.data}/${crypto.randomUUID()}.${ext}`;
  const upload = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (upload.error) return { error: `Nu am putut încărca imaginea: ${upload.error.message}` };

  const { publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path).data;
  const { error } = await supabase.from("clubs").update({ logo_url: publicUrl }).eq("id", id.data);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return dbError(error, "");
  }

  const oldPath = storagePath(club.data.logo_url);
  if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);

  refresh(PATH, "teams");
  return { ok: "Logo actualizat" };
}

export async function removeClubLogo(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Club invalid" };

  const club = await supabase.from("clubs").select("logo_url").eq("id", id.data).single();
  if (club.error) return { error: "Clubul nu există" };

  const { error } = await supabase.from("clubs").update({ logo_url: null }).eq("id", id.data);
  if (error) return dbError(error, "");

  const oldPath = storagePath(club.data.logo_url);
  if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);

  refresh(PATH, "teams");
  return { ok: "Logo șters" };
}

/* ------------------------- Echipe (club × competiție) ------------------------- */

export async function addTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ club_id: idSchema, competition_id: idSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Alege o competiție" };

  const club = await supabase.from("clubs").select("name").eq("id", parsed.data.club_id).single();
  if (club.error) return { error: "Clubul nu există" };

  const existing = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("club_id", parsed.data.club_id)
    .eq("competition_id", parsed.data.competition_id);
  if (existing.count) return { error: "Clubul participă deja la această competiție" };

  const { error } = await supabase.from("teams").insert({ ...parsed.data, name: club.data.name });
  if (error) return dbError(error, "Există deja o echipă cu acest nume în competiție");

  refresh(PATH, "teams");
  return { ok: "Echipă adăugată în competiție" };
}

export async function deleteTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Echipă invalidă" };

  const { count, error: countError } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(`home_team_id.eq.${id.data},away_team_id.eq.${id.data}`);
  if (countError) return dbError(countError, "");
  if (count) return { error: "Echipa are meciuri. Șterge-le întâi, ca să nu pierzi rezultatele." };

  const roster = await supabase.from("roster_entries").select("player_id").eq("team_id", id.data);
  if (roster.error) return dbError(roster.error, "");

  const { error } = await supabase.from("teams").delete().eq("id", id.data);
  if (error) return dbError(error, "");

  // Jucătorii care nu mai sunt în niciun lot ar rămâne orfani în baza de date.
  const playerIds = roster.data.map((r) => r.player_id);
  if (playerIds.length) {
    const stillRostered = await supabase.from("roster_entries").select("player_id").in("player_id", playerIds);
    const keep = new Set((stillRostered.data ?? []).map((r) => r.player_id));
    const orphans = playerIds.filter((p) => !keep.has(p));
    if (orphans.length) await supabase.from("players").delete().in("id", orphans);
  }

  refresh(PATH, "teams");
  return { ok: "Echipă scoasă din competiție" };
}
