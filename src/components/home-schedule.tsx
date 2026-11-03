import Image from "next/image";
import Link from "next/link";
import { initials, TeamBadge } from "@/components/club-logo";
import { CompetitionPicker } from "@/components/competition-picker";
import { formatDay } from "@/components/match-row";
import { Icon, icons } from "@/components/icons";
import { signed } from "@/components/ui";
import { positionLabels } from "@/lib/labels";
import type { PlayerCardRow, PublicCompetition, PublicMatch, StageStandings } from "@/lib/public-data";
import { currentRound, groupRounds } from "@/lib/rounds";

// Secțiunea „Program și rezultate” de pe prima pagină: etapa curentă în stânga, iar în dreapta
// clasamentul (Top 6) și, sub el, golgheterul categoriei. Fundal verde închis, pe toată lățimea paginii.

const TZ = "Europe/Bucharest";
const timeFormat = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const shortDate = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });

/* ------------------------------ Meciuri ------------------------------ */

function StatusChip({ match: m, next }: { match: PublicMatch; next: boolean }) {
  const chip = "rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider";
  if (m.status === "live") {
    return (
      <span className={`${chip} flex items-center gap-1 bg-red-600 text-white`}>
        <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
        Live
      </span>
    );
  }
  if (m.status === "finished") return <span className={`${chip} bg-white/10 text-white/70`}>Final</span>;
  if (m.status === "postponed") return <span className={`${chip} bg-gold-100 text-ink`}>Amânat</span>;
  if (m.status === "cancelled") return <span className={`${chip} bg-gold-100 text-ink`}>Anulat</span>;
  return <span className={`${chip} ${next ? "bg-lime/15 text-lime" : "bg-white/5 text-white/50"}`}>Urmează</span>;
}

function TeamCell({ team, side }: { team: PublicMatch["home"]; side: "home" | "away" }) {
  const logo = team.club?.logo_url ?? null;
  // Gazdele sunt oglindite (insigna lângă VS, numele aliniat la dreapta), ca distanța până la VS să fie egală.
  const mirrored = side === "home";
  return (
    <Link
      href={`/echipe/${team.id}`}
      className={`group relative z-10 flex min-w-0 flex-col items-center gap-1.5 text-center sm:gap-3 ${
        mirrored ? "sm:flex-row-reverse sm:text-right" : "sm:flex-row sm:text-left"
      }`}
    >
      <TeamBadge url={logo} name={team.name} size={38} tone="dark" />
      <span className="min-w-0">
        <span className="line-clamp-2 text-sm font-bold leading-tight text-white group-hover:text-lime">{team.name}</span>
        {/* Inițialele, ca pe tabela de marcaj; fără logo, ele sunt deja în insignă. */}
        {logo && (
          <span className="mt-1 inline-block rounded bg-white/10 px-1.5 py-px text-[10px] font-bold text-white/60">
            {initials(team.name)}
          </span>
        )}
      </span>
    </Link>
  );
}

function MatchCard({
  match: m,
  next,
  showDate,
  showVenue,
}: {
  match: PublicMatch;
  next: boolean;
  showDate: boolean;
  showVenue: boolean;
}) {
  const hasScore = m.status === "finished" || m.status === "live";
  const penalties =
    m.status === "finished" && m.home_penalties !== null && m.away_penalties !== null
      ? `${m.home_penalties}–${m.away_penalties} pen.`
      : null;

  return (
    <li className="group/card relative grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-4 rounded-2xl border border-white/10 bg-forest-soft/50 p-4 transition hover:border-lime/30 sm:grid-cols-[5rem_1fr_4.25rem_1fr] sm:gap-x-3 sm:px-4 sm:py-3.5">
      {/* Ora și starea */}
      <div className="col-span-3 flex items-center justify-between gap-2 border-b border-white/10 pb-3 sm:col-span-1 sm:flex-col sm:items-start sm:gap-1.5 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
        <div>
          {showDate && m.kickoff_at && (
            <p className="text-[11px] font-semibold text-white/50">{shortDate.format(new Date(m.kickoff_at))}</p>
          )}
          <p className="font-display text-2xl font-extrabold tabular-nums leading-none text-white">
            {m.kickoff_at ? timeFormat.format(new Date(m.kickoff_at)) : "—"}
          </p>
          {showVenue && m.venue && <p className="mt-1 truncate text-[11px] text-white/45">{m.venue}</p>}
        </div>
        <StatusChip match={m} next={next} />
      </div>

      <TeamCell team={m.home} side="home" />

      {/* Centru: VS sau scorul, pe un panou înclinat */}
      <div className="relative flex h-full min-h-12 items-center justify-center">
        <span className="absolute inset-y-0 inset-x-1 -skew-x-12 rounded-lg bg-white/5" aria-hidden />
        <span className="relative text-center">
          {hasScore ? (
            <span
              className={`block font-display text-2xl font-extrabold tabular-nums ${m.status === "live" ? "text-red-400" : "text-white"}`}
            >
              {m.home_score}–{m.away_score}
            </span>
          ) : (
            <span className="block font-display text-2xl font-extrabold italic text-lime">VS</span>
          )}
          {penalties && <span className="block text-[10px] text-white/50">{penalties}</span>}
        </span>
      </div>

      <TeamCell team={m.away} side="away" />

      {/* Tot cardul duce la pagina meciului; link-urile echipelor stau deasupra (z-10). */}
      <Link href={`/meciuri/${m.id}`} aria-label={`Pagina meciului ${m.home.name} – ${m.away.name}`} className="absolute inset-0 rounded-2xl" />
    </li>
  );
}

