import { Field, inputClass } from "@/components/admin/fields";
import { toLocalInput } from "@/lib/datetime";

export type StageOption = {
  id: string;
  name: string;
  type: "league" | "group" | "knockout";
  sort_order: number;
  stage_groups: { id: string; name: string; sort_order: number }[];
};

export type TeamOption = { id: string; name: string };

export type MatchData = {
  id: string;
  stage_id: string;
  group_id: string | null;
  round: number | null;
  round_label: string | null;
  home_team_id: string;
  away_team_id: string;
  kickoff_at: string | null;
  venue: string | null;
  status: "scheduled" | "finished" | "postponed" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  notes: string | null;
};

export const statusLabel: Record<MatchData["status"], string> = {
  scheduled: "Programat",
  finished: "Terminat",
  postponed: "Amânat",
  cancelled: "Anulat",
};

/** Câmpurile comune formularelor de creare și de editare a unui meci. */
export function MatchFields({
  stages,
  teams,
  match,
}: {
  stages: StageOption[];
  teams: TeamOption[];
  match?: MatchData;
}) {
  const sortedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order);
  const groups = sortedStages.flatMap((s) =>
    [...s.stage_groups].sort((a, b) => a.sort_order - b.sort_order).map((g) => ({ ...g, stageName: s.name })),
  );
  const teamSelect = (name: string, value?: string) => (
    <select name={name} defaultValue={value ?? ""} required className={inputClass}>
      <option value="" disabled>
        Alege echipa
      </option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
  const num = (name: string, value: number | null | undefined, max = 99) => (
    <input name={name} type="number" min={0} max={max} defaultValue={value ?? ""} className={inputClass} />
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Fază" className="w-44">
          <select name="stage_id" defaultValue={match?.stage_id ?? sortedStages[0]?.id} required className={inputClass}>
            {sortedStages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Grupă (doar la faza „Grupe”)" className="w-44">
          <select name="group_id" defaultValue={match?.group_id ?? ""} className={inputClass}>
            <option value="">—</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.stageName} · {g.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Etapa" className="w-20">
          <input name="round" type="number" min={1} max={99} defaultValue={match?.round ?? ""} className={inputClass} />
        </Field>
        <Field label="Etichetă (ex. Finala)" className="w-40">
          <input name="round_label" maxLength={40} defaultValue={match?.round_label ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Gazde" className="w-52">
          {teamSelect("home_team_id", match?.home_team_id)}
        </Field>
        <Field label="Oaspeți" className="w-52">
          {teamSelect("away_team_id", match?.away_team_id)}
        </Field>
        <Field label="Data și ora (ora României)" className="w-52">
          <input name="kickoff_at" type="datetime-local" defaultValue={toLocalInput(match?.kickoff_at ?? null)} className={inputClass} />
        </Field>
        <Field label="Locație" className="w-48">
          <input name="venue" maxLength={80} defaultValue={match?.venue ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Stare" className="w-36">
          <select name="status" defaultValue={match?.status ?? "scheduled"} className={inputClass}>
            {(Object.keys(statusLabel) as MatchData["status"][]).map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Scor gazde" className="w-24">
          {num("home_score", match?.home_score)}
        </Field>
        <Field label="Scor oaspeți" className="w-24">
          {num("away_score", match?.away_score)}
        </Field>
        <Field label="Penalty gazde" className="w-24">
          {num("home_penalties", match?.home_penalties)}
        </Field>
        <Field label="Penalty oaspeți" className="w-24">
          {num("away_penalties", match?.away_penalties)}
        </Field>
      </div>
      <Field label="Observații (opțional)" className="max-w-xl">
        <input name="notes" maxLength={500} defaultValue={match?.notes ?? ""} className={inputClass} />
      </Field>
      <p className="text-xs text-muted">
        Scorul se salvează doar dacă starea e „Terminat”. Loviturile de departajare se completează doar la play-off, când
        scorul e egal.
      </p>
    </div>
  );
}
