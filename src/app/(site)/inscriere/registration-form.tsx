"use client";

import { startTransition, useActionState, useState } from "react";
import { Field, inputClass } from "@/components/admin/fields";
import { positionLabels } from "@/lib/labels";
import type { OpenCompetition } from "@/lib/public-data";
import { submitRegistration, verifyAccessCode, type AccessCodeState, type RegistrationState } from "./actions";

type PlayerRow = { key: number; first_name: string; last_name: string; birth_date: string; position: string; shirt_number: string };

const emptyPlayer = (key: number): PlayerRow => ({ key, first_name: "", last_name: "", birth_date: "", position: "", shirt_number: "" });

function ageRange(c: OpenCompetition) {
  if (c.min_birth_year && c.max_birth_year) return `născuți ${c.min_birth_year}–${c.max_birth_year}`;
  if (c.min_birth_year) return `născuți din ${c.min_birth_year}`;
  if (c.max_birth_year) return `născuți până în ${c.max_birth_year}`;
  return null;
}

export function RegistrationForm({ competitions, accessCode = "" }: { competitions: OpenCompetition[]; accessCode?: string }) {
  const [state, action, pending] = useActionState<RegistrationState, FormData>(submitRegistration, {});
  const [competitionId, setCompetitionId] = useState(competitions[0]?.id ?? "");
  const [players, setPlayers] = useState<PlayerRow[]>([emptyPlayer(0)]);
  const [nextKey, setNextKey] = useState(1);
  const competition = competitions.find((c) => c.id === competitionId);

  if (state.done) {
    return (
      <div role="status" className="rounded-xl border border-pitch-500 bg-pitch-50 p-6 sm:p-8">
        <p className="font-display text-2xl font-bold uppercase tracking-wide text-pitch-700">Înscrierea a fost trimisă</p>
        <p className="mt-2">
          Organizatorii o vor verifica. După aprobare, echipa apare pe site. Dacă avem nevoie de lămuriri, te contactăm la
          telefonul sau email-ul indicat.
        </p>
      </div>
    );
  }

  const update = (key: number, patch: Partial<PlayerRow>) =>
    setPlayers((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="access_code" value={accessCode} />
      <input type="hidden" name="players" value={JSON.stringify(players.map((p) => ({ first_name: p.first_name, last_name: p.last_name, birth_date: p.birth_date, position: p.position, shirt_number: p.shirt_number })))} />
      {/* Capcană pentru boți: ascuns vizual și din tastatură. */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Site web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Echipa</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria *">
            <select
              name="competition_id"
              required
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
              className={inputClass}
            >
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {ageRange(c) ? ` (${ageRange(c)})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Numele echipei / clubului *">
            <input name="club_name" required maxLength={120} className={inputClass} />
          </Field>
          <Field label="Orașul">
            <input name="city" maxLength={120} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Antrenor / persoană de contact</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nume *">
            <input name="coach_name" required maxLength={120} autoComplete="name" className={inputClass} />
          </Field>
          <Field label="Telefon *">
            <input name="coach_phone" type="tel" required maxLength={40} autoComplete="tel" className={inputClass} />
          </Field>
          <Field label="Email">
            <input name="coach_email" type="email" maxLength={200} autoComplete="email" className={inputClass} />
          </Field>
        </div>
        <p className="text-xs text-muted">Datele de contact sunt vizibile doar organizatorilor, nu apar pe site.</p>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <div>
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Lotul de jucători</h2>
          <p className="text-sm text-muted">
            Data nașterii completă o văd doar organizatorii; pe site apare doar anul nașterii.
            {competition && ageRange(competition) ? ` Categoria ${competition.name} primește jucători ${ageRange(competition)}.` : ""}
          </p>
        </div>

        <ol className="space-y-4">
          {players.map((p, i) => (
            <li key={p.key} className="space-y-3 rounded-lg bg-canvas p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Jucătorul {i + 1}</span>
                {players.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPlayers((rows) => rows.filter((r) => r.key !== p.key))}
                    className="rounded px-2 py-1 text-xs font-medium text-muted hover:bg-red-50 hover:text-danger"
                  >
                    Elimină
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-6">
                <Field label="Prenume *" className="sm:col-span-2">
                  <input value={p.first_name} onChange={(e) => update(p.key, { first_name: e.target.value })} required maxLength={80} className={inputClass} />
                </Field>
                <Field label="Nume *" className="sm:col-span-2">
                  <input value={p.last_name} onChange={(e) => update(p.key, { last_name: e.target.value })} required maxLength={80} className={inputClass} />
                </Field>
                <Field label="Data nașterii *" className="sm:col-span-2">
                  <input type="date" value={p.birth_date} onChange={(e) => update(p.key, { birth_date: e.target.value })} required min="1990-01-01" max={new Date().toISOString().slice(0, 10)} className={inputClass} />
                </Field>
                <Field label="Post" className="sm:col-span-3">
                  <select value={p.position} onChange={(e) => update(p.key, { position: e.target.value })} className={inputClass}>
                    <option value="">—</option>
                    {Object.entries(positionLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Număr tricou" className="sm:col-span-3">
                  <input type="number" min={1} max={99} value={p.shirt_number} onChange={(e) => update(p.key, { shirt_number: e.target.value })} className={inputClass} />
                </Field>
              </div>
            </li>
          ))}
        </ol>

        <button
          type="button"
          disabled={players.length >= 40}
          onClick={() => {
            setPlayers((rows) => [...rows, emptyPlayer(nextKey)]);
            setNextKey((k) => k + 1);
          }}
          className="rounded-md border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:bg-canvas disabled:opacity-50"
        >
          + Adaugă jucător
        </button>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <Field label="Observații (opțional)">
          <textarea name="notes" rows={3} maxLength={2000} className={inputClass} />
        </Field>
      </section>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-md bg-pitch-700 px-6 py-3 font-semibold text-white hover:bg-pitch-800 disabled:opacity-50"
      >
        {pending ? "Se trimite…" : "Trimite înscrierea"}
      </button>
    </form>
  );
}

/** Dacă organizatorii au setat un cod, formularul apare abia după ce vizitatorul îl introduce corect. */
export function RegistrationGate({ competitions, codeRequired }: { competitions: OpenCompetition[]; codeRequired: boolean }) {
  const [state, action, pending] = useActionState<AccessCodeState, FormData>(verifyAccessCode, {});
  if (!codeRequired) return <RegistrationForm competitions={competitions} />;
  if (state.code) return <RegistrationForm competitions={competitions} accessCode={state.code} />;

  return (
    <form
      className="mx-auto max-w-md space-y-4 rounded-xl border border-line bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <div>
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Înscriere pe bază de cod</h2>
        <p className="mt-1 text-sm text-muted">
          Înscrierea echipelor se face doar cu codul primit de la organizatori. Introdu-l ca să continui.
        </p>
      </div>
      <Field label="Cod de înscriere">
        <input name="access_code" required maxLength={100} autoComplete="off" autoCapitalize="characters" className={inputClass} />
      </Field>
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Se verifică…" : "Continuă"}
      </button>
    </form>
  );
}
