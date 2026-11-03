import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { TeamBadge } from "@/components/club-logo";
import { Icon, icons } from "@/components/icons";
import { formatDay } from "@/components/match-row";
import { positionLabels } from "@/lib/labels";
import {
  getMatchDetail,
  getMatches,
  getStandings,
  type LineupPlayer,
  type MatchDetail,
  type MatchEvent,
  type PublicMatch,
} from "@/lib/public-data";
import { groupRounds, roundTitle } from "@/lib/rounds";

export async function generateMetadata({ params }: PageProps<"/meciuri/[matchId]">): Promise<Metadata> {
  const { matchId } = await params;
  const match = z.uuid().safeParse(matchId).success ? await getMatchDetail(matchId) : null;
  return { title: match ? `${match.home.name} – ${match.away.name}` : "Meci" };
}

export default function MatchPage({ params }: PageProps<"/meciuri/[matchId]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse bg-forest" />}>
      <Match params={params} />
    </Suspense>
  );
}

const TZ = "Europe/Bucharest";
const timeFormat = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const yearFormat = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, year: "numeric" });
const shortDate = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, day: "numeric", month: "short" });

type Side = MatchDetail["home"];

async function Match({ params }: { params: PageProps<"/meciuri/[matchId]">["params"] }) {
  const { matchId } = await params;
  if (!z.uuid().safeParse(matchId).success) notFound();
  const m = await getMatchDetail(matchId);
  if (!m) notFound();

  const [standings, all] = await Promise.all([getStandings(m.competition.id), getMatches(m.competition.id)]);
  const rounds = groupRounds(all);
  const round = rounds.find((r) => r.matches.some((x) => x.id === m.id));
  const others = (round?.matches ?? []).filter((x) => x.id !== m.id);

  const notPlayed = m.status === "scheduled" || m.status === "postponed" || m.status === "cancelled";
  const hasStats = m.stats.some((s) => Object.entries(s).some(([k, v]) => k !== "team_id" && v !== null));
  const hasLineups = m.lineups.home.length + m.lineups.away.length > 0;

  return (
    <>
      <Scoreboard m={m} />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {m.status === "live" && (
            <p className="flex items-center gap-2 rounded-2xl bg-red-600/10 px-4 py-3 text-sm font-semibold text-red-700">
              <span className="size-2 animate-pulse rounded-full bg-red-600" aria-hidden />
              Meciul se joacă acum. Scorul și evenimentele se actualizează când reîmprospătezi pagina.
            </p>
          )}

          {notPlayed && m.events.length === 0 ? (
            <Panel title="Înainte de meci" icon={icons.calendarDots}>
              <p className="text-muted">
                {m.status === "postponed"
                  ? "Meciul a fost amânat. Data nouă va apărea aici."
                  : m.status === "cancelled"
                    ? "Meciul a fost anulat."
                    : `Meciul începe ${
                        m.kickoff_at
                          ? `${formatDay(m.kickoff_at).toLowerCase()} la ora ${timeFormat.format(new Date(m.kickoff_at))}`
                          : "la o dată care va fi anunțată"
                      }${m.venue ? `, pe ${m.venue}` : ""}. Evenimentele, statisticile și loturile apar după începerea partidei.`}
              </p>
            </Panel>
          ) : (
            <Panel title="Evenimentele meciului" icon={icons.ball}>
              <Timeline m={m} />
            </Panel>
          )}

          {hasStats && (
            <Panel title="Statistici" icon={icons.chart}>
              <StatBars m={m} />
            </Panel>
          )}

          {hasLineups && (
            <Panel title="Loturile echipelor" icon={icons.shirt}>
              <div className="grid gap-8 md:grid-cols-2">
                <Lineup team={m.home} players={m.lineups.home} />
                <Lineup team={m.away} players={m.lineups.away} />
              </div>
            </Panel>
          )}
        </div>

        <aside className="space-y-6">
          <TeamForm m={m} team={m.home} standings={standings} all={all} />
          <TeamForm m={m} team={m.away} standings={standings} all={all} />
          {others.length > 0 && round && (
            <Panel title={`Alte meciuri · ${round.title}`} icon={icons.calendar}>
              <ul className="space-y-2">
                {others.map((o) => (
                  <OtherMatch key={o.id} match={o} />
                ))}
              </ul>
              <Link
                href={`/meciuri?competitie=${m.competition.id}&etapa=${round.key}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-forest hover:border-forest"
              >
                Toată etapa <Icon d={icons.arrow} />
              </Link>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}

/* ------------------------------ Antet cu scor ------------------------------ */

const statusInfo = {
  scheduled: { label: "Programat", cls: "bg-lime text-forest" },
  live: { label: "LIVE", cls: "bg-red-600 text-white" },
  finished: { label: "Finalizat", cls: "bg-white text-forest" },
  postponed: { label: "Amânat", cls: "bg-gold-100 text-ink" },
  cancelled: { label: "Anulat", cls: "bg-gold-100 text-ink" },
} as const;

function Scoreboard({ m }: { m: MatchDetail }) {
  const status = statusInfo[m.status];
  const hasScore = m.status === "live" || m.status === "finished";
  const category = m.competition.season?.is_current ? m.competition.category?.name : null;
  const penalties =
    m.status === "finished" && m.home_penalties !== null && m.away_penalties !== null
      ? `${m.home_penalties}–${m.away_penalties} la penalty`
      : null;
  const meta = [category ?? m.competition.name, roundTitle(m), m.stage?.name, m.group?.name].filter(Boolean);

  return (
    <section className="relative overflow-hidden bg-forest text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href={`/meciuri?competitie=${m.competition.id}`} className="text-sm text-white/60 hover:text-white">
          ← Toate meciurile
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center">
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${status.cls}`}
          >
            {m.status === "live" && <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />}
            {status.label}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">{meta.join(" · ")}</span>
        </div>

        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
          <TeamColumn team={m.home} />
          <div className="text-center">
            {hasScore ? (
              <p
                className={`font-display text-6xl font-extrabold leading-none tabular-nums sm:text-8xl ${m.status === "live" ? "text-lime" : ""}`}
              >
                {m.home_score}–{m.away_score}
              </p>
            ) : (
              <p className="font-display text-4xl font-extrabold leading-none text-lime sm:text-6xl">
                {m.kickoff_at ? timeFormat.format(new Date(m.kickoff_at)) : "VS"}
              </p>
            )}
            {penalties && <p className="mt-2 text-sm text-white/70">{penalties}</p>}
          </div>
          <TeamColumn team={m.away} />
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/75">
          <li className="flex items-center gap-2">
            <Icon d={icons.calendar} className="size-4 text-lime" />
            {m.kickoff_at
              ? `${formatDay(m.kickoff_at)} ${yearFormat.format(new Date(m.kickoff_at))}, ${timeFormat.format(new Date(m.kickoff_at))}`
              : "Data nestabilită"}
          </li>
          <li className="flex items-center gap-2">
            <Icon d={icons.pin} className="size-4 text-lime" />
            {m.venue ?? "Teren nestabilit"}
          </li>
        </ul>
      </div>
    </section>
  );
}

function TeamColumn({ team }: { team: Side }) {
  return (
    <Link href={`/echipe/${team.id}`} className="group flex flex-col items-center gap-3 text-center">
      <TeamBadge url={team.club?.logo_url ?? null} name={team.name} size={96} />
      <span className="font-display text-xl font-extrabold leading-tight group-hover:text-lime sm:text-3xl">{team.name}</span>
    </Link>
  );
}

/* ------------------------------ Secțiuni ------------------------------ */

function Panel({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="rounded-none border border-line bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 flex items-center gap-3 font-display text-2xl font-extrabold leading-none tracking-tight text-forest">
        <span className="grid size-9 place-items-center rounded-xl bg-forest text-lime">
          <Icon d={icon} className="size-5" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const playerName = (p: { first_name: string; last_name: string } | null) =>
  p ? `${p.first_name} ${p.last_name}` : "Jucător necunoscut";

/** Golul contează adversarului la autogol, deci apare pe partea acestuia; cartonașele pe partea jucătorului. */
function eventSide(e: MatchEvent, m: MatchDetail): "home" | "away" {
  const own = e.team_id === m.home.id ? "home" : "away";
  return e.type === "own_goal" ? (own === "home" ? "away" : "home") : own;
}

const eventIcon: Record<MatchEvent["type"], string> = { goal: "⚽", own_goal: "⚽", yellow_card: "🟨", red_card: "🟥" };

function Timeline({ m }: { m: MatchDetail }) {
  if (m.events.length === 0) {
    return (
      <p className="text-muted">
        {m.status === "finished"
          ? "Nu au fost introduse evenimente pentru acest meci."
          : "Încă nu s-a întâmplat nimic notabil."}
      </p>
    );
  }
  return (
    <ol className="divide-y divide-line">
      {m.events.map((e) => {
        const side = eventSide(e, m);
        const text = (
          <span className={`min-w-0 ${side === "home" ? "text-right" : "text-left"}`}>
            <span className="block truncate font-semibold text-forest">
              {e.player ? (
                <Link href={`/jucatori/${e.player.id}`} className="hover:underline">
                  {playerName(e.player)}
                </Link>
              ) : (
                playerName(null)
              )}
              {e.type === "own_goal" && <span className="font-normal text-muted"> (autogol)</span>}
            </span>
            {e.assist && <span className="block truncate text-xs text-muted">Pasă decisivă: {playerName(e.assist)}</span>}
          </span>
        );
        return (
          <li key={e.id} className="grid grid-cols-[1fr_3.5rem_1fr] items-center gap-3 py-3 text-sm">
            {side === "home" ? text : <span />}
            <span className="flex flex-col items-center leading-tight">
              <span className="text-lg" aria-hidden>
                {eventIcon[e.type]}
              </span>
              <span className="mt-0.5 text-xs font-bold tabular-nums text-muted">{e.minute !== null ? `${e.minute}'` : "–"}</span>
            </span>
            {side === "away" ? text : <span />}
          </li>
        );
      })}
    </ol>
  );
}

const statRows = [
  ["possession", "Posesie", "%"],
  ["shots", "Șuturi", ""],
  ["shots_on_target", "Șuturi pe poartă", ""],
  ["corners", "Cornere", ""],
  ["fouls", "Faulturi", ""],
  ["offsides", "Ofsaiduri", ""],
] as const;

function StatBars({ m }: { m: MatchDetail }) {
  const home = m.stats.find((s) => s.team_id === m.home.id);
  const away = m.stats.find((s) => s.team_id === m.away.id);
  return (
    <div className="space-y-5">
      {statRows.map(([key, label, unit]) => {
        const h = home?.[key] ?? null;
        const a = away?.[key] ?? null;
        if (h === null && a === null) return null;
        const total = (h ?? 0) + (a ?? 0);
        const share = total === 0 ? 50 : ((h ?? 0) / total) * 100;
        return (
          <div key={key}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-display text-xl font-extrabold tabular-nums text-forest">
                {h ?? "—"}
                {h !== null && unit}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
              <span className="font-display text-xl font-extrabold tabular-nums text-forest">
                {a ?? "—"}
                {a !== null && unit}
              </span>
            </div>
            <div className="mt-1.5 flex h-2 gap-1 overflow-hidden rounded-full">
              <span className="rounded-full bg-lime" style={{ width: `${share}%` }} />
              <span className="flex-1 rounded-full bg-forest/80" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Lineup({ team, players }: { team: Side; players: LineupPlayer[] }) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-forest">
        <TeamBadge url={team.club?.logo_url ?? null} name={team.name} size={26} />
        {team.name}
      </p>
      {players.length === 0 ? (
        <p className="text-sm text-muted">Lotul nu a fost completat.</p>
      ) : (
        <ul className="divide-y divide-line">
          {players.map((p) => {
            const contributions = [
              p.goals > 0 && `${p.goals > 1 ? `${p.goals}× ` : ""}⚽`,
              p.own_goals > 0 && "autogol",
              p.assists > 0 && `${p.assists > 1 ? `${p.assists}× ` : ""}👟`,
              p.yellow_cards > 0 && "🟨",
              p.red_cards > 0 && "🟥",
            ].filter(Boolean);
            return (
              <li key={p.player_id} className="flex items-center gap-3 py-2 text-sm">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest font-display text-sm font-extrabold text-lime">
                  {p.shirt_number ?? "–"}
                </span>
                <span className="min-w-0 flex-1">
                  <Link href={`/jucatori/${p.player_id}`} className="block truncate font-semibold text-forest hover:underline">
                    {p.first_name} {p.last_name}
                  </Link>
                  {p.position && <span className="text-xs text-muted">{positionLabels[p.position]}</span>}
                </span>
                {contributions.length > 0 && (
                  <span className="shrink-0 text-xs font-semibold text-forest">{contributions.join(" ")}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------ Echipele în campionat ------------------------------ */

const resultStyle = { V: "bg-pitch-600 text-white", E: "bg-muted/70 text-white", Î: "bg-danger text-white" } as const;

function TeamForm({
  m,
  team,
  standings,
  all,
}: {
  m: MatchDetail;
  team: Side;
  standings: Awaited<ReturnType<typeof getStandings>>;
  all: PublicMatch[];
}) {
  // Tabelul în care joacă echipa: întâi în faza meciului, apoi oriunde.
  const tables = [...standings].sort((a, b) => Number(b.id === m.stage_id) - Number(a.id === m.stage_id)).flatMap((s) => s.tables);
  const table = tables.find((t) => t.rows.some((r) => r.team_id === team.id));
  const row = table?.rows.find((r) => r.team_id === team.id);

  const results = all
    .filter((x) => x.status === "finished" && x.id !== m.id && (x.home.id === team.id || x.away.id === team.id))
    .sort((a, b) => (b.kickoff_at ?? "").localeCompare(a.kickoff_at ?? ""))
    .slice(0, 5);

  return (
    <section className="rounded-none border border-line bg-surface p-5 shadow-sm">
      <Link href={`/echipe/${team.id}`} className="flex items-center gap-3 font-display text-xl font-extrabold text-forest hover:underline">
        <TeamBadge url={team.club?.logo_url ?? null} name={team.name} size={36} />
        {team.name}
      </Link>

      {row ? (
        <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            ["Loc", `${row.position}`],
            ["Puncte", `${row.points}`],
            ["Meciuri", `${row.played}`],
            ["Goluri", `${row.goals_for}:${row.goals_against}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-paper px-1 py-2">
              <dd className="font-display text-xl font-extrabold tabular-nums text-forest">{value}</dd>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted">Echipa nu apare încă în clasament.</p>
      )}
      {table?.groupName && <p className="mt-2 text-xs text-muted">{table.groupName}</p>}

      {results.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {results.map((r) => {
            const home = r.home.id === team.id;
            const gf = (home ? r.home_score : r.away_score) ?? 0;
            const ga = (home ? r.away_score : r.home_score) ?? 0;
            const result = gf > ga ? "V" : gf === ga ? "E" : "Î";
            const opponent = home ? r.away : r.home;
            return (
              <li key={r.id}>
                <Link href={`/meciuri/${r.id}`} className="flex items-center gap-2 text-sm hover:underline">
                  <span className={`grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-extrabold ${resultStyle[result]}`}>
                    {result}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-forest">
                    {home ? "vs" : "la"} {opponent.name}
                  </span>
                  <span className="font-bold tabular-nums text-forest">
                    {r.home_score}–{r.away_score}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------ Alte meciuri din etapă ------------------------------ */

function OtherMatch({ match: o }: { match: PublicMatch }) {
  const hasScore = o.status === "finished" || o.status === "live";
  const rows = [
    { team: o.home, score: o.home_score },
    { team: o.away, score: o.away_score },
  ];
  return (
    <li>
      <Link
        href={`/meciuri/${o.id}`}
        className="block rounded-2xl border border-line bg-paper/40 p-3 text-sm transition hover:border-forest/30"
      >
        <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
          <span>{o.kickoff_at ? `${shortDate.format(new Date(o.kickoff_at))}, ${timeFormat.format(new Date(o.kickoff_at))}` : "Data nestabilită"}</span>
          {o.status === "live" && <span className="text-red-600">Live</span>}
          {o.status === "finished" && <span>Final</span>}
        </div>
        <ul className="space-y-1.5">
          {rows.map(({ team, score }) => (
            <li key={team.id} className="flex items-center gap-2.5">
              <TeamBadge url={team.club?.logo_url ?? null} name={team.name} size={24} />
              <span className="min-w-0 flex-1 truncate font-semibold text-forest">{team.name}</span>
              {hasScore && (
                <span className={`font-display text-lg font-extrabold tabular-nums ${o.status === "live" ? "text-red-600" : "text-forest"}`}>
                  {score}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Link>
    </li>
  );
}
