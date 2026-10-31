import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TeamBadge } from "@/components/club-logo";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { FilterBar } from "@/components/filter-bar";
import { Icon, icons } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PlaceBadge, ViewToggle } from "@/components/view-toggle";
import { getCompetitions, getTeams, pickCompetition, type PublicTeam } from "@/lib/public-data";
import { normalize } from "@/lib/search";

export const metadata: Metadata = { title: "Echipe" };

export default function EchipePage({ searchParams }: PageProps<"/echipe">) {
  return (
    <>
      <PageHeader
        eyebrow="Echipe participante"
        title="Echipe"
        description="Descoperă toate echipele din campionat, statisticile și loturile lor."
      />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-none bg-forest/5" />}>
          <Teams searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

const sorts = {
  // La faza pe grupe, locurile 1 din toate grupele vin primele, ordonate după grupă.
  loc: {
    label: "Loc în clasament",
    compare: (a: PublicTeam, b: PublicTeam) =>
      (a.position ?? 999) - (b.position ?? 999) || (a.group ?? "").localeCompare(b.group ?? "", "ro"),
  },
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
  const list = first(params.vedere) === "lista";
  const needle = normalize(search);
  const all = await getTeams(selected.id);
  const teams = all
    .filter((t) => !needle || normalize(`${t.name} ${t.city ?? ""}`).includes(needle))
    .sort((a, b) => sorts[sort].compare(a, b) || a.name.localeCompare(b.name, "ro"));

  // Comutatorul grilă / listă păstrează categoria, căutarea și sortarea.
  const viewHref = (view: "grila" | "lista") =>
    `/echipe?${new URLSearchParams({ competitie: selected.id, ...(search && { q: search }), sort, vedere: view })}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <CompetitionPicker basePath="/echipe" competitions={competitions} selectedId={selected.id} />
        <span className="hidden h-8 w-px bg-line lg:block" aria-hidden />
        <FilterBar
          action="/echipe"
          hidden={{ competitie: selected.id, ...(list && { vedere: "lista" }) }}
          search={{ value: search, placeholder: "Caută echipă după nume sau oraș…" }}
          selects={[{ name: "sort", label: "Sortează", value: sort, options: Object.entries(sorts).map(([v, s]) => [v, s.label]) }]}
        />
        <ViewToggle list={list} href={viewHref} />
      </div>

      {all.length === 0 ? (
        <EmptyState>Echipele vor apărea după înscrieri.</EmptyState>
      ) : teams.length === 0 ? (
        <EmptyState>Nicio echipă găsită.</EmptyState>
      ) : list ? (
        <ul className="space-y-2">
          {teams.map((team) => (
            <TeamRow key={team.id} team={team} />
          ))}
        </ul>
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

const recordOf = (t: PublicTeam) =>
  [
    ["Meciuri", t.played],
    ["Victorii", t.won],
    ["Egaluri", t.drawn],
    ["Înfrângeri", t.lost],
  ] as const;

function People({ team }: { team: PublicTeam }) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <Icon d={icons.user} className="size-5 text-forest/60" />
        <span className="min-w-0 text-left leading-tight">
          <span className="block text-[10px] text-muted">Antrenor</span>
          <span className="block truncate text-sm font-semibold text-forest">{team.coach_name ?? "—"}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <Icon d={icons.users} className="size-5 text-forest/60" />
        <span className="text-left leading-tight">
          <span className="block text-sm font-bold text-forest">{team.roster_size}</span>
          <span className="block text-[10px] text-muted">{team.roster_size === 1 ? "jucător" : "jucători"}</span>
        </span>
      </span>
    </>
  );
}

function TeamCard({ team }: { team: PublicTeam }) {
  const leader = team.position === 1 && team.played > 0;
  return (
    <div
      className={`relative flex h-full flex-col items-center rounded-none border bg-surface p-4 text-center transition hover:-translate-y-0.5 hover:shadow-md ${
        leader ? "border-lime shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-lime)_35%,transparent)]" : "border-line"
      }`}
    >
      <span className="absolute left-4 top-4">
        <PlaceBadge position={team.position} />
      </span>
      <span className="mt-2">
        <TeamBadge url={team.logo_url} name={team.name} size={88} />
      </span>
      <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight text-forest">{team.name}</h2>
      <p className="mt-0.5 text-xs text-muted">
        {team.position !== null && (
          <span className="font-bold uppercase text-pitch-700">
            Loc {team.position}
            {team.group && ` · ${team.group}`}
          </span>
        )}
        {team.position !== null && team.city && " · "}
        {team.city}
      </p>

      <dl className="mt-4 grid w-full grid-cols-4 rounded-2xl bg-paper/70 py-2.5">
        {recordOf(team).map(([label, value]) => (
          <div key={label}>
            <dd className="font-display text-2xl font-extrabold tabular-nums leading-none text-forest">{value}</dd>
            <dt className="mt-1 text-[8px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex w-full items-center justify-between gap-3 px-1">
        <People team={team} />
      </div>

      <Link
        href={`/echipe/${team.id}`}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-bold text-forest transition hover:brightness-95"
      >
        Vezi echipa și lotul
        <Icon d={icons.arrow} />
      </Link>
    </div>
  );
}

function TeamRow({ team }: { team: PublicTeam }) {
  return (
    <li>
      <Link
        href={`/echipe/${team.id}`}
        className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-line bg-surface p-3 transition hover:border-forest/30 md:grid-cols-[auto_minmax(0,1.4fr)_auto_minmax(0,1fr)_auto] md:px-4"
      >
        <span className="flex items-center gap-3">
          <PlaceBadge position={team.position} size="sm" />
          <TeamBadge url={team.logo_url} name={team.name} size={44} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-xl font-extrabold tracking-tight text-forest group-hover:text-pitch-700">
            {team.name}
          </span>
          <span className="block text-xs text-muted">{[team.group, team.city].filter(Boolean).join(" · ") || "—"}</span>
        </span>
        <dl className="hidden grid-cols-5 gap-4 text-center md:grid">
          {[...recordOf(team), ["Puncte", team.points] as const].map(([label, value]) => (
            <div key={label}>
              <dd className="font-display text-xl font-extrabold tabular-nums leading-none text-forest">{value}</dd>
              <dt className="mt-1 text-[8px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
            </div>
          ))}
        </dl>
        <span className="hidden items-center justify-between gap-3 md:flex">
          <People team={team} />
        </span>
        <span className="grid size-9 place-items-center rounded-full border border-line text-forest group-hover:border-forest">
          <Icon d={icons.arrow} className="size-4" />
        </span>
      </Link>
    </li>
  );
}
