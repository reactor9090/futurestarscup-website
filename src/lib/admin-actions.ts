import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";

// Ajutoare comune pentru Server Actions din admin.

export const idSchema = z.uuid();

/** Număr întreg opțional dintr-un câmp text: gol → null. */
export const optionalInt = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number(message).int(message).min(min, message).max(max, message).nullable());

/** Text opțional: gol sau câmp lipsă din formular → null. */
export const optionalText = (max: number, message: string) =>
  z
    .string()
    .optional()
    .transform((v) => v?.trim() || null)
    .pipe(z.string().max(max, message).nullable());

export function firstError(error: z.ZodError): FormState {
  return { error: error.issues[0].message };
}

export function dbError(error: { code?: string; message: string }, duplicate: string): FormState {
  if (error.code === "23505") return { error: duplicate };
  if (error.code === "23503") return { error: "Elementul e folosit în altă parte și nu poate fi șters." };
  return { error: `Eroare la salvare: ${error.message}` };
}

/**
 * Invalidează paginile publice și cele de admin afectate.
 * "catalog" = sezoane, categorii, competiții, faze, grupe (citite de site cu cacheTag("catalog")).
 */
export function refresh(adminPath: string, ...tags: string[]): void {
  updateTag("catalog");
  for (const tag of tags) updateTag(tag);
  revalidatePath(adminPath);
}
