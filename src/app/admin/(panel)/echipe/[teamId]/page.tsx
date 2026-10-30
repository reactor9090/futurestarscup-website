import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card, Field, inputClass } from "@/components/admin/fields";
import { positionLabels, type Position } from "@/lib/labels";
import { createSessionClient } from "@/lib/supabase/server";
import { ClubLogo } from "../club-card";
import { addPlayer, removePlayer, updatePlayer } from "./actions";

export const metadata: Metadata = { title: "Lot echipă", robots: { index: false } };

type TeamData = {
  id: string;
  name: string;
  club: { id: string; name: string; logo_url: string | null } | null;
  competition: { name: string; min_birth_year: number | null; max_birth_year: number | null } | null;
  roster_entries: {
    shirt_number: number | null;
    player: { id: string; first_name: string; last_name: string; birth_year: number | null; position: Position | null };
  }[];
};

export default async function TeamRosterPage({ params }: PageProps<"/admin/echipe/[teamId]">) {
  const { teamId } = await params;
  if (!z.uuid().safeParse(teamId).success) notFound();

  const supabase = await createSessionClient();
  const { data: team, error } = await supabase
    .from("teams")
    .select(
      `id, name, club:clubs(id, name, logo_url),
       competition:competitions(name, min_birth_year, max_birth_year),
       roster_entries(shirt_number, player:players(id, first_name, last_name, birth_year, position))`,
    )
    .eq("id", teamId)
    .maybeSingle()
    .overrideTypes<TeamData>();
  if (error) throw new Error(error.message);
  if (!team) notFound();

  const roster = [...team.roster_entries].sort(
    (a, b) =>
      (a.shirt_number ?? 1000) - (b.shirt_number ?? 1000) ||
      a.player.last_name.localeCompare(b.player.last_name, "ro"),
  );
  const { min_birth_year: minYear, max_birth_year: maxYear } = team.competition ?? {};

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <Link href="/admin/echipe" className="text-sm text-muted hover:text-ink">
          ← Cluburi
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <ClubLogo url={team.club?.logo_url ?? null} size={48} />
          <div>
            <h1 className="font-display text-3xl font-bold uppercase leading-none tracking-wide">{team.name}</h1>
            <p className="mt-1 text-muted">
              {team.competition?.name} · {roster.length} jucători
            </p>
          </div>
        </div>
      </div>

      <Card title="Adaugă jucător" description="Pe site se afișează doar numele, anul nașterii, poziția și numărul.">
        <ActionForm action={addPlayer} resetOnSuccess>
          <input type="hidden" name="team_id" value={team.id} />
          <PlayerFields />
          <div className="mt-3">
            <SubmitButton>Adaugă în lot</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card title="Lotul">
        <ul className="divide-y divide-line">
          {roster.map(({ shirt_number, player }) => {
            const outOfRange =
              player.birth_year !== null &&
              ((minYear != null && player.birth_year < minYear) || (maxYear != null && player.birth_year > maxYear));
            return (
              <li key={player.id} className="space-y-2 py-4 first:pt-0">
                <ActionForm action={updatePlayer}>
                  <input type="hidden" name="team_id" value={team.id} />
                  <input type="hidden" name="player_id" value={player.id} />
                  <PlayerFields player={{ ...player, shirt_number }} />
                  <div className="mt-3 flex items-center gap-3">
                    <SubmitButton variant="secondary">Salvează</SubmitButton>
                    {outOfRange && (
                      <span className="text-xs text-amber-700">
                        Născut în {player.birth_year}: în afara categoriei ({minYear ?? "…"}–{maxYear ?? "…"})
                      </span>
                    )}
                  </div>
                </ActionForm>
                <ActionForm action={removePlayer}>
                  <input type="hidden" name="team_id" value={team.id} />
                  <input type="hidden" name="player_id" value={player.id} />
                  <SubmitButton variant="ghost" confirm={`Scoți pe ${player.first_name} ${player.last_name} din lot?`}>
                    Scoate din lot
                  </SubmitButton>
                </ActionForm>
              </li>
            );
          })}
          {roster.length === 0 && <li className="text-sm text-muted">Lotul e gol. Adaugă primul jucător mai sus.</li>}
        </ul>
      </Card>
    </div>
  );
}

function PlayerFields({
  player,
}: {
  player?: { first_name: string; last_name: string; birth_year: number | null; position: Position | null; shirt_number: number | null };
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Nr." className="w-20">
        <input name="shirt_number" type="number" min={1} max={99} defaultValue={player?.shirt_number ?? ""} className={inputClass} />
      </Field>
      <Field label="Prenume" className="w-40">
        <input name="first_name" required maxLength={60} defaultValue={player?.first_name} className={inputClass} />
      </Field>
      <Field label="Nume" className="w-40">
        <input name="last_name" required maxLength={60} defaultValue={player?.last_name} className={inputClass} />
      </Field>
      <Field label="An naștere" className="w-28">
        <input name="birth_year" type="number" min={1990} max={2100} defaultValue={player?.birth_year ?? ""} className={inputClass} />
      </Field>
      <Field label="Poziție" className="w-36">
        <select name="position" defaultValue={player?.position ?? ""} className={inputClass}>
          <option value="">—</option>
          {(Object.keys(positionLabels) as Position[]).map((p) => (
            <option key={p} value={p}>
              {positionLabels[p]}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
