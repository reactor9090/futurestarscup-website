import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { PageHeader } from "@/components/page-header";
import { SponsorsStrip } from "@/components/sponsors-strip";
import { getCompetitions, getPrizes, getSponsors, pickCompetition } from "@/lib/public-data";

export const metadata: Metadata = { title: "Premii și sponsori" };

export default function PremiiPage({ searchParams }: PageProps<"/premii">) {
  return (
    <>
      <PageHeader
        eyebrow="Trofee și parteneri"
        title="Premii și sponsori"
        description="Trofeele puse în joc, câștigătorii și partenerii campionatului."
      />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-none bg-forest/5" />}>
          <Prizes searchParams={searchParams} />
        </Suspense>
        <Suspense>
          <Sponsors />
        </Suspense>
      </div>
    </>
  );
}

async function Prizes({ searchParams }: { searchParams: PageProps<"/premii">["searchParams"] }) {
  const { competitie } = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const prizes = await getPrizes(selected.id);

  return (
    <section className="space-y-6">
      <CompetitionPicker basePath="/premii" competitions={competitions} selectedId={selected.id} />
      {prizes.length === 0 && <EmptyState>Premiile vor fi anunțate în curând.</EmptyState>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prizes.map((p) => {
          const winner = p.winner_team ? (
            <Link href={`/echipe/${p.winner_team.id}`} className="text-pitch-700 hover:underline">
              {p.winner_team.name}
            </Link>
          ) : (
            p.winner_text
          );
          return (
            <li key={p.id} className="rounded-none border border-line bg-surface p-6">
              <p className="font-display text-sm font-bold uppercase tracking-wider text-gold-600">🏆 {p.title}</p>
              {winner ? (
                <p className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-forest">{winner}</p>
              ) : (
                <p className="mt-4 text-muted">Câștigătorul va fi anunțat</p>
              )}
              {p.description && <p className="mt-2 text-sm text-muted">{p.description}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function Sponsors() {
  const sponsors = await getSponsors();
  if (sponsors.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="font-display text-4xl font-extrabold tracking-tight text-forest">Sponsori și parteneri</h2>
      <SponsorsStrip sponsors={sponsors} />
    </section>
  );
}
