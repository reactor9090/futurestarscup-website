"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";

export type RegistrationState = { error?: string; done?: boolean };

const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} e obligatoriu`).max(max, `${label} e prea lung`);
const optional = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => v || null);

const playerSchema = z.object({
  first_name: text("Prenumele jucătorului", 80),
  last_name: text("Numele jucătorului", 80),
  birth_date: z.iso.date("Data nașterii e obligatorie pentru fiecare jucător").refine((d) => d >= "1990-01-01" && d <= new Date().toISOString().slice(0, 10), "Data nașterii e invalidă"),
  position: z.enum(["portar", "fundas", "mijlocas", "atacant"]).or(z.literal("")).transform((v) => v || null),
  shirt_number: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number("Numărul tricoului trebuie să fie între 1 și 99").int().min(1).max(99).nullable()),
});

const registrationSchema = z.object({
  competition_id: z.uuid("Alege categoria"),
  club_name: text("Numele echipei", 120),
  city: optional(120, "Orașul e prea lung"),
  coach_name: text("Numele antrenorului", 120),
  coach_phone: text("Telefonul antrenorului", 40),
  coach_email: optional(200, "Email-ul e prea lung").pipe(z.email("Adresă de email invalidă").nullable()),
  notes: optional(2000, "Observațiile sunt prea lungi"),
});

/**
 * Înscrierea trece prin funcția SQL `submit_registration`, singura cale prin care un vizitator anonim scrie în baza de date.
 * Aici validăm doar ca să dăm mesaje clare; funcția SQL verifică din nou datele esențiale.
 */
export async function submitRegistration(_prev: RegistrationState, formData: FormData): Promise<RegistrationState> {
  // Câmp-capcană pentru boți: un om nu îl vede și nu îl completează.
  if (formData.get("website")) return { done: true };

  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let rawPlayers: unknown;
  try {
    rawPlayers = JSON.parse(String(formData.get("players") ?? "[]"));
  } catch {
    return { error: "Lotul de jucători nu a putut fi citit. Reîncarcă pagina și încearcă din nou." };
  }
  const players = z.array(playerSchema).min(1, "Adaugă cel puțin un jucător").max(40, "Un lot poate avea cel mult 40 de jucători").safeParse(rawPlayers);
  if (!players.success) return { error: players.error.issues[0].message };

  const numbers = players.data.map((p) => p.shirt_number).filter((n) => n !== null);
  if (new Set(numbers).size !== numbers.length) return { error: "Doi jucători au același număr de tricou" };

  const { error } = await createPublicClient().rpc("submit_registration", {
    payload: { ...parsed.data, players: players.data },
  });
  if (error) {
    // P0001 = excepție ridicată intenționat de funcție, cu mesaj în română.
    return { error: error.code === "P0001" ? error.message : "Nu am putut trimite înscrierea. Încearcă din nou peste câteva minute." };
  }
  return { done: true };
}
