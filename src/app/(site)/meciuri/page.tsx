import type { Metadata } from "next";
import { Suspense } from "react";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { formatDay, MatchPanel, MatchRow } from "@/components/match-row";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/ui";
import { getCompetitions, getMatches, pickCompetition, type PublicMatch } from "@/lib/public-data";
import { currentRound, groupRounds } from "@/lib/rounds";

export const metadata: Metadata = { title: "Meciuri" };

export default function MeciuriPage({ searchParams }: PageProps<"/meciuri">) {
  return (
    <>
      <PageHeader eyebrow="Program și rezultate" title="Meciuri" description="Programul și rezultatele, pe etape." />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-forest/5" />}>
          <Matches searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

const dayKey = (m: PublicMatch) => (m.kickoff_at ? formatDay(m.kickoff_at) : "Data nestabilită");

async function Matches({ searchParams }: { searchParams: PageProps<"/meciuri">["searchParams"] }) {
  const { competitie, etapa } = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const rounds = groupRounds(await getMatches(selected.id));
  const round = rounds.find((r) => r.key === etapa) ?? currentRound(rounds);
  const multipleStages = new Set(rounds.map((r) => r.stageName)).size > 1;

  // În cadrul etapei, meciurile pe zile (o etapă se poate juca în mai multe zile).
  const days = new Map<string, PublicMatch[]>();
  for (const m of round?.matches ?? []) days.set(dayKey(m), [...(days.get(dayKey(m)) ?? []), m]);

  return (
    <>
      <CompetitionPicker basePath="/meciuri" competitions={competitions} selectedId={selected.id} />
      {!round ? (
        <EmptyState>Programul meciurilor va fi publicat în curând.</EmptyState>
      ) : (
        <>
          {rounds.length > 1 && (
            <Segmented
              label="Etape"
              options={rounds.map((r) => ({
                href: `/meciuri?competitie=${selected.id}&etapa=${r.key}`,
                label: multipleStages && r.stageName ? `${r.title} · ${r.stageName}` : r.title,
                active: r.key === round.key,
              }))}
            />
          )}
          <MatchPanel>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-4">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-white">{round.title}</h2>
              <span className="text-xs font-semibold text-white/50">
                {round.stageName && multipleStages ? `${round.stageName} · ` : ""}
                {round.matches.length} {round.matches.length === 1 ? "meci" : "meciuri"}
              </span>
            </div>
            {[...days].map(([day, list]) => (
              <div key={day} className="mt-5">
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-lime">{day}</p>
                <ul className="space-y-2.5">
                  {list.map((m) => (
                    <MatchRow key={m.id} match={m} />
                  ))}
                </ul>
              </div>
            ))}
          </MatchPanel>
        </>
      )}
    </>
  );
}
