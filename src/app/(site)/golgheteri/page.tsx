import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TeamBadge } from "@/components/club-logo";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { FilterBar } from "@/components/filter-bar";
import { Icon, icons } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PlayerAvatar } from "@/components/player-avatar";
import { PlaceBadge } from "@/components/view-toggle";
import { positionLabels } from "@/lib/labels";
import { rankPlayers } from "@/lib/player-ranking";
import { getCompetitions, getPlayerStats, pickCompetition, type PlayerCardRow } from "@/lib/public-data";

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

type Ranked = { row: PlayerCardRow; position: number }[];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function TopScorers({ searchParams }: { searchParams: PageProps<"/golgheteri">["searchParams"] }) {
  const params = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, params.competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  // Sezonul alege ce categorii apar în comutator; meniul de sezon duce la prima categorie a sezonului.
  const seasons = [...new Set(competitions.map((c) => c.season?.name ?? ""))];
  const season = selected.season?.name ?? "";
  const inSeason = competitions.filter((c) => (c.season?.name ?? "") === season);

  const team = first(params.echipa);
  const expanded = first(params.lista);
  const all = await getPlayerStats(selected.id);
  const teams = [...new Map(all.map((p) => [p.team_id, p.team_name]))].sort((a, b) => a[1].localeCompare(b[1], "ro"));
  const stats = all.filter((p) => !team || p.team_id === team);
  const scorers = rankPlayers(stats, "goals");
  const assisters = rankPlayers(stats, "assists");

  const href = (changes: Record<string, string>) =>
    `/golgheteri?${new URLSearchParams({ competitie: selected.id, ...(team && { echipa: team }), ...changes })}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <CompetitionPicker basePath="/golgheteri" competitions={inSeason} selectedId={selected.id} />
        <span className="hidden h-8 w-px bg-line lg:block" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:max-w-md">
          <FilterBar
            action="/golgheteri"
            hidden={{ competitie: selected.id }}
            selects={[{ name: "echipa", label: "Echipa", value: team, options: [["", "Toate echipele"], ...teams] }]}
          />
        </div>
        {seasons.length > 1 && (
          // Meniu fără JavaScript; `key` îl închide după ce alegi un sezon.
          <details key={season} className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-bold text-forest hover:border-forest/40">
              <Icon d={icons.calendar} />
              Sezon {season}
              <Icon d={icons.chevron} className="size-4 rotate-90 transition group-open:-rotate-90" />
            </summary>
            <ul className="absolute left-0 z-10 mt-2 min-w-full overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-lg">
              {seasons.map((s) => {
                const target = competitions.find((c) => (c.season?.name ?? "") === s)!;
                return (
                  <li key={s}>
                    <Link
                      href={`/golgheteri?competitie=${target.id}`}
                      scroll={false}
                      className={`block whitespace-nowrap px-4 py-2 text-sm hover:bg-paper ${s === season ? "font-bold text-forest" : "text-muted"}`}
                    >
                      Sezon {s}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </div>

      {scorers.length === 0 && assisters.length === 0 ? (
        <EmptyState>Golgheterii vor apărea după primele goluri înregistrate.</EmptyState>
      ) : (
        <>
          {scorers.length > 0 && <Podium entries={scorers.slice(0, 3)} />}
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Board
              title="Golgheteri"
              icon={icons.ball}
              valueLabel="Goluri"
              rows={scorers}
              value={(p) => p.goals}
              expanded={expanded === "goluri"}
              toggleHref={href(expanded === "goluri" ? {} : { lista: "goluri" })}
              more="Vezi toți golgheterii"
              empty="Niciun gol înregistrat încă."
            />
            <Board
              title="Pase decisive"
              icon={icons.boot}
              valueLabel="Pase"
              rows={assisters}
              value={(p) => p.assists}
              expanded={expanded === "pase"}
              toggleHref={href(expanded === "pase" ? {} : { lista: "pase" })}
              more="Vezi toți pasatorii"
              empty="Nicio pasă decisivă înregistrată încă."
            />
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------ Podium ------------------------------ */

function Podium({ entries }: { entries: Ranked }) {
  return (
    <ol className="grid items-center gap-4 pt-3 md:grid-cols-3">
      {entries.map((e, i) => (
        <PodiumCard key={e.row.player_id + e.row.team_id} entry={e} slot={i} />
      ))}
    </ol>
  );
}

/** `slot` = ordinea în top (0 = primul); pe ecran lat primul stă la mijloc: 2 – 1 – 3. */
function PodiumCard({ entry: { row: p, position }, slot }: { entry: Ranked[number]; slot: number }) {
  const top = slot === 0;
  const order = top ? "md:order-2" : slot === 1 ? "md:order-1" : "md:order-3";
  const stats = [
    ["Meciuri", p.matches_played],
    ["Pase decisive", p.assists],
    ["Cartonașe", p.yellow_cards + p.red_cards],
  ] as const;

  return (
    <li className={order}>
      <Link
        href={`/jucatori/${p.player_id}`}
        className={`relative flex items-center gap-4 overflow-hidden rounded-3xl p-4 transition hover:-translate-y-0.5 ${
          top
            ? "bg-gradient-to-br from-lime to-[color-mix(in_oklab,var(--color-lime)_80%,var(--color-pitch-500))] text-forest shadow-[0_10px_40px_-10px_var(--color-lime)] md:py-6"
            : "bg-forest text-white"
        }`}
      >
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1">
          <span
            className={`grid size-9 place-items-center rounded-xl font-display text-xl font-extrabold ${
              top ? "bg-forest text-lime" : position === 3 ? "bg-[#e8c3a3] text-forest" : "bg-white text-forest"
            }`}
          >
            {position}
          </span>
          {top && <Icon d={icons.crown} className="size-6 fill-forest text-forest" />}
        </span>

        <span className="shrink-0 pt-6">
          <PlayerAvatar player={p} size={top ? 96 : 84} tone={top ? "light" : "dark"} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <TeamBadge url={p.logo_url} name={p.team_name} size={30} tone={top ? "light" : "dark"} />
              <span className="mt-2 block font-display text-2xl font-extrabold leading-tight tracking-tight">
                {p.first_name} {p.last_name}
              </span>
              <span className={`block truncate text-xs ${top ? "text-forest/70" : "text-white/60"}`}>{p.team_name}</span>
            </span>
            <span className="text-right">
              <span className={`block font-display text-5xl font-extrabold tabular-nums leading-none ${top ? "" : "text-lime"}`}>
                {p.goals}
              </span>
              <span className={`block text-[9px] font-bold uppercase tracking-wider ${top ? "text-forest/70" : "text-white/60"}`}>
                {p.goals === 1 ? "gol" : "goluri"}
              </span>
            </span>
          </span>
          <dl className="mt-3 grid grid-cols-3 gap-1.5 text-center">
            {stats.map(([label, value]) => (
              <div key={label} className={`rounded-xl px-1 py-1.5 ${top ? "bg-forest/10" : "bg-white/5"}`}>
                <dd className="font-display text-lg font-extrabold tabular-nums leading-none">{value}</dd>
                <dt className={`mt-0.5 text-[8px] font-semibold uppercase leading-tight tracking-wider ${top ? "text-forest/60" : "text-white/50"}`}>
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </span>
      </Link>
    </li>
  );
}

/* ------------------------------ Tabelele ------------------------------ */

function Board({
  title,
  icon,
  valueLabel,
  rows,
  value,
  expanded,
  toggleHref,
  more,
  empty,
}: {
  title: string;
  icon: string;
  valueLabel: string;
  rows: Ranked;
  value: (p: PlayerCardRow) => number;
  expanded: boolean;
  toggleHref: string;
  more: string;
  empty: string;
}) {
  const shown = expanded ? rows : rows.slice(0, 5);
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="grid size-11 place-items-center rounded-2xl bg-forest text-lime">
          <Icon d={icon} className="size-6" />
        </span>
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-forest">{title}</h2>
      </div>

      {rows.length === 0 ? (
        <p className="mx-4 mb-4 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">{empty}</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead className="bg-paper/60 text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="w-14 px-5 py-3 text-left">#</th>
                <th className="py-3 text-left">Jucător</th>
                <th className="hidden py-3 text-left sm:table-cell">Echipă</th>
                <th className="w-20 px-5 py-3 text-right">{valueLabel}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {shown.map(({ row: p, position }) => (
                <tr key={p.player_id + p.team_id} className="border-b border-line last:border-0 hover:bg-paper/40">
                  <td className="px-5 py-2.5">
                    <PlaceBadge position={position} size="sm" />
                  </td>
                  <td className="py-2.5">
                    <Link href={`/jucatori/${p.player_id}`} className="group flex items-center gap-3">
                      <PlayerAvatar player={p} size={38} />
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-forest group-hover:text-pitch-700">
                          {p.first_name} {p.last_name}
                        </span>
                        <span className="block text-xs text-muted">
                          {p.position ? positionLabels[p.position] : <span className="sm:hidden">{p.team_name}</span>}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden py-2.5 sm:table-cell">
                    <Link href={`/echipe/${p.team_id}`} className="flex items-center gap-2 text-forest hover:text-pitch-700">
                      <TeamBadge url={p.logo_url} name={p.team_name} size={26} />
                      <span className="truncate">{p.team_name}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-right font-display text-2xl font-extrabold text-forest">{value(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 5 && (
            <Link
              href={toggleHref}
              scroll={false}
              className="m-4 flex items-center justify-center gap-2 rounded-2xl border border-line py-3 text-sm font-bold text-forest transition hover:border-forest"
            >
              {expanded ? "Arată doar primii 5" : `${more} (${rows.length})`}
              <Icon d={icons.arrow} className={`size-4 ${expanded ? "-rotate-90" : ""}`} />
            </Link>
          )}
        </>
      )}
    </div>
  );
}
