import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { TeamBadge } from "@/components/club-logo";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { FilterBar } from "@/components/filter-bar";
import { Icon, icons } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PlayerAvatar } from "@/components/player-avatar";
import { PlaceBadge, ViewToggle } from "@/components/view-toggle";
import { positionLabels } from "@/lib/labels";
import { getCompetitions, getPlayerStats, pickCompetition, type PlayerCardRow } from "@/lib/public-data";
import { normalize } from "@/lib/search";

export const metadata: Metadata = { title: "Jucători" };

export default function JucatoriPage({ searchParams }: PageProps<"/jucatori">) {
  return (
    <>
      <PageHeader eyebrow="Participanți" title="Jucători" description="Jucătorii fiecărei categorii și statisticile lor." />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-none bg-forest/5" />}>
          <Players searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

const byName = (a: PlayerCardRow, b: PlayerCardRow) =>
  a.last_name.localeCompare(b.last_name, "ro") || a.first_name.localeCompare(b.first_name, "ro");

// Fiecare sortare are cifra ei, afișată mare pe card (la „Nume”, golurile).
const sorts = {
  goluri: { label: "Cele mai multe goluri", value: (p: PlayerCardRow) => p.goals, unit: ["gol", "goluri"], tie: (p: PlayerCardRow) => p.assists },
  pase: { label: "Cele mai multe pase", value: (p: PlayerCardRow) => p.assists, unit: ["pasă", "pase"], tie: (p: PlayerCardRow) => p.goals },
  meciuri: { label: "Cele mai multe meciuri", value: (p: PlayerCardRow) => p.matches_played, unit: ["meci", "meciuri"], tie: (p: PlayerCardRow) => p.goals },
  nume: { label: "Nume", value: (p: PlayerCardRow) => p.goals, unit: ["gol", "goluri"], tie: () => 0 },
} as const;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

async function Players({ searchParams }: { searchParams: PageProps<"/jucatori">["searchParams"] }) {
  const params = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, params.competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const search = first(params.q);
  const team = first(params.echipa);
  const sortKey = first(params.sort) in sorts ? (first(params.sort) as keyof typeof sorts) : "goluri";
  const sort = sorts[sortKey];
  const list = first(params.vedere) === "lista";
  const needle = normalize(search);

  const all = await getPlayerStats(selected.id);
  const teams = [...new Map(all.map((p) => [p.team_id, p.team_name]))].sort((a, b) => a[1].localeCompare(b[1], "ro"));
  const players = all
    .filter((p) => !team || p.team_id === team)
    .filter((p) => !needle || normalize(`${p.first_name} ${p.last_name} ${p.team_name}`).includes(needle))
    .sort((a, b) => (sortKey === "nume" ? 0 : sort.value(b) - sort.value(a) || sort.tie(b) - sort.tie(a)) || byName(a, b));
  // Locul în topul ales: cei cu aceeași cifră îl împart; fără loc la „Nume” sau la 0.
  const placeOf = (p: PlayerCardRow) =>
    sortKey === "nume" || sort.value(p) === 0 ? null : players.findIndex((x) => sort.value(x) === sort.value(p)) + 1;

  const viewHref = (view: "grila" | "lista") =>
    `/jucatori?${new URLSearchParams({ competitie: selected.id, ...(search && { q: search }), ...(team && { echipa: team }), sort: sortKey, vedere: view })}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <CompetitionPicker basePath="/jucatori" competitions={competitions} selectedId={selected.id} />
        <span className="hidden h-8 w-px bg-line lg:block" aria-hidden />
        <FilterBar
          action="/jucatori"
          hidden={{ competitie: selected.id, ...(list && { vedere: "lista" }) }}
          search={{ value: search, placeholder: "Caută jucător după nume…" }}
          selects={[
            { name: "echipa", label: "Echipa", value: team, options: [["", "Toate echipele"], ...teams] },
            { name: "sort", label: "Sortează", value: sortKey, options: Object.entries(sorts).map(([v, s]) => [v, s.label]) },
          ]}
        />
        <ViewToggle list={list} href={viewHref} />
      </div>

      {all.length === 0 ? (
        <EmptyState>Jucătorii vor apărea după înscrierea loturilor.</EmptyState>
      ) : players.length === 0 ? (
        <EmptyState>Niciun jucător găsit.</EmptyState>
      ) : list ? (
        <ul className="space-y-2">
          {players.map((p) => (
            <PlayerRow key={p.player_id + p.team_id} player={p} place={placeOf(p)} />
          ))}
        </ul>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p) => {
            const value = sort.value(p);
            return (
              <li key={p.player_id + p.team_id}>
                <PlayerCard player={p} place={placeOf(p)} value={value} unit={sort.unit[value === 1 ? 0 : 1]} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

const statsOf = (p: PlayerCardRow) =>
  [
    ["Meciuri", p.matches_played],
    ["Goluri", p.goals],
    ["Pase decisive", p.assists],
    ["Cartonașe", p.yellow_cards + p.red_cards],
  ] as const;

function PlayerCard({ player: p, place, value, unit }: { player: PlayerCardRow; place: number | null; value: number; unit: string }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-none border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Banda de sus: locul, poza (cu acord) sau numărul, cifra sortării și echipa. */}
      <div className="relative h-44 overflow-hidden bg-forest bg-[radial-gradient(ellipse_at_30%_0%,color-mix(in_oklab,var(--color-lime)_22%,transparent),transparent_65%)]">
        {p.photo_url ? (
          <div className="absolute inset-y-0 right-0 w-3/5 [mask-image:linear-gradient(to_bottom,black_65%,transparent),linear-gradient(to_left,black_55%,transparent)] [mask-composite:intersect]">
            <Image src={p.photo_url} alt="" fill sizes="(min-width:1280px) 190px, 40vw" className="object-cover object-top" />
          </div>
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <PlayerAvatar player={p} size={88} tone="dark" />
          </span>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-forest/85 via-transparent to-transparent" aria-hidden />
        <span className="absolute left-3 top-3">
          <PlaceBadge position={place} size="sm" />
        </span>
        <span className={`absolute top-3 ${p.photo_url ? "left-4 top-14 text-left" : "right-4 text-right"}`}>
          <span className="block font-display text-5xl font-extrabold tabular-nums leading-none text-lime">{value}</span>
          <span className="block text-[9px] font-bold uppercase tracking-wider text-white/70">{unit}</span>
        </span>
        <Link
          href={`/echipe/${p.team_id}`}
          className="absolute bottom-2.5 left-3 flex max-w-[85%] items-center gap-1.5 text-xs font-bold text-white hover:text-lime"
        >
          <TeamBadge url={p.logo_url} name={p.team_name} size={22} tone="dark" />
          <span className="truncate">{p.team_name}</span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-forest">
          {p.first_name} {p.last_name}
        </h2>
        <p className="text-xs text-muted">{p.position ? positionLabels[p.position] : "Post nestabilit"}</p>

        <dl className="mt-3 grid grid-cols-4 rounded-2xl bg-paper/70 py-2.5 text-center">
          {statsOf(p).map(([label, v]) => (
            <div key={label}>
              <dd className="font-display text-xl font-extrabold tabular-nums leading-none text-forest">{v}</dd>
              <dt className="mt-1 text-[8px] font-semibold uppercase leading-tight tracking-wider text-muted">{label}</dt>
            </div>
          ))}
        </dl>

        <dl className="mt-3 flex justify-between gap-2 text-xs">
          <div className="flex gap-1">
            <dt className="text-muted">Anul nașterii:</dt>
            <dd className="font-bold text-forest">{p.birth_year ?? "—"}</dd>
          </div>
          {p.shirt_number !== null && (
            <div className="flex gap-1">
              <dt className="text-muted">Nr.:</dt>
              <dd className="font-bold text-forest">{p.shirt_number}</dd>
            </div>
          )}
        </dl>

        <Link
          href={`/jucatori/${p.player_id}`}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-bold text-forest transition hover:brightness-95"
        >
          <Icon d={icons.eye} className="size-4" />
          Vezi jucătorul
          <Icon d={icons.arrow} />
        </Link>
      </div>
    </div>
  );
}

function PlayerRow({ player: p, place }: { player: PlayerCardRow; place: number | null }) {
  return (
    <li>
      <Link
        href={`/jucatori/${p.player_id}`}
        className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-line bg-surface p-3 transition hover:border-forest/30 md:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] md:px-4"
      >
        <span className="flex items-center gap-3">
          <span className="w-9">
            <PlaceBadge position={place} size="sm" />
          </span>
          <PlayerAvatar player={p} size={44} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-xl font-extrabold tracking-tight text-forest group-hover:text-pitch-700">
            {p.first_name} {p.last_name}
          </span>
          <span className="block text-xs text-muted">
            {[p.position && positionLabels[p.position], p.birth_year && `n. ${p.birth_year}`].filter(Boolean).join(" · ") || "—"}
          </span>
        </span>
        <span className="hidden min-w-0 items-center gap-2 text-sm font-semibold text-forest md:flex">
          <TeamBadge url={p.logo_url} name={p.team_name} size={28} />
          <span className="truncate">{p.team_name}</span>
        </span>
        <dl className="hidden grid-cols-4 gap-4 text-center md:grid">
          {statsOf(p).map(([label, v]) => (
            <div key={label}>
              <dd className="font-display text-xl font-extrabold tabular-nums leading-none text-forest">{v}</dd>
              <dt className="mt-1 text-[8px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
            </div>
          ))}
        </dl>
        <span className="grid size-9 place-items-center rounded-full border border-line text-forest group-hover:border-forest">
          <Icon d={icons.arrow} className="size-4" />
        </span>
      </Link>
    </li>
  );
}
