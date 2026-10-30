import { describe, expect, it } from "vitest";
import { rankStandings, type FinishedMatch, type StandingRow } from "./standings";

function row(team_id: string, points: number, gd: number, gf: number): StandingRow {
  return {
    team_id,
    team_name: team_id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goals_for: gf,
    goals_against: gf - gd,
    goal_difference: gd,
    points,
  };
}

const order = (rows: { team_id: string }[]) => rows.map((r) => r.team_id);

describe("rankStandings", () => {
  it("sortează după puncte", () => {
    const ranked = rankStandings([row("A", 3, 0, 0), row("B", 6, 0, 0), row("C", 1, 0, 0)], []);
    expect(order(ranked)).toEqual(["B", "A", "C"]);
    expect(ranked.map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it("la puncte egale decide golaverajul, apoi golurile marcate", () => {
    const ranked = rankStandings(
      [row("A", 6, 2, 5), row("B", 6, 4, 6), row("C", 6, 2, 8)],
      [],
    );
    expect(order(ranked)).toEqual(["B", "C", "A"]);
  });

  it("la egalitate totală decide meciul direct", () => {
    const matches: FinishedMatch[] = [
      { home_team_id: "Z", away_team_id: "A", home_score: 2, away_score: 1 },
    ];
    const ranked = rankStandings([row("A", 4, 1, 3), row("Z", 4, 1, 3)], matches);
    expect(order(ranked)).toEqual(["Z", "A"]);
  });

  it("meciurile cu echipe din afara grupului egal nu contează la întâlniri directe", () => {
    const matches: FinishedMatch[] = [
      { home_team_id: "A", away_team_id: "X", home_score: 9, away_score: 0 },
      { home_team_id: "A", away_team_id: "B", home_score: 0, away_score: 1 },
    ];
    const ranked = rankStandings([row("A", 3, 8, 9), row("B", 3, 8, 9)], matches);
    expect(order(ranked)).toEqual(["B", "A"]);
  });

  it("întâlniri directe între 3 echipe (mini-clasament)", () => {
    const matches: FinishedMatch[] = [
      { home_team_id: "A", away_team_id: "B", home_score: 1, away_score: 0 },
      { home_team_id: "B", away_team_id: "C", home_score: 3, away_score: 0 },
      { home_team_id: "C", away_team_id: "A", home_score: 1, away_score: 0 },
    ];
    // toți au 3p între ei; golaveraj direct: B +2, A 0, C -2
    const ranked = rankStandings(
      [row("A", 3, 0, 1), row("B", 3, 0, 1), row("C", 3, 0, 1)].map((r) => ({ ...r })),
      matches,
    );
    expect(order(ranked)).toEqual(["B", "A", "C"]);
  });

  it("fără meci direct decide ordinea alfabetică (cu diacritice)", () => {
    const ranked = rankStandings([row("Ștefan", 0, 0, 0), row("Sporting", 0, 0, 0), row("Academia", 0, 0, 0)], []);
    expect(order(ranked)).toEqual(["Academia", "Sporting", "Ștefan"]);
  });
});
