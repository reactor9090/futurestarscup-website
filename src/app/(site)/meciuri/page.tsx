import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchCard } from "@/components/match-card";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { PageHeader } from "@/components/page-header";
import { getCompetitions, getMatches, pickCompetition, type PublicMatch } from "@/lib/public-data";

export const metadata: Metadata = { title: "Meciuri" };

export default function MeciuriPage({ searchParams }: PageProps<"/meciuri">) {
  return (
    <>
      <PageHeader title="Meciuri" description="Programul și rezultatele, organizate pe faze și etape." />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        <Suspense fallback={<p className="text-muted">Se încarcă…</p>}>
          <Matches searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}


/** Etapa unui meci ca titlu de secțiune: eticheta („Finala”), „Etapa 3” sau „Alte meciuri”. */
const roundTitle = (m: PublicMatch) => m.round_label ?? (m.round ? `Etapa ${m.round}` : "Alte meciuri");

async function Matches({ searchParams }: { searchParams: PageProps<"/meciuri">["searchParams"] }) {
  const { competitie } = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const matches = await getMatches(selected.id);

  // Faze în ordinea lor, apoi etape în ordinea apariției (meciurile vin sortate după dată).
  const stages = new Map<string, { order: number; rounds: Map<string, PublicMatch[]> }>();
  for (const m of matches) {
    const name = m.stage?.name ?? "Meciuri";
    const stage = stages.get(name) ?? { order: m.stage?.sort_order ?? 0, rounds: new Map() };
    const title = roundTitle(m);
    stage.rounds.set(title, [...(stage.rounds.get(title) ?? []), m]);
    stages.set(name, stage);
  }
  const orderedStages = [...stages].sort((a, b) => a[1].order - b[1].order);

  return (
    <>
      <CompetitionPicker basePath="/meciuri" competitions={competitions} selectedId={selected.id} />
      {matches.length === 0 && <EmptyState>Programul meciurilor va fi publicat în curând.</EmptyState>}
      {orderedStages.map(([stageName, stage]) => (
        <section key={stageName} className="space-y-6">
          {orderedStages.length > 1 && (
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide">{stageName}</h2>
          )}
          {[...stage.rounds].map(([title, list]) => (
            <div key={title} className="space-y-2">
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-pitch-700">{title}</h3>
              <ul className="space-y-2">
                {list.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
