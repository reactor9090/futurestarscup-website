import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TeamBadge } from "@/components/club-logo";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { FilterBar } from "@/components/filter-bar";
import { PageHeader } from "@/components/page-header";
import { PlayerAvatar } from "@/components/player-avatar";
import { Stat } from "@/components/ui";
import { positionLabels } from "@/lib/labels";
import { getCompetitions, getPlayerStats, pickCompetition, type PlayerCardRow } from "@/lib/public-data";
import { normalize } from "@/lib/search";

export const metadata: Metadata = { title: "Jucători" };

export default function JucatoriPage({ searchParams }: PageProps<"/jucatori">) {
  return (
    <>
      <PageHeader eyebrow="Participanți" title="Jucători" description="Jucătorii fiecărei categorii și statisticile lor." />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-forest/5" />}>
          <Players searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

const byName = (a: PlayerCardRow, b: PlayerCardRow) =>
  a.last_name.localeCompare(b.last_name, "ro") || a.first_name.localeCompare(b.first_name, "ro");

const sorts = {
  goluri: { label: "Cele mai multe goluri", compare: (a: PlayerCardRow, b: PlayerCardRow) => b.goals - a.goals || b.assists - a.assists },
  pase: { label: "Cele mai multe pase", compare: (a: PlayerCardRow, b: PlayerCardRow) => b.assists - a.assists || b.goals - a.goals },
  meciuri: { label: "Cele mai multe meciuri", compare: (a: PlayerCardRow, b: PlayerCardRow) => b.matches_played - a.matches_played },
  nume: { label: "Nume", compare: () => 0 },
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

async function Players({ searchParams }: { searchParams: PageProps<"/jucatori">["searchParams"] }) {
  const params = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, params.competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const search = first(params.q);
  const team = first(params.echipa);
  const sort = first(params.sort) in sorts ? (first(params.sort) as keyof typeof sorts) : "goluri";
  const needle = normalize(search);

  const all = await getPlayerStats(selected.id);
  const teams = [...new Map(all.map((p) => [p.team_id, p.team_name]))].sort((a, b) => a[1].localeCompare(b[1], "ro"));
  const players = all
    .filter((p) => !team || p.team_id === team)
    .filter((p) => !needle || normalize(`${p.first_name} ${p.last_name} ${p.team_name}`).includes(needle))
    .sort((a, b) => sorts[sort].compare(a, b) || byName(a, b));

  return (
    <>
      <CompetitionPicker basePath="/jucatori" competitions={competitions} selectedId={selected.id} />
      <FilterBar
        action="/jucatori"
        hidden={{ competitie: selected.id }}
        search={{ value: search, placeholder: "Caută jucător după nume…" }}
        selects={[
          { name: "echipa", label: "Echipa", value: team, options: [["", "Toate echipele"], ...teams] },
          { name: "sort", label: "Sortează", value: sort, options: Object.entries(sorts).map(([v, s]) => [v, s.label]) },
        ]}
      />

      {all.length === 0 ? (
        <EmptyState>Jucătorii vor apărea după înscrierea loturilor.</EmptyState>
      ) : players.length === 0 ? (
        <EmptyState>Niciun jucător găsit.</EmptyState>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p) => (
            <li key={p.player_id + p.team_id}>
              <PlayerCard player={p} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function PlayerCard({ player: p }: { player: PlayerCardRow }) {
  return (
    <div className="flex h-full flex-col items-center rounded-3xl border border-line bg-surface p-5 text-center">
      <PlayerAvatar player={p} size={96} />
      <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-tight text-forest">
        {p.first_name} {p.last_name}
      </h2>
      <Link href={`/echipe/${p.team_id}`} className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-pitch-700">
        <TeamBadge url={p.logo_url} name={p.team_name} size={18} />
        {p.team_name}
      </Link>
      <dl className="mt-4 grid w-full grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-forest">
        <Stat label="Meciuri" value={p.matches_played} />
        <Stat label="Goluri" value={p.goals} />
        <Stat label="Pase" value={p.assists} />
      </dl>
      <dl className="mt-3 flex w-full justify-between gap-2 text-xs">
        <div className="flex gap-1">
          <dt className="text-muted">Anul nașterii:</dt>
          <dd className="font-semibold text-forest">{p.birth_year ?? "—"}</dd>
        </div>
        {p.position && (
          <div className="flex gap-1">
            <dt className="text-muted">Post:</dt>
            <dd className="font-semibold text-forest">{positionLabels[p.position]}</dd>
          </div>
        )}
      </dl>
      <Link
        href={`/jucatori/${p.player_id}`}
        className="mt-5 w-full rounded-xl bg-lime px-4 py-2.5 text-sm font-bold text-forest hover:brightness-95"
      >
        Vezi jucătorul
      </Link>
    </div>
  );
}