/* ------------------------------ Clasament (Top 6) ------------------------------ */

function MiniStandings({
  rows,
  groupName,
  href,
}: {
  rows: StageStandings["tables"][number]["rows"];
  groupName: string | null;
  href: string;
}) {
  return (
    <div className="relative rounded-none border border-white/10 bg-white/[0.03] p-5">
      {/* Tot cardul duce la clasamentul complet; rândurile echipelor stau deasupra (z-10). */}
      <Link href={href} aria-label="Vezi clasamentul complet" className="absolute inset-0" />
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-3xl font-extrabold leading-none tracking-tight text-white">Top {rows.length}</h3>
        {groupName && <span className="text-xs font-bold uppercase tracking-wider text-lime">{groupName}</span>}
      </div>

      <div className="mt-4 grid grid-cols-[1.75rem_1fr_2.5rem_2.5rem] items-center gap-x-3 px-3 text-[10px] font-bold uppercase tracking-wider text-white/45">
        <span>#</span>
        <span>Echipă</span>
        <span className="text-right" title="Golaveraj">+/−</span>
        <span className="text-right" title="Puncte">Pct</span>
      </div>

      <ol className="mt-2 space-y-1.5">
        {rows.map((r) => {
          const leader = r.position === 1 && r.played > 0;
          return (
            <li key={r.team_id}>
              <Link
                href={`/echipe/${r.team_id}`}
                className={`relative z-10 grid grid-cols-[1.75rem_1fr_2.5rem_2.5rem] items-center gap-x-3 rounded-md px-3 py-2 transition ${
                  leader ? "bg-lime text-forest" : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                <span className="font-display text-lg font-extrabold tabular-nums">{r.position}</span>
                <span className="flex min-w-0 items-center gap-2.5">
                  <TeamBadge url={r.logo_url} name={r.team_name} size={26} tone="dark" />
                  <span className="truncate text-sm font-bold">{r.team_name}</span>
                </span>
                <span className={`text-right text-xs tabular-nums ${leader ? "text-forest/70" : "text-white/55"}`}>
                  {signed(r.goal_difference)}
                </span>
                <span className="text-right font-display text-xl font-extrabold tabular-nums">{r.points}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      <Link
        href={href}
        className="relative z-10 mt-4 flex items-center justify-center gap-2 rounded-sm border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:border-lime hover:text-lime"
      >
        Tot clasamentul
        <Icon d={icons.arrow} />
      </Link>
    </div>
  );
}

/* ------------------------------ Golgheterul ------------------------------ */

function TopScorerCard({ competition, player: p }: { competition: PublicCompetition; player: PlayerCardRow }) {
  const average = p.matches_played > 0 ? (p.goals / p.matches_played).toFixed(1).replace(".", ",") : "0";
  const stats = [
    { label: "Goluri", value: p.goals, icon: icons.ball },
    { label: "Pase", value: p.assists, icon: icons.boot },
    { label: "Meciuri", value: p.matches_played, icon: icons.shirt },
    { label: "Pe meci", value: average, icon: icons.chart },
  ];

  return (
    <aside className="relative flex flex-col overflow-hidden rounded-none border border-lime/25 bg-gradient-to-br from-forest-soft via-forest to-forest p-6 sm:p-7">
      {/* Tot cardul duce la profilul jucătorului; butonul de jos stă deasupra (z-10). */}
      <Link href={`/jucatori/${p.player_id}`} aria-label={`Profilul lui ${p.first_name} ${p.last_name}`} className="absolute inset-0" />
      <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-lime/15 blur-3xl" aria-hidden />

      {/* Poza (doar cu acord) sau numărul tricoului, în dreapta sus */}
      {p.photo_url ? (
        <div className="pointer-events-none absolute right-0 top-0 h-60 w-1/2 [mask-image:linear-gradient(to_bottom,black_55%,transparent),linear-gradient(to_left,black_60%,transparent)] [mask-composite:intersect]">
          <Image src={p.photo_url} alt="" fill sizes="240px" className="object-cover object-top" />
        </div>
      ) : (
        p.shirt_number !== null && (
          <span
            className="pointer-events-none absolute -top-4 right-2 select-none font-display text-[11rem] font-extrabold leading-none text-lime/10"
            aria-hidden
          >
            {p.shirt_number}
          </span>
        )
      )}

      <span className="pointer-events-none relative flex w-fit items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-[11px] font-bold text-forest">
        <Icon d={icons.star} className="size-3.5 fill-current" />
        Golgheterul categoriei
      </span>

      <h3 className="pointer-events-none relative mt-6 max-w-[65%] font-display text-4xl font-extrabold uppercase leading-[0.92] tracking-tight">
        <span className="block text-white">{p.first_name}</span>
        <span className="block text-lime">{p.last_name}</span>
      </h3>
      <p className="pointer-events-none relative mt-3 text-sm text-white/60">
        {p.team_name}
        {p.position && ` · ${positionLabels[p.position]}`}
      </p>

      <dl className="pointer-events-none relative mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-center">
            <Icon d={s.icon} className="size-5 text-lime" />
            <dd className="mt-1.5 font-display text-2xl font-extrabold tabular-nums leading-none text-white">{s.value}</dd>
            <dt className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/50">{s.label}</dt>
          </div>
        ))}
      </dl>

      <Link
        href={`/golgheteri?competitie=${competition.id}`}
        className="relative z-10 mt-5 flex items-center justify-center gap-2 rounded-xl bg-lime px-5 py-3.5 text-sm font-bold text-forest transition hover:brightness-95"
      >
        Vezi toți golgheterii
        <Icon d={icons.arrow} />
      </Link>
    </aside>
  );
}

/* ------------------------------ Secțiunea ------------------------------ */

export function HomeSchedule({
  competition,
  competitions,
  matches,
  standings,
  topScorer,
}: {
  competition: PublicCompetition;
  competitions: PublicCompetition[];
  matches: PublicMatch[];
  standings: StageStandings[];
  topScorer: PlayerCardRow | undefined;
}) {
  const round = currentRound(groupRounds(matches));
  const list = round?.matches ?? [];
  const days = new Set(list.map((m) => (m.kickoff_at ? formatDay(m.kickoff_at) : "")));
  const venues = new Set(list.map((m) => m.venue ?? ""));
  const firstDay = list[0]?.kickoff_at ? formatDay(list[0].kickoff_at) : null;
  const venue = venues.size === 1 ? list[0]?.venue : venues.size > 1 ? "Mai multe terenuri" : null;
  const nextId = list.find((m) => m.status === "scheduled")?.id;
  const fullHref = `/meciuri?competitie=${competition.id}${round ? `&etapa=${round.key}` : ""}`;
  // Primul tabel cu echipe (la faza pe grupe, primul grup); clasamentul complet e în /clasament.
  const table = standings.flatMap((s) => s.tables).find((t) => t.rows.length > 0);
  const topRows = table?.rows.slice(0, 6) ?? [];
  const hasSidebar = topRows.length > 0 || Boolean(topScorer);

  return (
    <section id="program" className="relative scroll-mt-16 overflow-hidden bg-forest">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_0%,color-mix(in_oklab,var(--color-lime)_18%,transparent),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <div>
            <h2 className="font-display text-5xl font-extrabold leading-none tracking-tight text-white sm:text-6xl">
              Programul meciurilor
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CompetitionPicker basePath="/" competitions={competitions} selectedId={competition.id} tone="dark" />
            <Link
              href={fullHref}
              className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white transition hover:border-lime hover:text-lime"
            >
              <Icon d={icons.calendar} className="size-4 text-lime" />
              Vezi programul complet
              <Icon d={icons.arrow} />
            </Link>
          </div>
        </div>

        <div className={`mt-10 grid gap-5 ${hasSidebar ? "lg:grid-cols-[1fr_24rem]" : ""}`}>
          <div className="relative overflow-hidden rounded-none border border-white/10 bg-white/[0.03] p-4 sm:p-7">
            <span className="absolute left-0 top-8 h-24 w-1 rounded-r-full bg-lime" aria-hidden />
            {round ? (
              <>
                <div className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-lime/70 text-lime">
                    <Icon d={icons.calendarDots} className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-3xl font-extrabold leading-none tracking-tight text-white">
                      {round.title}
                    </h3>
                    <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/60">
                      {firstDay && (
                        <span className="flex items-center gap-1.5">
                          <Icon d={icons.calendar} />
                          {firstDay}
                          {days.size > 1 && " și altele"}
                        </span>
                      )}
                      {venue && (
                        <span className="flex items-center gap-1.5">
                          <Icon d={icons.pin} />
                          {venue}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Icon d={icons.board} />
                        {list.length} {list.length === 1 ? "meci" : "meciuri"}
                      </span>
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {list.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      next={m.id === nextId}
                      showDate={days.size > 1}
                      showVenue={venues.size > 1}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <p className="py-12 text-center text-white/60">Programul meciurilor va fi publicat în curând.</p>
            )}
          </div>

          {hasSidebar && (
            <div className="space-y-5">
              {topRows.length > 0 && (
                <MiniStandings
                  rows={topRows}
                  groupName={table?.groupName ?? null}
                  href={`/clasament?competitie=${competition.id}`}
                />
              )}
              {topScorer && <TopScorerCard competition={competition} player={topScorer} />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
