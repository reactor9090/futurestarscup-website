import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Field, inputClass } from "@/components/admin/fields";
import {
  addTeamToGroup,
  createGroup,
  createStage,
  deleteCompetition,
  deleteGroup,
  deleteStage,
  removeTeamFromGroup,
  updateCompetition,
  updateStage,
} from "./actions";

type StageType = "league" | "group" | "knockout";

export type CompetitionData = {
  id: string;
  name: string;
  min_birth_year: number | null;
  max_birth_year: number | null;
  registration_open: boolean;
  is_published: boolean;
  season: { name: string; start_date: string | null } | null;
  category: { name: string; sort_order: number } | null;
  teams: { id: string; name: string }[];
  stages: {
    id: string;
    name: string;
    type: StageType;
    sort_order: number;
    stage_groups: { id: string; name: string; sort_order: number; group_teams: { team_id: string }[] }[];
  }[];
};

const stageTypeLabel: Record<StageType, string> = {
  league: "Campionat",
  group: "Grupe",
  knockout: "Play-off",
};

const stageTypeHint: Record<StageType, string> = {
  league: "Toate echipele competiției joacă între ele; clasamentul se calculează automat.",
  group: "Echipele sunt împărțite în grupe, fiecare cu clasamentul ei.",
  knockout: "Meciuri eliminatorii (sferturi, semifinale, finală), fără clasament.",
};

