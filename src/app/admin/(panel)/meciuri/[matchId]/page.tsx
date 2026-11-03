import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card, Field, inputClass } from "@/components/admin/fields";
import { formatKickoff, isPast } from "@/lib/datetime";
import { createSessionClient } from "@/lib/supabase/server";
import { statusLabel, type MatchData } from "../match-fields";
import { addEvent, deleteEvent, finishMatch, saveAppearances, saveStats, startMatch } from "./actions";

export const metadata: Metadata = { title: "Rezultat meci", robots: { index: false } };

type EventType = "goal" | "own_goal" | "yellow_card" | "red_card";

const eventLabel: Record<EventType, string> = {
  goal: "⚽ Gol",
  own_goal: "⚽ Autogol",
  yellow_card: "🟨 Cartonaș galben",
  red_card: "🟥 Cartonaș roșu",
};

type Player = { id: string; first_name: string; last_name: string };
type RosterEntry = { shirt_number: number | null; player: Player };
type Team = { id: string; name: string; roster_entries: RosterEntry[] };

type MatchPage = Pick<MatchData, "id" | "status" | "home_score" | "away_score" | "home_penalties" | "away_penalties" | "kickoff_at" | "round" | "round_label"> & {
  competition: { name: string } | null;
  home: Team;
  away: Team;
  match_events: {
    id: string;
    type: EventType;
    team_id: string;
    minute: number | null;
    player: Player | null;
    assist: Player | null;
  }[];
  match_appearances: { player_id: string }[];
  match_team_stats: Record<string, number | string | null>[];
};

const statFields = [
  ["possession", "Posesie (%)"],
  ["shots", "Șuturi"],
  ["shots_on_target", "Șuturi pe poartă"],
  ["corners", "Cornere"],
  ["fouls", "Faulturi"],
  ["offsides", "Ofsaiduri"],
] as const;

const statOf = (match: MatchPage, teamId: string, key: string) =>
  match.match_team_stats.find((s) => s.team_id === teamId)?.[key] ?? "";

const playerName = (p: Player | null) => (p ? `${p.first_name} ${p.last_name}` : "—");

function sortedRoster(team: Team) {
  return [...team.roster_entries].sort(
    (a, b) =>
      (a.shirt_number ?? 1000) - (b.shirt_number ?? 1000) || a.player.last_name.localeCompare(b.player.last_name, "ro"),
  );
}

