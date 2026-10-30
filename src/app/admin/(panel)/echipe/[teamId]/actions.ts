"use server";

import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { dbError, firstError, idSchema, optionalInt, refresh } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";

const positions = ["portar", "fundas", "mijlocas", "atacant"] as const;

const playerSchema = z.object({
  team_id: idSchema,
  first_name: z.string().trim().min(1, "Prenumele e obligatoriu").max(60, "Prenumele e prea lung"),
  last_name: z.string().trim().min(1, "Numele e obligatoriu").max(60, "Numele e prea lung"),
  birth_year: optionalInt(1990, 2100, "Anul nașterii trebuie să fie între 1990 și 2100"),
  shirt_number: optionalInt(1, 99, "Numărul de pe tricou trebuie să fie între 1 și 99"),
  position: z
    .string()
    .transform((v) => v || null)
    .pipe(z.enum(positions, "Poziție invalidă").nullable()),
});

const NUMBER_TAKEN = "Numărul de pe tricou e deja folosit în această echipă";

export async function addPlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = playerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstError(parsed.error);
  const { team_id, shirt_number, ...player } = parsed.data;

  const roster = await supabase
    .from("roster_entries")
    .select("shirt_number, players(first_name, last_name, birth_year)")
    .eq("team_id", team_id);
  if (roster.error) return dbError(roster.error, "");

  if (shirt_number !== null && roster.data.some((r) => r.shirt_number === shirt_number)) {
    return { error: NUMBER_TAKEN };
  }
  const same = (p: unknown) => {
    const x = p as { first_name: string; last_name: string; birth_year: number | null } | null;
    return (
      x?.first_name.toLowerCase() === player.first_name.toLowerCase() &&
      x.last_name.toLowerCase() === player.last_name.toLowerCase() &&
      x.birth_year === player.birth_year
    );
  };
  if (roster.data.some((r) => same(r.players))) return { error: "Jucătorul e deja în lot" };

  const created = await supabase.from("players").insert(player).select("id").single();
  if (created.error) return dbError(created.error, "");

  const entry = await supabase
    .from("roster_entries")
    .insert({ team_id, player_id: created.data.id, shirt_number });
  if (entry.error) {
    await supabase.from("players").delete().eq("id", created.data.id);
    return dbError(entry.error, NUMBER_TAKEN);
  }

  refresh(`/admin/echipe/${team_id}`, "teams");
  return { ok: "Jucător adăugat" };
}

export async function updatePlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const playerId = idSchema.safeParse(formData.get("player_id"));
  const parsed = playerSchema.safeParse(Object.fromEntries(formData));
  if (!playerId.success) return { error: "Jucător invalid" };
  if (!parsed.success) return firstError(parsed.error);
  const { team_id, shirt_number, ...player } = parsed.data;

  // Numărul se verifică primul: dacă e luat, nu modificăm nimic.
  const entry = await supabase
    .from("roster_entries")
    .update({ shirt_number })
    .eq("team_id", team_id)
    .eq("player_id", playerId.data);
  if (entry.error) return dbError(entry.error, NUMBER_TAKEN);

  const { error } = await supabase.from("players").update(player).eq("id", playerId.data);
  if (error) return dbError(error, "");

  refresh(`/admin/echipe/${team_id}`, "teams");
  return { ok: "Salvat" };
}

export async function removePlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ team_id: idSchema, player_id: idSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Jucător invalid" };
  const { team_id, player_id } = parsed.data;

  // Un jucător cu goluri, pase sau prezențe în meciurile echipei își pierde statisticile dacă e scos.
  const [events, appearances] = await Promise.all([
    supabase
      .from("match_events")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team_id)
      .or(`player_id.eq.${player_id},assist_player_id.eq.${player_id}`),
    supabase
      .from("match_appearances")
      .select("match_id", { count: "exact", head: true })
      .eq("team_id", team_id)
      .eq("player_id", player_id),
  ]);
  if (events.error || appearances.error) return { error: "Nu am putut verifica istoricul jucătorului" };
  if (events.count || appearances.count) {
    return { error: "Jucătorul are meciuri sau statistici în această echipă și nu poate fi scos din lot." };
  }

  const removed = await supabase.from("roster_entries").delete().eq("team_id", team_id).eq("player_id", player_id);
  if (removed.error) return dbError(removed.error, "");

  // Fără alt lot, persoana nu mai are rost în baza de date.
  const other = await supabase.from("roster_entries").select("team_id", { count: "exact", head: true }).eq("player_id", player_id);
  if (!other.count) await supabase.from("players").delete().eq("id", player_id);

  refresh(`/admin/echipe/${team_id}`, "teams");
  return { ok: "Jucător scos din lot" };
}