export function CompetitionCard({ competition, defaultOpen }: { competition: CompetitionData; defaultOpen: boolean }) {
  const stages = [...competition.stages].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <details open={defaultOpen} className="group rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4">
        <span className="font-display text-xl font-bold uppercase tracking-wide">{competition.name}</span>
        <span className="text-sm text-muted">
          {competition.teams.length} echipe · {stages.length} faze
        </span>
        <span className="ml-auto flex gap-2">
          {!competition.is_published && <Badge tone="muted">Ascunsă</Badge>}
          {competition.registration_open && <Badge tone="gold">Înscrieri deschise</Badge>}
        </span>
      </summary>

      <div className="space-y-6 border-t border-line px-5 py-5">
        <ActionForm action={updateCompetition} className="space-y-3">
          <input type="hidden" name="id" value={competition.id} />
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Nume" className="w-56">
              <input name="name" defaultValue={competition.name} required maxLength={80} className={inputClass} />
            </Field>
            <Field label="Născuți din anul" className="w-32">
              <input name="min_birth_year" type="number" min={1990} max={2100} defaultValue={competition.min_birth_year ?? ""} className={inputClass} />
            </Field>
            <Field label="Până în anul" className="w-32">
              <input name="max_birth_year" type="number" min={1990} max={2100} defaultValue={competition.max_birth_year ?? ""} className={inputClass} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input name="is_published" type="checkbox" defaultChecked={competition.is_published} className="size-4 accent-pitch-700" />
              Publicată pe site
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="registration_open" type="checkbox" defaultChecked={competition.registration_open} className="size-4 accent-pitch-700" />
              Înscrieri deschise
            </label>
            <SubmitButton variant="secondary">Salvează</SubmitButton>
          </div>
        </ActionForm>

        <div className="space-y-4">
          <h3 className="font-display text-lg font-bold uppercase tracking-wide">Faze</h3>
          {stages.map((stage) => (
            <StageBlock key={stage.id} stage={stage} teams={competition.teams} />
          ))}
          {stages.length === 0 && (
            <p className="text-sm text-muted">Nicio fază încă. Adaugă una mai jos ca să poți programa meciuri.</p>
          )}

          <ActionForm action={createStage} resetOnSuccess className="rounded-lg bg-canvas p-4">
            <input type="hidden" name="competition_id" value={competition.id} />
            <p className="mb-3 text-sm font-semibold">Adaugă fază</p>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Nume" className="w-48">
                <input name="name" required maxLength={60} placeholder="ex. Sezon regulat" className={inputClass} />
              </Field>
              <Field label="Tip" className="w-40">
                <select name="type" defaultValue="league" className={inputClass}>
                  {(Object.keys(stageTypeLabel) as StageType[]).map((t) => (
                    <option key={t} value={t}>
                      {stageTypeLabel[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ordine" className="w-24">
                <input name="sort_order" type="number" min={0} defaultValue={(stages.length + 1) * 10} className={inputClass} />
              </Field>
              <SubmitButton>Adaugă</SubmitButton>
            </div>
          </ActionForm>
        </div>

        <ActionForm action={deleteCompetition} className="border-t border-line pt-4">
          <input type="hidden" name="id" value={competition.id} />
          <SubmitButton variant="danger" confirm={`Ștergi competiția ${competition.name}?`}>
            Șterge competiția
          </SubmitButton>
        </ActionForm>
      </div>
    </details>
  );
}

function StageBlock({ stage, teams }: { stage: CompetitionData["stages"][number]; teams: CompetitionData["teams"] }) {
  const groups = [...stage.stage_groups].sort((a, b) => a.sort_order - b.sort_order);
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const assigned = new Set(groups.flatMap((g) => g.group_teams.map((gt) => gt.team_id)));
  const unassigned = teams.filter((t) => !assigned.has(t.id));

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-start gap-3">
        <ActionForm action={updateStage} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={stage.id} />
          <Field label="Nume fază" className="w-48">
            <input name="name" defaultValue={stage.name} required maxLength={60} className={inputClass} />
          </Field>
          <Field label="Ordine" className="w-20">
            <input name="sort_order" type="number" min={0} defaultValue={stage.sort_order} className={inputClass} />
          </Field>
          <SubmitButton variant="secondary">Salvează</SubmitButton>
        </ActionForm>
        <Badge tone="green">{stageTypeLabel[stage.type]}</Badge>
        <ActionForm action={deleteStage} className="ml-auto">
          <input type="hidden" name="id" value={stage.id} />
          <SubmitButton variant="danger" confirm={`Ștergi faza ${stage.name}?`}>
            Șterge
          </SubmitButton>
        </ActionForm>
      </div>
      <p className="mt-2 text-xs text-muted">{stageTypeHint[stage.type]}</p>

      {stage.type === "group" && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            {groups.map((group) => (
              <div key={group.id} className="rounded-lg bg-canvas p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-semibold">{group.name}</p>
                  <ActionForm action={deleteGroup}>
                    <input type="hidden" name="id" value={group.id} />
                    <SubmitButton variant="ghost" confirm={`Ștergi ${group.name}?`}>
                      Șterge grupa
                    </SubmitButton>
                  </ActionForm>
                </div>

                <ul className="space-y-1">
                  {group.group_teams.map(({ team_id }) => (
                    <li key={team_id}>
                      <ActionForm action={removeTeamFromGroup} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <input type="hidden" name="group_id" value={group.id} />
                        <input type="hidden" name="team_id" value={team_id} />
                        <span>{teamName.get(team_id) ?? "Echipă necunoscută"}</span>
                        <SubmitButton variant="ghost">Scoate</SubmitButton>
                      </ActionForm>
                    </li>
                  ))}
                  {group.group_teams.length === 0 && <li className="text-sm text-muted">Nicio echipă în grupă.</li>}
                </ul>

                {unassigned.length > 0 && (
                  <ActionForm action={addTeamToGroup} className="mt-3 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="group_id" value={group.id} />
                    <select name="team_id" required defaultValue="" aria-label={`Adaugă echipă în ${group.name}`} className={`${inputClass} w-auto min-w-40 flex-1`}>
                      <option value="" disabled>
                        Alege echipa…
                      </option>
                      {unassigned.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <SubmitButton variant="secondary">Adaugă</SubmitButton>
                  </ActionForm>
                )}
              </div>
            ))}
          </div>

          {groups.length === 0 && <p className="text-sm text-muted">Nicio grupă încă.</p>}
          {teams.length === 0 && (
            <p className="text-xs text-muted">Echipele apar aici după ce le adaugi la competiție (secțiunea Echipe).</p>
          )}

          <ActionForm action={createGroup} resetOnSuccess className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="stage_id" value={stage.id} />
            <Field label="Grupă nouă" className="w-44">
              <input name="name" required maxLength={30} placeholder={`ex. Grupa ${String.fromCharCode(65 + groups.length)}`} className={inputClass} />
            </Field>
            <SubmitButton variant="secondary">Adaugă grupă</SubmitButton>
          </ActionForm>
        </div>
      )}
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "gold" | "muted"; children: React.ReactNode }) {
  const tones = {
    green: "bg-pitch-100 text-pitch-900",
    gold: "bg-gold-500/20 text-pitch-900",
    muted: "bg-line text-muted",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
