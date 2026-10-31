import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TeamBadge } from "@/components/club-logo";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { Icon, icons } from "@/components/icons";
import { LeaderCard } from "@/components/leader-card";
import { PageHeader } from "@/components/page-header";
import { StandingsLegend, StandingsRows, type StandingsRow } from "@/components/standings-table";
import { Segmented } from "@/components/ui";
import { rankPlayers } from "@/lib/player-ranking";
import { getCompetitions, getPlayerStats, getStandings, pickCompetition } from "@/lib/public-data";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = { title: "Clasament" };

export default function ClasamentPage({ searchParams }: PageProps<"/clasament">) {
  return (
    <>
      <PageHeader
        eyebrow="Situația la zi"
        title="Clasament"
        description="Clasamentul fiecărei categorii de vârstă, calculat automat după fiecare rezultat."
      />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-forest/5" />}>
          <Standings searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Standings({ searchParams }: { searchParams: PageProps<"/clasament">["searchParams"] }) {
  const params = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, params.competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;
  const scorersView = first(params.vedere) === "marcatori";
  const base = `/clasament?competitie=${selected.id}`;

  // Fiecare tabel (campionat sau grupă) e o filă; cu mai multe faze, numele fazei intră în etichetă.
  const stages = scorersView ? [] : await getStandings(selected.id);
  const tables = stages.flatMap((stage) =>
    stage.tables
      .filter((t) => t.rows.length > 0)
      .map((table) => {
        const label = [stages.length > 1 ? stage.name : null, table.groupName].filter(Boolean).join(" · ") || stage.name;
        return { key: slugify(label), label, table, champion: stage.complete && stage.type === "league" };
      }),
  );
  const current = tables.find((t) => t.key === first(params.grupa)) ?? tables[0];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <CompetitionPicker
          basePath="/clasament"
          competitions={competitions}
          selectedId={selected.id}
          params={scorersView ? { vedere: "marcatori" } : {}}
        />
        {tables.length > 1 && (
          <>
            <span className="hidden h-8 w-px bg-line sm:block" aria-hidden />
            <Segmented
              label="Grupă"
              options={tables.map((t) => ({ href: `${base}&grupa=${t.key}`, label: t.label, active: t.key === current?.key }))}
            />
          </>
        )}
        <Link
          href={scorersView ? base : `${base}&vedere=marcatori`}
          className="ml-auto flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-bold text-forest transition hover:border-forest"
        >
          <Icon d={scorersView ? icons.trophy : icons.chart} className="size-4" />
          {scorersView ? "Clasament" : "Top marcatori"}
          <Icon d={icons.arrow} />
        </Link>
      </div>

      {scorersView ? (
        <ScorersView competitionId={selected.id} />
      ) : !current ? (
        <EmptyState>Clasamentul va apărea după ce sunt înscrise echipele.</EmptyState>
      ) : (
        <>
          {/* Podiumul are sens doar după primele meciuri; înainte, toți au 0 puncte. */}
          {current.table.rows.some((r) => r.played > 0) && (
            <Podium rows={current.table.rows.slice(0, 3)} champion={current.champion} />
          )}
          <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
            <StandingsRows rows={current.table.rows} />
            <StandingsLegend />
          </div>
        </>
      )}
    </>
  );
}

async function ScorersView({ competitionId }: { competitionId: string }) {
  const stats = await getPlayerStats(competitionId);
  const scorers = rankPlayers(stats, "goals");
  const assisters = rankPlayers(stats, "assists");
  if (scorers.length === 0 && assisters.length === 0) {
    return <EmptyState>Marcatorii vor apărea după primele goluri înregistrate.</EmptyState>;
  }
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      {scorers.length > 0 && <LeaderCard title="Marcatori" valueLabel="Goluri" rows={scorers.slice(0, 15)} value={(p) => p.goals} />}
      {assisters.length > 0 && (
        <LeaderCard title="Pase decisive" valueLabel="Pase" rows={assisters.slice(0, 15)} value={(p) => p.assists} />
      )}
    </div>
  );
}

/* ------------------------------ Podium ------------------------------ */

function Podium({ rows, champion }: { rows: StandingsRow[]; champion: boolean }) {
  return (
    <ol className="grid items-center gap-4 pt-4 md:grid-cols-[1fr_1.05fr_1fr]">
      {rows.map((row) => (
        <PodiumCard key={row.team_id} row={row} champion={champion && row.position === 1} />
      ))}
    </ol>
  );
}

function PodiumCard({ row, champion }: { row: StandingsRow; champion: boolean }) {
  const first = row.position === 1;
  // Pe ecran lat: 2 – 1 – 3, cu primul mai mare, în mijloc.
  const order = first ? "md:order-2" : row.position === 2 ? "md:order-1" : "md:order-3";
  const stats = [
    ["V", row.won],
    ["E", row.drawn],
    ["Î", row.lost],
    ["Goluri", `${row.goals_for}:${row.goals_against}`],
  ] as const;

  return (
    <li className={`relative ${order}`}>
      {first && (
        <span className="absolute -top-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center">
          <Icon d={icons.crown} className="size-9 fill-forest text-forest" />
          {champion && (
            <span className="-mt-0.5 rounded-full bg-forest px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-lime">
              Campioană
            </span>
          )}
        </span>
      )}
      <Link
        href={`/echipe/${row.team_id}`}
        className={`relative flex flex-col items-center overflow-hidden rounded-3xl p-5 text-center transition hover:-translate-y-0.5 ${
          first
            ? "bg-gradient-to-br from-lime to-[color-mix(in_oklab,var(--color-lime)_80%,var(--color-pitch-500))] text-forest shadow-[0_10px_40px_-10px_var(--color-lime)] md:py-8"
            : "bg-forest text-white"
        }`}
      >
        <Icon
          d={first ? icons.trophy : icons.ball}
          className={`pointer-events-none absolute -right-6 top-6 size-40 ${first ? "text-forest/10" : "text-white/5"}`}
        />
        <span className="absolute left-5 top-3 font-display text-5xl font-extrabold leading-none">{row.position}</span>
        <TeamBadge url={row.logo_url} name={row.team_name} size={first ? 72 : 60} />
        <span className="relative mt-3 text-lg font-bold">{row.team_name}</span>
        <span className="relative font-display text-4xl font-extrabold tabular-nums leading-tight">
          {row.points}
          <span className="ml-1 font-sans text-xs font-semibold">{row.points === 1 ? "punct" : "puncte"}</span>
        </span>
        <dl className="relative mt-4 grid w-full grid-cols-4 gap-1.5">
          {stats.map(([label, value]) => (
            <div key={label} className={`rounded-xl px-1 py-2 ${first ? "bg-forest/10" : "bg-white/5"}`}>
              <dd className="font-display text-xl font-extrabold tabular-nums leading-none">{value}</dd>
              <dt className={`mt-1 text-[9px] font-semibold uppercase tracking-wider ${first ? "text-forest/60" : "text-white/50"}`}>
                {label}
              </dt>
            </div>
          ))}
        </dl>
      </Link>
    </li>
  );
}