export default async function MatchResultPage({ params }: PageProps<"/admin/meciuri/[matchId]">) {
  const { matchId } = await params;
  if (!z.uuid().safeParse(matchId).success) notFound();

  const supabase = await createSessionClient();
  const rosterSelect = "id, name, roster_entries(shirt_number, player:players(id, first_name, last_name))";
  const { data: match, error } = await supabase
    .from("matches")
    .select(
      `id, status, home_score, away_score, home_penalties, away_penalties, kickoff_at, round, round_label,
       competition:competitions(name),
       home:teams!matches_home_team_id_fkey(${rosterSelect}),
       away:teams!matches_away_team_id_fkey(${rosterSelect}),
       match_events(id, type, team_id, minute,
         player:players!match_events_player_id_fkey(id, first_name, last_name),
         assist:players!match_events_assist_player_id_fkey(id, first_name, last_name)),
       match_appearances(player_id),
       match_team_stats(team_id, shots, shots_on_target, corners, fouls, offsides, possession)`,
    )
    .eq("id", matchId)
    .maybeSingle()
    .overrideTypes<MatchPage>();
  if (error) throw new Error(error.message);
  if (!match) notFound();

  const teams = [match.home, match.away];
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const events = [...match.match_events].sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
  const played = new Set(match.match_appearances.map((a) => a.player_id));
  const finished = match.status === "finished";
  const live = match.status === "live";
  const canStart = match.status === "scheduled" || match.status === "postponed";
  // Ora a trecut, dar meciul n-a fost pornit: îi amintim adminului.
  const late = canStart && isPast(match.kickoff_at);

  // Golurile din evenimente (autogolul contează adversarului), comparate cu scorul final.
  const goalsFor = (teamId: string) =>
    events.filter((e) => (e.type === "goal" && e.team_id === teamId) || (e.type === "own_goal" && e.team_id !== teamId)).length;
  const homeGoals = goalsFor(match.home.id);
  const awayGoals = goalsFor(match.away.id);
  const mismatch = finished && (homeGoals !== match.home_score || awayGoals !== match.away_score);

  const playerOptions = (
    <>
      <option value="">—</option>
      {teams.map((t) => (
        <optgroup key={t.id} label={t.name}>
          {sortedRoster(t).map((r) => (
            <option key={r.player.id} value={r.player.id}>
              {r.shirt_number ? `${r.shirt_number}. ` : ""}
              {playerName(r.player)}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link href={`/admin/meciuri`} className="text-sm text-muted hover:text-ink">
          ← Meciuri
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase leading-none tracking-wide">
          {match.home.name} {finished || live ? `${match.home_score} – ${match.away_score}` : "vs"} {match.away.name}
        </h1>
        <p className="mt-1 text-muted">
          {[match.competition?.name, match.round_label ?? (match.round ? `Etapa ${match.round}` : null), formatKickoff(match.kickoff_at)]
            .filter(Boolean)
            .join(" · ")}{" "}
          · {statusLabel[match.status]}
        </p>
      </div>

      {(canStart || live) && (
        <section
          className={`flex flex-wrap items-center justify-between gap-4 rounded-xl p-5 ${
            live ? "bg-pitch-950 text-white" : "border border-line bg-surface"
          }`}
        >
          {live ? (
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400">
                <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden /> Live
              </p>
              <p className="mt-1 font-display text-4xl font-bold tabular-nums">
                {match.home_score} – {match.away_score}
              </p>
              <p className="mt-1 max-w-md text-sm text-white/70">
                Fiecare gol adăugat mai jos crește scorul de pe site. Clasamentul și golgheterii se actualizează când termini
                meciul.
              </p>
            </div>
          ) : (
            <div>
              <p className="font-semibold">{late ? "Meciul trebuia să înceapă. L-ai pornit?" : "Meciul n-a început încă."}</p>
              <p className="mt-0.5 max-w-md text-sm text-muted">
                Când pornești meciul, pe site apare „Live” cu scorul, iar golurile pe care le adaugi îl actualizează.
              </p>
            </div>
          )}
          <ActionForm action={live ? finishMatch : startMatch}>
            <input type="hidden" name="match_id" value={match.id} />
            <SubmitButton
              variant={live ? "secondary" : "primary"}
              confirm={live ? `Termini meciul cu scorul ${match.home_score} – ${match.away_score}?` : undefined}
            >
              {live ? "■ Termină meciul" : "▶ Începe meciul"}
            </SubmitButton>
          </ActionForm>
        </section>
      )}

      {mismatch && (
        <p className="rounded-md bg-gold-100 px-3 py-2 text-sm">
          <strong>Atenție, nu e o eroare:</strong> scorul final e {match.home_score} – {match.away_score}, dar golurile adăugate mai
          jos dau doar {homeGoals} – {awayGoals}. Clasamentul folosește scorul final, deci e corect. Dacă știi cine a marcat,
          adaugă golurile care lipsesc ca să apară și la golgheteri.
        </p>
      )}

      <Card title="Evenimente">
        <ul className="divide-y divide-line">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="w-10 tabular-nums text-muted">{e.minute !== null ? `${e.minute}'` : "—"}</span>
              <span className="w-40">{eventLabel[e.type]}</span>
              <span className="min-w-0 flex-1">
                <strong>{playerName(e.player)}</strong>{" "}
                <span className="text-muted">({teamName.get(e.team_id)})</span>
                {e.assist && <span className="text-muted"> · assist: {playerName(e.assist)}</span>}
              </span>
              <ActionForm action={deleteEvent}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="match_id" value={match.id} />
                <SubmitButton variant="ghost" confirm="Ștergi evenimentul?">
                  Șterge
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
          {events.length === 0 && <li className="py-2 text-sm text-muted">Niciun eveniment încă.</li>}
        </ul>

        <ActionForm action={addEvent} resetOnSuccess className="mt-4 rounded-lg bg-canvas p-4">
          <input type="hidden" name="match_id" value={match.id} />
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Tip" className="w-44">
              <select name="type" defaultValue="goal" className={inputClass}>
                {(Object.keys(eventLabel) as EventType[]).map((t) => (
                  <option key={t} value={t}>
                    {eventLabel[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jucător" className="w-56">
              <select name="player_id" required className={inputClass}>
                {playerOptions}
              </select>
            </Field>
            <Field label="Assist (doar la gol)" className="w-56">
              <select name="assist_player_id" className={inputClass}>
                {playerOptions}
              </select>
            </Field>
            <Field label="Minut" className="w-20">
              <input name="minute" type="number" min={0} max={150} className={inputClass} />
            </Field>
            <SubmitButton>Adaugă</SubmitButton>
          </div>
          <p className="mt-2 text-xs text-muted">
            La autogol alegi jucătorul care a greșit; golul se numără automat adversarului.
          </p>
        </ActionForm>
      </Card>

      <Card
        title="Statistici"
        description="Opționale: pe pagina publică a meciului apar doar câmpurile completate. Posesia o introduci pentru gazde, oaspeții primesc restul până la 100."
      >
        <ActionForm action={saveStats} className="space-y-4">
          <input type="hidden" name="match_id" value={match.id} />
          <div className="grid max-w-xl grid-cols-[1fr_6rem_6rem] items-center gap-x-4 gap-y-2 text-sm">
            <span />
            <strong className="truncate">{match.home.name}</strong>
            <strong className="truncate">{match.away.name}</strong>
            {statFields.map(([key, label]) => (
              <Fragment key={key}>
                <span>{label}</span>
                {teams.map((t, i) => (
                  <input
                    key={t.id}
                    name={`${i === 0 ? "home" : "away"}_${key}`}
                    type="number"
                    min={0}
                    max={key === "possession" ? 100 : 999}
                    defaultValue={statOf(match, t.id, key)}
                    disabled={key === "possession" && i === 1}
                    placeholder={key === "possession" && i === 1 ? "auto" : undefined}
                    className={inputClass}
                  />
                ))}
              </Fragment>
            ))}
          </div>
          <SubmitButton variant="secondary">Salvează statisticile</SubmitButton>
        </ActionForm>
      </Card>

      <Card
        title="Cine a jucat"
        description="Bifează jucătorii care au intrat pe teren. Cei cu gol, assist sau cartonaș se numără oricum la meciuri jucate."
      >
        <ActionForm action={saveAppearances} className="space-y-4">
          <input type="hidden" name="match_id" value={match.id} />
          <div className="grid gap-6 sm:grid-cols-2">
            {teams.map((t) => (
              <fieldset key={t.id}>
                <legend className="mb-2 font-semibold">{t.name}</legend>
                <div className="space-y-1">
                  {sortedRoster(t).map((r) => (
                    <label key={r.player.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="player_id"
                        value={r.player.id}
                        defaultChecked={played.has(r.player.id)}
                        className="size-4 accent-pitch-700"
                      />
                      <span className="w-6 text-right tabular-nums text-muted">{r.shirt_number ?? ""}</span>
                      {playerName(r.player)}
                    </label>
                  ))}
                  {t.roster_entries.length === 0 && <p className="text-sm text-muted">Echipa nu are jucători în lot.</p>}
                </div>
              </fieldset>
            ))}
          </div>
          <SubmitButton variant="secondary">Salvează prezențele</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
