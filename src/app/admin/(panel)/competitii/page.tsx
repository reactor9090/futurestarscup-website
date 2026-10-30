import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card, Field, inputClass } from "@/components/admin/fields";
import { createSessionClient } from "@/lib/supabase/server";
import { CompetitionCard, type CompetitionData } from "./competition-card";
import { createCompetition } from "./actions";

export const metadata: Metadata = { title: "Competiții și faze", robots: { index: false } };

type Option = { id: string; name: string };

export default async function CompetitionsPage() {
  const supabase = await createSessionClient();
  const [competitions, seasons, categories] = await Promise.all([
    supabase
      .from("competitions")
      .select(
        `id, name, min_birth_year, max_birth_year, registration_open, is_published,
         season:seasons(name, start_date), category:categories(name, sort_order),
         teams(id, name),
         stages(id, name, type, sort_order, stage_groups(id, name, sort_order, group_teams(team_id)))`,
      )
      .overrideTypes<CompetitionData[]>(),
    supabase.from("seasons").select("id, name, is_current").order("start_date", { ascending: false, nullsFirst: false }),
    supabase.from("categories").select("id, name").order("sort_order").order("name").overrideTypes<Option[]>(),
  ]);
  const failed = competitions.error ?? seasons.error ?? categories.error;
  if (failed) throw new Error(failed.message);

  const seasonList = seasons.data ?? [];
  const categoryList = categories.data ?? [];
  const list = (competitions.data ?? []).sort(
    (a, b) =>
      (b.season?.start_date ?? "").localeCompare(a.season?.start_date ?? "") ||
      (a.category?.sort_order ?? 0) - (b.category?.sort_order ?? 0),
  );
  const currentSeason = seasonList.find((s) => s.is_current) ?? seasonList[0];

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Competiții și faze</h1>
        <p className="mt-1 text-muted">
          O competiție = un sezon × o categorie de vârstă. Fiecare are una sau mai multe faze: campionat (toți cu toți),
          grupe sau play-off.
        </p>
      </div>

      <Card title="Creează competiție">
        {seasonList.length === 0 || categoryList.length === 0 ? (
          <p className="text-sm text-muted">
            Ai nevoie de cel puțin un sezon și o categorie.{" "}
            <Link href="/admin/sezoane" className="font-medium text-pitch-700 underline">
              Adaugă-le aici
            </Link>
            .
          </p>
        ) : (
          <ActionForm action={createCompetition} resetOnSuccess className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Sezon" className="w-40">
                <select name="season_id" defaultValue={currentSeason?.id} className={inputClass}>
                  {seasonList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Categorie" className="w-32">
                <select name="category_id" className={inputClass}>
                  {categoryList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nume (opțional)" className="w-56">
                <input name="name" maxLength={80} placeholder="ex. U12 – 2027/2028" className={inputClass} />
              </Field>
              <Field label="Născuți din anul" className="w-32">
                <input name="min_birth_year" type="number" min={1990} max={2100} placeholder="2014" className={inputClass} />
              </Field>
              <Field label="Până în anul" className="w-32">
                <input name="max_birth_year" type="number" min={1990} max={2100} placeholder="2015" className={inputClass} />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input name="is_published" type="checkbox" defaultChecked className="size-4 accent-pitch-700" />
                Publicată pe site
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input name="registration_open" type="checkbox" className="size-4 accent-pitch-700" />
                Înscrieri deschise
              </label>
              <SubmitButton>Creează competiția</SubmitButton>
            </div>
          </ActionForm>
        )}
      </Card>

      <div className="space-y-4">
        {list.map((competition, index) => (
          <CompetitionCard key={competition.id} competition={competition} defaultOpen={index === 0} />
        ))}
        {list.length === 0 && <p className="text-sm text-muted">Nu există nicio competiție încă.</p>}
      </div>
    </div>
  );
}
