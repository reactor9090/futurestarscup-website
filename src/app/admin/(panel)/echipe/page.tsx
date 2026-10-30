import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card, Field, inputClass } from "@/components/admin/fields";
import { createSessionClient } from "@/lib/supabase/server";
import { createClub } from "./actions";
import { ClubCard, type ClubData } from "./club-card";

export const metadata: Metadata = { title: "Cluburi, echipe, jucători", robots: { index: false } };

export default async function ClubsPage({ searchParams }: PageProps<"/admin/echipe">) {
  const { q } = await searchParams;
  const search = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  const supabase = await createSessionClient();
  let clubQuery = supabase
    .from("clubs")
    .select(
      `id, name, logo_url, city, coach_name, description,
       club_contacts(phone, email),
       teams(id, name, competition:competitions(id, name), roster_entries(count))`,
    )
    .order("name");
  if (search) clubQuery = clubQuery.ilike("name", `%${search}%`);

  const [clubs, competitions] = await Promise.all([
    clubQuery.overrideTypes<ClubData[]>(),
    supabase
      .from("competitions")
      .select("id, name, season:seasons(start_date)")
      .overrideTypes<{ id: string; name: string; season: { start_date: string | null } | null }[]>(),
  ]);
  const failed = clubs.error ?? competitions.error;
  if (failed) throw new Error(failed.message);

  const competitionList = (competitions.data ?? [])
    .sort((a, b) => (b.season?.start_date ?? "").localeCompare(a.season?.start_date ?? "") || a.name.localeCompare(b.name))
    .map(({ id, name }) => ({ id, name }));
  const list = clubs.data ?? [];

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Cluburi, echipe, jucători</h1>
        <p className="mt-1 text-muted">
          Un <strong>club</strong> e identitatea permanentă (nume, logo, antrenor). Îl adaugi apoi la o competiție și
          devine o <strong>echipă</strong>, cu lotul ei de jucători. Echipele noi pot veni și din formularul public de
          înscriere.
        </p>
      </div>

      <Card title="Adaugă club">
        <ActionForm action={createClub} resetOnSuccess className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Nume club" className="w-60">
              <input name="name" required maxLength={80} className={inputClass} />
            </Field>
            <Field label="Oraș" className="w-44">
              <input name="city" maxLength={80} className={inputClass} />
            </Field>
            <Field label="Antrenor" className="w-52">
              <input name="coach_name" maxLength={80} className={inputClass} />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Telefon (privat)" className="w-44">
              <input name="phone" type="tel" maxLength={40} className={inputClass} />
            </Field>
            <Field label="Email (privat)" className="w-60">
              <input name="email" type="email" maxLength={200} className={inputClass} />
            </Field>
            <SubmitButton>Adaugă clubul</SubmitButton>
          </div>
          <p className="text-xs text-muted">Telefonul și email-ul se văd doar în admin, nu pe site.</p>
        </ActionForm>
      </Card>

      <section className="space-y-4">
        <form className="flex gap-2" role="search">
          <input
            name="q"
            defaultValue={search}
            placeholder="Caută club după nume…"
            aria-label="Caută club după nume"
            className={`${inputClass} max-w-xs`}
          />
          <button type="submit" className="rounded-md border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:bg-canvas">
            Caută
          </button>
          {search && (
            <Link href="/admin/echipe" className="self-center text-sm text-muted underline">
              Șterge căutarea
            </Link>
          )}
        </form>

        {list.map((club) => (
          <ClubCard key={club.id} club={club} competitions={competitionList} />
        ))}
        {list.length === 0 && (
          <p className="text-sm text-muted">{search ? `Niciun club găsit pentru „${search}”.` : "Nu există niciun club încă."}</p>
        )}
      </section>
    </div>
  );
}
