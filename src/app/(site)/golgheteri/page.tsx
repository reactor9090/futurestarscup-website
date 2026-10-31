import type { Metadata } from "next";
import { Suspense } from "react";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { LeaderCard } from "@/components/leader-card";
import { PageHeader } from "@/components/page-header";
import { rankPlayers } from "@/lib/player-ranking";
import { getCompetitions, getPlayerStats, pickCompetition } from "@/lib/public-data";

export const metadata: Metadata = { title: "Golgheteri" };

export default function GolgheteriPage({ searchParams }: PageProps<"/golgheteri">) {
  return (
    <>
      <PageHeader eyebrow="Top jucători" title="Golgheteri" description="Cei mai buni marcatori și pasatori ai fiecărei categorii." />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-forest/5" />}>
          <TopScorers searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function TopScorers({ searchParams }: { searchParams: PageProps<"/golgheteri">["searchParams"] }) {
  const { competitie } = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const stats = await getPlayerStats(selected.id);
  const scorers = rankPlayers(stats, "goals");
  const assisters = rankPlayers(stats, "assists");

  return (
    <>
      <CompetitionPicker basePath="/golgheteri" competitions={competitions} selectedId={selected.id} />
      {scorers.length === 0 && assisters.length === 0 ? (
        <EmptyState>Golgheterii vor apărea după primele goluri înregistrate.</EmptyState>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {scorers.length > 0 && <LeaderCard title="Golgheteri" valueLabel="Goluri" rows={scorers} value={(p) => p.goals} />}
          {assisters.length > 0 && (
            <LeaderCard title="Pase decisive" valueLabel="Pase" rows={assisters} value={(p) => p.assists} />
          )}
        </div>
      )}
    </>
  );
}
