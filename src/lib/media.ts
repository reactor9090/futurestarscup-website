import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Imagini în bucket-ul public „media” (același care găzduiește logo-urile cluburilor).
const BUCKET = "media";
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
export const MAX_IMAGE_BYTES = 1024 * 1024;

/** Calea unui fișier din bucket, pornind de la URL-ul lui public. */
function storagePath(url: string | null): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const at = url?.indexOf(marker) ?? -1;
  return url && at >= 0 ? url.slice(at + marker.length) : null;
}

/** Fișierul ales într-un câmp de formular, sau null dacă nu s-a ales nimic. */
export function pickedFile(formData: FormData, name: string): File | null {
  const file = formData.get(name);
  return file instanceof File && file.size > 0 ? file : null;
}

/** Încarcă o imagine sub `folder/` cu nume nou (deci fără probleme de cache) și întoarce URL-ul public. */
export async function uploadImage(
  supabase: SupabaseClient,
  folder: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  const ext = TYPES[file.type];
  if (!ext) return { error: "Imaginea trebuie să fie PNG, JPG sau WebP" };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Imaginea e prea mare (maxim 1 MB)" };

  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) return { error: `Nu am putut încărca imaginea: ${error.message}` };
  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

/** Șterge din bucket fișierul de la acest URL; ignoră adresele care nu sunt din bucket. */
export async function removeImage(supabase: SupabaseClient, url: string | null): Promise<void> {
  const path = storagePath(url);
  if (path) await supabase.storage.from(BUCKET).remove([path]);
}
