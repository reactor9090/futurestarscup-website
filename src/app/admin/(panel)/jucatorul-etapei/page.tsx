import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card, Field, inputClass } from "@/components/admin/fields";
import { createSessionClient } from "@/lib/supabase/server";
import { createAward, deleteAward, updateAward } from "./actions";

export const metadata: Metadata = { title: "Jucătorul etapei", robots: { index: false } };

type Award = {
  id: string;
  round: number | null;
  title: string;
  body: string | null;
  team_id: string;
  player_id: string;
  sponsor_id: string | null;
  is_published: boolean;
  sort_order: number;
  competition: { name: string } | null;
  player: { first_name: string; last_name: string; photo_url: string | null } | null;
};
type Team = {
  id: string;
  name: string;
  competition: { name: string; season: { start_date: string | null } | null } | null;
  roster_entries: { shirt_number: number | null; player: { id: string; first_name: string; last_name: string } }[];
};
type Sponsor = { id: string; name: string };

export default async function RoundAwardsPage() {
  const supabase = await createSessionClient();
  const [awards, teams, sponsors] = await Promise.all([
    supabase
      .from("round_awards")
      .select(
        "id, round, title, body, team_id, player_id, sponsor_id, is_published, sort_order, competition:competitions(name), player:players(first_name, last_name, photo_url)",
      )
      .order("sort_order")
      .order("created_at", { ascending: false })
      .overrideTypes<Award[]>(),
    supabase
      .from("teams")
      .select(
        "id, name, competition:competitions(name, season:seasons(start_date)), roster_entries(shirt_number, player:players(id, first_name, last_name))",
      )
      .overrideTypes<Team[]>(),
    supabase.from("sponsors").select("id, name").order("name").overrideTypes<Sponsor[]>(),
  ]);
  const failed = awards.error ?? teams.error ?? sponsors.error;
  if (failed) throw new Error(failed.message);
  const awardList = awards.data ?? [];
  const sponsorList = sponsors.data ?? [];

  // Sezonul cel mai recent primul, apoi competiția și echipa alfabetic.
  const teamOptions = [...(teams.data ?? [])].sort(
    (a, b) =>
      (b.competition?.season?.start_date ?? "").localeCompare(a.competition?.season?.start_date ?? "") ||
      (a.competition?.name ?? "").localeCompare(b.competition?.name ?? "", "ro") ||
      a.name.localeCompare(b.name, "ro"),
  );

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Jucătorul etapei</h1>
        <p className="mt-1 text-muted">
          Apare ca slide mare în partea de sus a primei pagini. Poza vine din lotul echipei (doar cu acordul părinților).
        </p>
      </div>

      <Card title="Adaugă" description="Titlul se completează automat („Jucătorul etapei N”) dacă îl lași gol.">
        <ActionForm action={createAward} resetOnSuccess>
          <AwardFields teams={teamOptions} sponsors={sponsorList} />
          <div className="mt-3">
            <SubmitButton>Adaugă</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card title="Publicate și ciorne">
        <ul className="divide-y divide-line">
          {awardList.map((a) => (
            <li key={a.id} className="space-y-2 py-4 first:pt-0">
              <p className="text-sm font-semibold">
                {a.player ? `${a.player.first_name} ${a.player.last_name}` : "—"} · {a.competition?.name}
                {!a.is_published && <span className="ml-2 rounded bg-gold-100 px-1.5 text-xs">ciornă</span>}
                {!a.player?.photo_url && <span className="ml-2 text-xs font-normal text-muted">(fără poză, se afișează numărul)</span>}
              </p>
              <ActionForm action={updateAward}>
                <input type="hidden" name="id" value={a.id} />
                <AwardFields teams={teamOptions} sponsors={sponsorList} award={a} />
                <div className="mt-3">
                  <SubmitButton variant="secondary">Salvează</SubmitButton>
                </div>
              </ActionForm>
              <ActionForm action={deleteAward}>
                <input type="hidden" name="id" value={a.id} />
                <SubmitButton variant="ghost" confirm="Ștergi acest Jucător al etapei?">
                  Șterge
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
          {awardList.length === 0 && <li className="text-sm text-muted">Niciun jucător al etapei încă.</li>}
        </ul>
      </Card>
    </div>
  );
}

function AwardFields({ teams, sponsors, award }: { teams: Team[]; sponsors: Sponsor[]; award?: Award }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Jucător" className="min-w-72 flex-1">
          <select
            name="pick"
            required
            defaultValue={award ? `${award.team_id}:${award.player_id}` : ""}
            className={inputClass}
          >
            <option value="">Alege jucătorul…</option>
            {teams
              .filter((t) => t.roster_entries.length > 0)
              .map((t) => (
                <optgroup key={t.id} label={`${t.competition?.name ?? ""} · ${t.name}`}>
                  {[...t.roster_entries]
                    .sort((a, b) => (a.shirt_number ?? 1000) - (b.shirt_number ?? 1000))
                    .map((r) => (
                      <option key={r.player.id} value={`${t.id}:${r.player.id}`}>
                        {r.shirt_number ? `${r.shirt_number}. ` : ""}
                        {r.player.first_name} {r.player.last_name}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
        </Field>
        <Field label="Etapa" className="w-24">
          <input name="round" type="number" min={1} max={200} defaultValue={award?.round ?? ""} className={inputClass} />
        </Field>
        <Field label="Titlu (opțional)" className="w-56">
          <input name="title" maxLength={80} defaultValue={award?.title ?? ""} placeholder="Jucătorul etapei N" className={inputClass} />
        </Field>
      </div>
      <Field label="Text (opțional)">
        <textarea name="body" rows={2} maxLength={600} defaultValue={award?.body ?? ""} className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Sponsorul premiului (opțional)" className="w-64">
          <select name="sponsor_id" defaultValue={award?.sponsor_id ?? ""} className={inputClass}>
            <option value="">— fără sponsor —</option>
            {sponsors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ordine" className="w-24">
          <input name="sort_order" type="number" min={0} max={1000} defaultValue={award?.sort_order ?? 0} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input name="is_published" type="checkbox" defaultChecked={award?.is_published ?? true} className="size-4 accent-pitch-700" />
          Publicat
        </label>
      </div>
    </div>
  );
}
