import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TeamBadge } from "@/components/club-logo";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { FilterBar } from "@/components/filter-bar";
import { PageHeader } from "@/components/page-header";
import { Stat } from "@/components/ui";
import { getCompetitions, getTeams, pickCompetition, type PublicTeam } from "@/lib/public-data";
import { normalize } from "@/lib/search";

export const metadata: Metadata = { title: "Echipe" };

export default function EchipePage({ searchParams }: PageProps<"/echipe">) {
  return (
    <>
      <PageHeader eyebrow="Participanți" title="Echipe" description="Toate echipele participante, pe categorii de vârstă." />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-forest/5" />}>
          <Teams searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

const sorts = {
  loc: { label: "Loc în clasament", compare: (a: PublicTeam, b: PublicTeam) => (a.position ?? 999) - (b.position ?? 999) },
  nume: { label: "Nume", compare: (a: PublicTeam, b: PublicTeam) => a.name.localeCompare(b.name, "ro") },
  goluri: { label: "Cele mai multe goluri", compare: (a: PublicTeam, b: PublicTeam) => b.goals_for - a.goals_for },
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

async function Teams({ searchParams }: { searchParams: PageProps<"/echipe">["searchParams"] }) {
  const params = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, params.competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const search = first(params.q);
  const sort = first(params.sort) in sorts ? (first(params.sort) as keyof typeof sorts) : "loc";
  const needle = normalize(search);
  const all = await getTeams(selected.id);
  const teams = all
    .filter((t) => !needle || normalize(`${t.name} ${t.city ?? ""}`).includes(needle))
    .sort((a, b) => sorts[sort].compare(a, b) || a.name.localeCompare(b.name, "ro"));

  return (
    <>
      <CompetitionPicker basePath="/echipe" competitions={competitions} selectedId={selected.id} />
      <FilterBar
        action="/echipe"
        hidden={{ competitie: selected.id }}
        search={{ value: search, placeholder: "Caută echipă după nume sau oraș…" }}
        selects={[{ name: "sort", label: "Sortează", value: sort, options: Object.entries(sorts).map(([v, s]) => [v, s.label]) }]}
      />

      {all.length === 0 ? (
        <EmptyState>Echipele vor apărea după înscrieri.</EmptyState>
      ) : teams.length === 0 ? (
        <EmptyState>Nicio echipă găsită.</EmptyState>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((team) => (
            <li key={team.id}>
              <TeamCard team={team} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TeamCard({ team }: { team: PublicTeam }) {
  return (
    <div className="flex h-full flex-col items-center rounded-3xl border border-line bg-surface p-5 text-center">
      <TeamBadge url={team.logo_url} name={team.name} size={88} />
      <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-tight text-forest">{team.name}</h2>
      <p className="mt-1 text-xs font-semibold text-muted">
        {team.position !== null && <span className="font-bold uppercase text-pitch-700">Loc {team.position}</span>}
        {team.position !== null && team.city && " · "}
        {team.city}
      </p>
      <dl className="mt-4 grid w-full grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-forest">
        <Stat label="Meciuri" value={team.played} />
        <Stat label="Puncte" value={team.points} />
        <Stat label="Victorii" value={team.won} />
      </dl>
      <dl className="mt-3 w-full space-y-1 text-left text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">Antrenor</dt>
          <dd className="truncate font-semibold text-forest">{team.coach_name ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">Lot</dt>
          <dd className="font-semibold text-forest">
            {team.roster_size} {team.roster_size === 1 ? "jucător" : "jucători"}
          </dd>
        </div>
      </dl>
      <Link
        href={`/echipe/${team.id}`}
        className="mt-5 w-full rounded-xl bg-lime px-4 py-2.5 text-sm font-bold text-forest hover:brightness-95"
      >
        Vezi echipa și lotul
      </Link>
    </div>
  );
}
