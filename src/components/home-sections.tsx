import Link from "next/link";
import { TeamBadge } from "@/components/club-logo";
import { CompetitionPicker } from "@/components/competition-picker";
import { formatDay, MatchPanel, MatchRow } from "@/components/match-row";
import { LeaderCard } from "@/components/leader-card";
import { ArrowLink, EmptyState, PositionBadge, SectionHeader, signed, Stat } from "@/components/ui";
import { positionLabels } from "@/lib/labels";
import { rankPlayers } from "@/lib/player-ranking";
import {
  getMatches,
  getPlayerStats,
  getRecentResults,
  getStandings,
  type PlayerStatRow,
  type PublicCompetition,
  type StageStandings,
} from "@/lib/public-data";
import { currentRound, groupRounds } from "@/lib/rounds";

type Ranked = ReturnType<typeof rankPlayers>;

/* ------------------------------ Program și rezultate ------------------------------ */

function ScheduleSection({
  competition,
  competitions,
  matches,
  topScorer,
}: {
  competition: PublicCompetition;
  competitions: PublicCompetition[];
  matches: Awaited<ReturnType<typeof getMatches>>;
  topScorer: Ranked[number] | undefined;
}) {
  const round = currentRound(groupRounds(matches));
  const first = round?.matches[0];
  const subtitle = [first?.kickoff_at ? formatDay(first.kickoff_at) : null, first?.venue].filter(Boolean).join(" · ");

  return (
    <section id="program" className="scroll-mt-20">
      <SectionHeader eyebrow="Etapa curentă" title="Program și rezultate">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <CompetitionPicker basePath="/" competitions={competitions} selectedId={competition.id} />
          <ArrowLink href={`/meciuri?competitie=${competition.id}${round ? `&etapa=${round.key}` : ""}`}>
            Vezi programul complet
          </ArrowLink>
        </div>
      </SectionHeader>

      <div className={`mt-8 grid gap-5 ${topScorer ? "lg:grid-cols-[1fr_21rem]" : ""}`}>
        <MatchPanel>
          {round && first ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lime">{round.title}</p>
                  {subtitle && <p className="mt-1.5 text-sm text-white/55">{subtitle}</p>}
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70">
                  {round.matches.length} {round.matches.length === 1 ? "meci" : "meciuri"}
                </span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {round.matches.map((m) => (
                  <MatchRow key={m.id} match={m} />
                ))}
              </ul>
            </>
          ) : (
            <p className="py-10 text-center text-white/60">Programul meciurilor va fi publicat în curând.</p>
          )}
        </MatchPanel>

        {topScorer && <TopScorerCard competition={competition} player={topScorer.row} />}
      </div>
    </section>
  );
}

function TopScorerCard({ competition, player: p }: { competition: PublicCompetition; player: PlayerStatRow }) {
  return (
    <aside className="relative flex flex-col overflow-hidden rounded-3xl bg-lime p-6 text-forest sm:p-7">
      {p.shirt_number !== null && (
        <span
          className="pointer-events-none absolute -right-2 -top-6 select-none font-display text-[11rem] font-extrabold leading-none text-forest/10"
          aria-hidden
        >
          {p.shirt_number}
        </span>
      )}
      <span className="relative w-fit rounded-full bg-forest/10 px-3 py-1.5 text-[11px] font-bold">★ Golgheterul categoriei</span>
      <h3 className="relative mt-8 font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight">
        <Link href={`/jucatori/${p.player_id}`} className="hover:underline">
          {p.first_name}
          <br />
          {p.last_name}
        </Link>
      </h3>
      <p className="relative mt-3 text-sm text-forest/60">
        {p.team_name}
        {p.position && ` · ${positionLabels[p.position]}`}
      </p>
      <dl className="relative mt-auto grid grid-cols-3 gap-2 border-t border-forest/15 pt-5">
        <Stat label="Goluri" value={p.goals} />
        <Stat label="Pase" value={p.assists} />
        <Stat label="Meciuri" value={p.matches_played} />
      </dl>
      <div className="relative mt-6 flex flex-wrap gap-x-6 gap-y-2">
        <ArrowLink href={`/jucatori/${p.player_id}`} className="!text-forest">
          VEZI PROFILUL
        </ArrowLink>
        <ArrowLink href={`/golgheteri?competitie=${competition.id}`} className="!text-forest/60">
          Golgheteri
        </ArrowLink>
      </div>
    </aside>
  );
}

/* ------------------------------ Clasament ------------------------------ */

