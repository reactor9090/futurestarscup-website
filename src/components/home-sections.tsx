import { HomeLeaders } from "@/components/home-leaders";
import { HomeSchedule } from "@/components/home-schedule";
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
  afterSchedule,
}: {
  competition: PublicCompetition;
  competitions: PublicCompetition[];
  /** Se afișează chiar sub program (rezultatele recente). */
  afterSchedule?: React.ReactNode;
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
      {/* Programul (stânga) și, în dreapta, clasamentul Top 6 cu golgheterul dedesubt. */}
      <HomeSchedule
        competition={competition}
        competitions={competitions}
        matches={matches}
        standings={standings}
        topScorer={scorers[0]?.row}
      />
      {afterSchedule}
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
