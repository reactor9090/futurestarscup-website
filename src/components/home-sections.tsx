import { HomeLeaders } from "@/components/home-leaders";
import { HomeSchedule } from "@/components/home-schedule";
import { HomeStandings } from "@/components/home-standings";
import { rankPlayers } from "@/lib/player-ranking";
import {
  getMatches,
  getPlayerStats,
  getStandings,
  type PublicCompetition,
} from "@/lib/public-data";

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
      {/* Programul și golgheterii ocupă toată lățimea (fundal închis); clasamentul stă între ele, pe fundal deschis. */}
      <HomeSchedule competition={competition} competitions={competitions} matches={matches} topScorer={scorers[0]?.row} />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <HomeStandings competition={competition} competitions={competitions} stages={standings} matches={matches} />
      </div>
      <HomeLeaders
        competition={competition}
        competitions={competitions}
        stats={stats}
        scorers={scorers}
        assisters={assisters}
        matches={matches}
      />
    </>
  );
}
