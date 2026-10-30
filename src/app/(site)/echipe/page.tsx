import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ClubLogo } from "@/components/club-logo";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { PageHeader } from "@/components/page-header";
import { getCompetitions, getTeams, pickCompetition } from "@/lib/public-data";

export const metadata: Metadata = { title: "Echipe" };

export default function EchipePage({ searchParams }: PageProps<"/echipe">) {
  return (
    <>
      <PageHeader title="Echipe" description="Toate echipele participante, pe categorii de vârstă." />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <Suspense fallback={<p className="text-muted">Se încarcă…</p>}>
          <Teams searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Teams({ searchParams }: { searchParams: PageProps<"/echipe">["searchParams"] }) {
  const { competitie } = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const teams = await getTeams(selected.id);

  return (
    <>
      <CompetitionPicker basePath="/echipe" competitions={competitions} selectedId={selected.id} />
      {teams.length === 0 && <EmptyState>Echipele vor apărea după înscrieri.</EmptyState>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <li key={team.id}>
            <Link
              href={`/echipe/${team.id}`}
              className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4 hover:border-pitch-500"
            >
              <ClubLogo url={team.logo_url} size={56} />
              <span className="min-w-0">
                <span className="block truncate font-display text-xl font-bold uppercase tracking-wide">
                  {team.name}
                </span>
                <span className="block text-sm text-muted">
                  {[team.city, `${team.played} meciuri · ${team.points} p`].filter(Boolean).join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
