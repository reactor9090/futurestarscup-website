import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TeamBadge } from "@/components/club-logo";
import { competitionLabel, CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { Icon, icons } from "@/components/icons";
import { formatDay } from "@/components/match-row";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/ui";
import { getCompetitions, getMatches, pickCompetition, type PublicCompetition, type PublicMatch } from "@/lib/public-data";
import { currentRound, groupRounds, roundTitle } from "@/lib/rounds";

export const metadata: Metadata = { title: "Meciuri" };

export default function MeciuriPage({ searchParams }: PageProps<"/meciuri">) {
  return (
    <>
      <PageHeader eyebrow="Program și rezultate" title="Meciuri" description="Programul și rezultatele, organizate pe etape." />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-forest/5" />}>
          <Matches searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

const TZ = "Europe/Bucharest";
const timeFormat = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dateFormat = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
const yearFormat = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, year: "numeric" });

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
/** Ziua unui meci, ca etichetă: „Duminică, 8 noiembrie 2026”. */
const dayOf = (m: PublicMatch) =>
  m.kickoff_at ? `${formatDay(m.kickoff_at)} ${yearFormat.format(new Date(m.kickoff_at))}` : "Data nestabilită";

async function Matches({ searchParams }: { searchParams: PageProps<"/meciuri">["searchParams"] }) {
  const params = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, params.competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const matches = await getMatches(selected.id);
  const rounds = groupRounds(matches);
  const round = rounds.find((r) => r.key === first(params.etapa)) ?? currentRound(rounds);
  const at = round ? rounds.indexOf(round) : -1;
  const multipleStages = new Set(rounds.map((r) => r.stageName)).size > 1;
  const roundHref = (key: string) => `/meciuri?competitie=${selected.id}&etapa=${key}`;

  // Zilele etapei (o etapă se poate juca în mai multe zile); `?zi=` le filtrează.
  const days = [...new Set((round?.matches ?? []).map(dayOf))];
  const day = days.includes(first(params.zi)) ? first(params.zi) : null;
  const shown = (round?.matches ?? []).filter((m) => !day || dayOf(m) === day);
  const byDay = new Map<string, PublicMatch[]>();
  for (const m of shown) byDay.set(dayOf(m), [...(byDay.get(dayOf(m)) ?? []), m]);

  const recent = matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => (b.kickoff_at ?? "").localeCompare(a.kickoff_at ?? ""))
    .slice(0, 4);
  // „Toate rezultatele” duce la etapa ultimului rezultat.
  const recentRound = rounds.find((r) => r.matches.some((m) => m.id === recent[0]?.id));

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <CompetitionPicker basePath="/meciuri" competitions={competitions} selectedId={selected.id} />
        {rounds.length > 1 && round && (
          <>
            <span className="hidden h-8 w-px bg-line sm:block" aria-hidden />
            <Segmented
              label="Etape"
              options={rounds.map((r) => ({
                href: roundHref(r.key),
                label: multipleStages && r.stageName ? `${r.title} · ${r.stageName}` : r.title,
                active: r.key === round.key,
              }))}
            />
          </>
        )}
        {round && (
          <div className="ml-auto flex items-center gap-2">
            {days.length > 1 ? (
              // Meniu fără JavaScript; `key` îl închide după ce alegi o zi.
              <details key={day ?? "toate"} className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-bold text-forest hover:border-forest/40">
                  <Icon d={icons.calendar} />
                  {day ?? "Toate zilele"}
                  <Icon d={icons.chevron} className="size-4 rotate-90 transition group-open:-rotate-90" />
                </summary>
                <ul className="absolute right-0 z-10 mt-2 min-w-full overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-lg">
                  {[null, ...days].map((d) => (
                    <li key={d ?? "toate"}>
                      <Link
                        href={d ? `${roundHref(round.key)}&zi=${encodeURIComponent(d)}` : roundHref(round.key)}
                        scroll={false}
                        className={`block whitespace-nowrap px-4 py-2 text-sm hover:bg-paper ${d === day ? "font-bold text-forest" : "text-muted"}`}
                      >
                        {d ?? "Toate zilele"}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-bold text-forest">
                <Icon d={icons.calendar} />
                {days[0]}
              </span>
            )}
            <RoundArrow href={at > 0 ? roundHref(rounds[at - 1].key) : null} label="Etapa anterioară" back />
            <RoundArrow href={at < rounds.length - 1 ? roundHref(rounds[at + 1].key) : null} label="Etapa următoare" />
          </div>
        )}
      </div>

      {!round ? (
        <EmptyState>Programul meciurilor va fi publicat în curând.</EmptyState>
      ) : (
        <section className="rounded-3xl border border-line bg-surface p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-4 pt-1 sm:px-2">
            <div className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-forest text-lime">
                <Icon d={icons.calendarDots} className="size-7" />
              </span>
              <div>
                <h2 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-forest">
                  {round.title}
                </h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">
                  {[multipleStages ? round.stageName : null, day ?? (days.length === 1 ? days[0] : `${days.length} zile`)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {shown.length} {shown.length === 1 ? "meci" : "meciuri"}
            </span>
          </div>

          <div className="space-y-4">
            {[...byDay].map(([d, list]) => (
              <div key={d} className="space-y-2">
                {byDay.size > 1 && <p className="px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-pitch-700">{d}</p>}
                <ul className="space-y-2">
                  {list.map((m) => (
                    <FixtureRow key={m.id} match={m} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && recentRound && (
        <RecentResults competition={selected} matches={recent} href={roundHref(recentRound.key)} />
      )}
    </>
  );
}

function RoundArrow({ href, label, back = false }: { href: string | null; label: string; back?: boolean }) {
  const cls = "grid size-10 place-items-center rounded-full border border-line bg-surface text-forest";
  const icon = <Icon d={icons.chevron} className={`size-4 ${back ? "rotate-180" : ""}`} />;
  return href ? (
    <Link href={href} scroll={false} aria-label={label} className={`${cls} transition hover:border-forest`}>
      {icon}
    </Link>
  ) : (
    <span aria-hidden className={`${cls} opacity-40`}>
      {icon}
    </span>
  );
}

/* ------------------------------ Un meci ------------------------------ */

/** Echipa cu insigna; oaspeții stau aliniați la dreapta pe telefon (`end-mobile`) sau mereu (`end`). */
function Team({ team, align }: { team: PublicMatch["home"]; align: "start" | "end-mobile" | "end" }) {
  const reverse =
    align === "end" ? "flex-row-reverse text-right" : align === "end-mobile" ? "flex-row-reverse text-right sm:flex-row sm:text-left" : "";
  return (
    <Link href={`/echipe/${team.id}`} className={`group flex min-w-0 items-center gap-3 ${reverse}`}>
      <TeamBadge url={team.club?.logo_url ?? null} name={team.name} size={40} />
      <span className="line-clamp-2 text-sm font-bold leading-tight text-forest group-hover:text-pitch-700 sm:text-base">
        {team.name}
      </span>
    </Link>
  );
}

function FixtureRow({ match: m }: { match: PublicMatch }) {
  const live = m.status === "live";
  const finished = m.status === "finished";
  const note = m.status === "postponed" ? "Amânat" : m.status === "cancelled" ? "Anulat" : null;
  const penalties =
    finished && m.home_penalties !== null && m.away_penalties !== null ? `${m.home_penalties}–${m.away_penalties} pen.` : null;

  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-3 rounded-2xl border border-line bg-paper/40 p-3 transition hover:border-forest/25 sm:grid-cols-[5.5rem_1fr_6rem_1fr_minmax(0,13rem)] sm:gap-x-4 sm:px-4">
      {/* Ora; pe telefon ocupă un rând întreg, împreună cu terenul. */}
      <div className="col-span-3 flex items-center justify-between gap-2 sm:col-span-1">
        <span className="rounded-xl bg-lime/40 px-3 py-2 text-center font-display text-lg font-extrabold tabular-nums text-forest">
          {m.kickoff_at ? timeFormat.format(new Date(m.kickoff_at)) : "—"}
        </span>
        {m.venue && (
          <span className="flex items-center gap-1 truncate text-xs text-muted sm:hidden">
            <Icon d={icons.pin} className="size-3.5" />
            {m.venue}
          </span>
        )}
      </div>

      <Team team={m.home} align="start" />

      <div className="flex flex-col items-center gap-1">
        {live ? (
          <span className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 font-display text-xl font-extrabold tabular-nums text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
            {m.home_score}–{m.away_score}
          </span>
        ) : finished ? (
          <span className="rounded-lg bg-forest px-3 py-1 font-display text-xl font-extrabold tabular-nums text-white">
            {m.home_score}–{m.away_score}
          </span>
        ) : (
          <span className={`rounded-lg px-3 py-1 text-sm font-extrabold ${note ? "bg-gold-100 text-ink" : "bg-lime text-forest"}`}>
            {note ?? "VS"}
          </span>
        )}
        {(m.group || penalties || live) && (
          <span className="rounded-md bg-forest/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
            {live ? "Live" : (penalties ?? m.group?.name)}
          </span>
        )}
      </div>

      <Team team={m.away} align="end-mobile" />

      <div className="hidden items-center gap-2 border-l border-line pl-4 text-sm sm:flex">
        {m.venue ? (
          <>
            <Icon d={icons.pin} className="size-5 text-forest/60" />
            <span className="min-w-0 truncate font-semibold text-forest">{m.venue}</span>
          </>
        ) : (
          <span className="text-xs text-muted">Teren nestabilit</span>
        )}
      </div>
    </li>
  );
}

/* ------------------------------ Rezultate recente ------------------------------ */

function RecentResults({
  competition,
  matches,
  href,
}: {
  competition: PublicCompetition;
  matches: PublicMatch[];
  href: string;
}) {
  return (
    <section className="space-y-5 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-forest text-lime">
            <Icon d={icons.trophy} className="size-7" />
          </span>
          <div>
            <h2 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-forest">
              Rezultate recente
            </h2>
            <p className="mt-1 text-sm text-muted">Ultimele meciuri disputate la {competitionLabel(competition)}.</p>
          </div>
        </div>
        <Link
          href={href}
          className="flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-bold text-forest transition hover:border-forest"
        >
          Toate rezultatele
          <Icon d={icons.arrow} />
        </Link>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {matches.map((m) => (
          <li key={m.id} className="rounded-3xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted">
                <span className="text-forest">{competitionLabel(competition)}</span>
                {[roundTitle(m), m.kickoff_at ? dateFormat.format(new Date(m.kickoff_at)) : null]
                  .filter(Boolean)
                  .map((t) => ` · ${t}`)
                  .join("")}
              </p>
              <span className="shrink-0 rounded-full bg-lime px-3 py-1 text-[10px] font-extrabold text-forest">FINAL</span>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <Team team={m.home} align="start" />
              <span className="text-center font-display text-4xl font-extrabold tabular-nums text-forest">
                {m.home_score} – {m.away_score}
                {m.home_penalties !== null && m.away_penalties !== null && (
                  <span className="block font-sans text-[10px] font-semibold text-muted">
                    {m.home_penalties}–{m.away_penalties} pen.
                  </span>
                )}
              </span>
              <Team team={m.away} align="end" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