function StandingsSection({
  competition,
  competitions,
  stages,
}: {
  competition: PublicCompetition;
  competitions: PublicCompetition[];
  stages: StageStandings[];
}) {
  // Pe prima pagină: primul tabel cu echipe (la faza pe grupe, primul grup); restul e în pagina completă.
  const table = stages.flatMap((s) => s.tables).find((t) => t.rows.length > 0);
  const rows = table?.rows.slice(0, 6) ?? [];

  return (
    <section id="clasament" className="scroll-mt-20">
      <SectionHeader eyebrow="Situația la zi" title="Clasament">
        <CompetitionPicker basePath="/" competitions={competitions} selectedId={competition.id} />
      </SectionHeader>

      <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-surface">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-muted">Clasamentul va apărea după ce sunt înscrise echipele.</p>
        ) : (
          <table className="w-full text-sm">
            {table?.groupName && (
              <caption className="border-b border-line px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-pitch-700">
                {table.groupName}
              </caption>
            )}
            <thead className="bg-paper/60 text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr className="border-b border-line">
                <th className="w-14 px-4 py-3.5 text-left sm:w-16 sm:px-5">#</th>
                <th className="py-3.5 text-left">Echipă</th>
                <th className="w-12 py-3.5 text-center sm:w-14">J</th>
                <th className="w-14 py-3.5 text-center sm:w-16">+/−</th>
                <th className="w-16 px-4 py-3.5 text-right sm:w-20 sm:px-5">Pct</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.team_id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3.5 sm:px-5">
                    <PositionBadge position={r.position} highlight={r.position <= 2} />
                  </td>
                  <td className="py-3">
                    <Link href={`/echipe/${r.team_id}`} className="flex items-center gap-3 font-bold text-forest hover:text-pitch-700">
                      <TeamBadge url={r.logo_url} name={r.team_name} size={34} />
                      <span className="truncate">{r.team_name}</span>
                    </Link>
                  </td>
                  <td className="py-3.5 text-center text-muted">{r.played}</td>
                  <td className="py-3.5 text-center text-muted">{signed(r.goal_difference)}</td>
                  <td className="px-4 py-3.5 text-right text-base font-extrabold text-forest sm:px-5">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Link
          href={`/clasament?competitie=${competition.id}`}
          className="flex items-center justify-center gap-2 border-t border-line py-4 text-xs font-bold uppercase tracking-wider text-pitch-800 hover:bg-paper/60"
        >
          Clasamentul complet <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------ Golgheteri ------------------------------ */


function LeadersSection({
  competition,
  competitions,
  scorers,
  assisters,
}: {
  competition: PublicCompetition;
  competitions: PublicCompetition[];
  scorers: Ranked;
  assisters: Ranked;
}) {
  return (
    <section id="golgheteri" className="scroll-mt-20">
      <SectionHeader eyebrow="Top jucători" title="Golgheteri">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <CompetitionPicker basePath="/" competitions={competitions} selectedId={competition.id} />
          <ArrowLink href={`/golgheteri?competitie=${competition.id}`}>Vezi clasamentul complet</ArrowLink>
        </div>
      </SectionHeader>
      {scorers.length === 0 && assisters.length === 0 ? (
        <div className="mt-8">
          <EmptyState>Golgheterii vor apărea după primele goluri înregistrate.</EmptyState>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {scorers.length > 0 && <LeaderCard title="Marcatori" valueLabel="Goluri" rows={scorers.slice(0, 5)} value={(p) => p.goals} />}
          {assisters.length > 0 && (
            <LeaderCard title="Pase decisive" valueLabel="Pase" rows={assisters.slice(0, 5)} value={(p) => p.assists} />
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------ Rezultate recente ------------------------------ */

/** Ultimele scoruri din toate categoriile; nu depinde de categoria aleasă. */
export async function RecentResults() {
  const results = await getRecentResults(8);
  if (results.length === 0) return null;

  return (
    <section>
      <SectionHeader eyebrow="Ultimele scoruri" title="Rezultate">
        <ArrowLink href="/meciuri">Toate meciurile</ArrowLink>
      </SectionHeader>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {results.map((m) => {
          const homeWon = (m.home_score ?? 0) > (m.away_score ?? 0);
          const awayWon = (m.away_score ?? 0) > (m.home_score ?? 0);
          return (
            <li key={m.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-bold uppercase tracking-wider text-muted">
                  {m.competition.name}
                  {m.round ? ` · Etapa ${m.round}` : m.round_label ? ` · ${m.round_label}` : ""}
                </span>
                <span className="shrink-0 rounded-md bg-lime px-2 py-0.5 text-[10px] font-extrabold text-forest">FINAL</span>
              </div>
              {(
                [
                  [m.home, m.home_score, homeWon],
                  [m.away, m.away_score, awayWon],
                ] as const
              ).map(([team, score, won]) => (
                <Link
                  key={team.id}
                  href={`/echipe/${team.id}`}
                  className={`mt-3 flex items-center gap-3 ${won ? "text-forest" : "text-muted"} hover:text-pitch-700`}
                >
                  <TeamBadge url={team.club?.logo_url ?? null} name={team.name} size={28} />
                  <span className={`min-w-0 flex-1 truncate text-sm ${won ? "font-bold" : "font-medium"}`}>{team.name}</span>
                  <span className="font-display text-2xl font-extrabold tabular-nums">{score}</span>
                </Link>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------ Ansamblu ------------------------------ */

export async function HomeCompetitionSections({
  competition,
  competitions,
}: {
  competition: PublicCompetition;
  competitions: PublicCompetition[];
}) {
  const [matches, stats, standings] = await Promise.all([
    getMatches(competition.id),
    getPlayerStats(competition.id),
    getStandings(competition.id),
  ]);
  const scorers = rankPlayers(stats, "goals");
  const assisters = rankPlayers(stats, "assists");

  return (
    <>
      <ScheduleSection competition={competition} competitions={competitions} matches={matches} topScorer={scorers[0]} />
      <StandingsSection competition={competition} competitions={competitions} stages={standings} />
      <LeadersSection competition={competition} competitions={competitions} scorers={scorers} assisters={assisters} />
    </>
  );
}
