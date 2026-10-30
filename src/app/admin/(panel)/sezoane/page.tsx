import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card, Field, inputClass } from "@/components/admin/fields";
import { createSessionClient } from "@/lib/supabase/server";
import {
  createCategory,
  createSeason,
  deleteCategory,
  deleteSeason,
  setCurrentSeason,
  updateCategory,
  updateSeason,
} from "./actions";

export const metadata: Metadata = { title: "Sezoane și categorii", robots: { index: false } };

type Season = { id: string; name: string; start_date: string | null; end_date: string | null; is_current: boolean };
type Category = { id: string; name: string; sort_order: number };

export default async function SeasonsPage() {
  const supabase = await createSessionClient();
  const [seasons, categories, competitions] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, start_date, end_date, is_current")
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("name", { ascending: false })
      .overrideTypes<Season[]>(),
    supabase.from("categories").select("id, name, sort_order").order("sort_order").order("name").overrideTypes<Category[]>(),
    supabase.from("competitions").select("season_id, category_id"),
  ]);
  const failed = seasons.error ?? categories.error ?? competitions.error;
  if (failed) throw new Error(failed.message);
  const seasonList = seasons.data ?? [];
  const categoryList = categories.data ?? [];
  const competitionList = competitions.data ?? [];

  const perSeason = countBy(competitionList, (c) => c.season_id);
  const perCategory = countBy(competitionList, (c) => c.category_id);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Sezoane și categorii</h1>
        <p className="mt-1 text-muted">
          Sezonul curent e cel afișat implicit pe site. Categoriile sunt grupele de vârstă (U10, U12…); fiecare
          combinație sezon × categorie devine o competiție.
        </p>
      </div>

      <Card title="Sezoane">
        <ul className="divide-y divide-line">
          {seasonList.map((season) => (
            <li key={season.id} className="space-y-3 py-4 first:pt-0">
              <ActionForm action={updateSeason} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={season.id} />
                <Field label="Nume" className="w-40">
                  <input name="name" defaultValue={season.name} required maxLength={40} className={inputClass} />
                </Field>
                <Field label="Început" className="w-40">
                  <input name="start_date" type="date" defaultValue={season.start_date ?? ""} className={inputClass} />
                </Field>
                <Field label="Sfârșit" className="w-40">
                  <input name="end_date" type="date" defaultValue={season.end_date ?? ""} className={inputClass} />
                </Field>
                <SubmitButton variant="secondary">Salvează</SubmitButton>
              </ActionForm>

              <div className="flex flex-wrap items-center gap-3">
                {season.is_current ? (
                  <span className="rounded-full bg-gold-500/20 px-2.5 py-1 text-xs font-semibold text-pitch-900">
                    Sezon curent
                  </span>
                ) : (
                  <ActionForm action={setCurrentSeason}>
                    <input type="hidden" name="id" value={season.id} />
                    <SubmitButton variant="secondary">Setează ca sezon curent</SubmitButton>
                  </ActionForm>
                )}
                <span className="text-xs text-muted">{plural(perSeason.get(season.id) ?? 0, "competiție", "competiții")}</span>
                <ActionForm action={deleteSeason} className="ml-auto">
                  <input type="hidden" name="id" value={season.id} />
                  <SubmitButton
                    variant="danger"
                    confirm={`Ștergi sezonul ${season.name}?`}
                    disabled={(perSeason.get(season.id) ?? 0) > 0}
                    title={(perSeason.get(season.id) ?? 0) > 0 ? "Sezonul are competiții" : undefined}
                  >
                    Șterge
                  </SubmitButton>
                </ActionForm>
              </div>
            </li>
          ))}
          {seasonList.length === 0 && <li className="pb-4 text-sm text-muted">Nu există niciun sezon încă.</li>}
        </ul>

        <ActionForm action={createSeason} resetOnSuccess className="mt-4 rounded-lg bg-canvas p-4">
          <p className="mb-3 text-sm font-semibold">Adaugă sezon</p>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Nume (ex. 2027/2028)" className="w-44">
              <input name="name" required maxLength={40} className={inputClass} />
            </Field>
            <Field label="Început" className="w-40">
              <input name="start_date" type="date" className={inputClass} />
            </Field>
            <Field label="Sfârșit" className="w-40">
              <input name="end_date" type="date" className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input name="make_current" type="checkbox" className="size-4 accent-pitch-700" />
              Setează ca sezon curent
            </label>
            <SubmitButton>Adaugă</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card title="Categorii de vârstă" description="Ordinea determină poziția în liste și în filtrele de pe site (mai mic = mai sus).">
        <ul className="divide-y divide-line">
          {categoryList.map((category) => {
            const used = perCategory.get(category.id) ?? 0;
            return (
              <li key={category.id} className="flex flex-wrap items-end gap-3 py-4 first:pt-0">
                <ActionForm action={updateCategory} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={category.id} />
                  <Field label="Nume" className="w-40">
                    <input name="name" defaultValue={category.name} required maxLength={30} className={inputClass} />
                  </Field>
                  <Field label="Ordine" className="w-24">
                    <input name="sort_order" type="number" min={0} defaultValue={category.sort_order} className={inputClass} />
                  </Field>
                  <SubmitButton variant="secondary">Salvează</SubmitButton>
                </ActionForm>
                <span className="pb-2 text-xs text-muted">{plural(used, "competiție", "competiții")}</span>
                <ActionForm action={deleteCategory} className="ml-auto">
                  <input type="hidden" name="id" value={category.id} />
                  <SubmitButton
                    variant="danger"
                    confirm={`Ștergi categoria ${category.name}?`}
                    disabled={used > 0}
                    title={used > 0 ? "Categoria e folosită de o competiție" : undefined}
                  >
                    Șterge
                  </SubmitButton>
                </ActionForm>
              </li>
            );
          })}
          {categoryList.length === 0 && <li className="pb-4 text-sm text-muted">Nu există nicio categorie încă.</li>}
        </ul>

        <ActionForm action={createCategory} resetOnSuccess className="mt-4 rounded-lg bg-canvas p-4">
          <p className="mb-3 text-sm font-semibold">Adaugă categorie</p>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Nume (ex. U14)" className="w-40">
              <input name="name" required maxLength={30} className={inputClass} />
            </Field>
            <Field label="Ordine" className="w-24">
              <input name="sort_order" type="number" min={0} defaultValue={categoryList.length * 10 + 10} className={inputClass} />
            </Field>
            <SubmitButton>Adaugă</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}

function countBy<T>(rows: T[], key: (row: T) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  return counts;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
