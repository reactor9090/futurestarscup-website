"use server";

import type { FormState } from "@/components/admin/action-form";
import { idSchema, optionalText, refresh } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";

const PATH = "/admin/inscrieri";

// Funcțiile SQL ridică excepții cu mesaje în română (ex. „Înscrierea a fost deja procesată”).
const rpcError = (error: { code?: string; message: string }): FormState => ({
  error: error.code === "P0001" ? error.message : `Eroare: ${error.message}`,
});

export async function approveRegistration(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Înscriere invalidă" };

  // Creează atomic clubul, echipa, jucătorii și lotul.
  const { error } = await supabase.rpc("approve_registration", { p_registration_id: id.data });
  if (error) return rpcError(error);

  refresh(PATH, "teams");
  return { ok: "Înscriere aprobată: echipa și lotul au fost create" };
}

export async function rejectRegistration(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const note = optionalText(500, "Motivul e prea lung (maxim 500 de caractere)").safeParse(formData.get("note") ?? "");
  if (!id.success) return { error: "Înscriere invalidă" };
  if (!note.success) return { error: note.error.issues[0].message };

  const { error } = await supabase.rpc("reject_registration", { p_registration_id: id.data, p_note: note.data });
  if (error) return rpcError(error);

  refresh(PATH);
  return { ok: "Înscriere respinsă" };
}

export async function deleteRegistration(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Înscriere invalidă" };

  // Doar înscrierile respinse se șterg; cele aprobate rămân ca istoric al echipei create.
  const { data, error } = await supabase
    .from("registrations")
    .delete()
    .eq("id", id.data)
    .eq("status", "rejected")
    .select("id");
  if (error) return { error: `Eroare: ${error.message}` };
  if (!data?.length) return { error: "Se pot șterge doar înscrierile respinse" };

  refresh(PATH);
  return { ok: "Înscriere ștearsă" };
}
