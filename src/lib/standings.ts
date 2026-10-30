// Ordinea finală în clasament (F2).
// View-ul SQL `standings` calculează punctele și golurile; aici aplicăm departajarea:
//   1. puncte  2. golaveraj  3. goluri marcate
//   4. întâlniri directe între echipele încă egale (puncte → golaveraj → goluri marcate)
//   5. alfabetic

export type StandingRow = {
  team_id: string;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

export type FinishedMatch = {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
};

export type RankedRow<T extends StandingRow> = T & { position: number };

type MiniStats = { points: number; goalDifference: number; goalsFor: number };

function headToHead(teamIds: string[], matches: FinishedMatch[]): Map<string, MiniStats> {
  const ids = new Set(teamIds);
  const stats = new Map<string, MiniStats>(
    teamIds.map((id) => [id, { points: 0, goalDifference: 0, goalsFor: 0 }]),
  );

  for (const m of matches) {
    if (!ids.has(m.home_team_id) || !ids.has(m.away_team_id)) continue;
    const home = stats.get(m.home_team_id)!;
    const away = stats.get(m.away_team_id)!;
    home.goalsFor += m.home_score;
    away.goalsFor += m.away_score;
    home.goalDifference += m.home_score - m.away_score;
    away.goalDifference += m.away_score - m.home_score;
    if (m.home_score > m.away_score) home.points += 3;
    else if (m.home_score < m.away_score) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }
  return stats;
}

const byName = (a: StandingRow, b: StandingRow) =>
  a.team_name.localeCompare(b.team_name, "ro", { sensitivity: "base" });

export function rankStandings<T extends StandingRow>(
  rows: T[],
  matches: FinishedMatch[],
): RankedRow<T>[] {
  const sorted = [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goal_difference - a.goal_difference ||
      b.goals_for - a.goals_for,
  );

  const result: T[] = [];
  let i = 0;
  while (i < sorted.length) {
    // grup de echipe egale la puncte, golaveraj și goluri marcate
    let j = i + 1;
    while (
      j < sorted.length &&
      sorted[j].points === sorted[i].points &&
      sorted[j].goal_difference === sorted[i].goal_difference &&
      sorted[j].goals_for === sorted[i].goals_for
    ) {
      j++;
    }

    const tied = sorted.slice(i, j);
    if (tied.length > 1) {
      const h2h = headToHead(
        tied.map((r) => r.team_id),
        matches,
      );
      tied.sort((a, b) => {
        const x = h2h.get(a.team_id)!;
        const y = h2h.get(b.team_id)!;
        return (
          y.points - x.points ||
          y.goalDifference - x.goalDifference ||
          y.goalsFor - x.goalsFor ||
          byName(a, b)
        );
      });
    }
    result.push(...tied);
    i = j;
  }

  return result.map((row, index) => ({ ...row, position: index + 1 }));
}
