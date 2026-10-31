import { describe, expect, it } from "vitest";
import { teamForm } from "./form";

const match = (home: string, away: string, hs: number, as: number, day: number) => ({
  home_team_id: home,
  away_team_id: away,
  home_score: hs,
  away_score: as,
  kickoff_at: `2026-11-${String(day).padStart(2, "0")}T10:00:00Z`,
});

describe("teamForm", () => {
  it("dă V/E/Î din perspectiva echipei, de la cel mai vechi la cel mai recent", () => {
    const matches = [match("A", "B", 1, 1, 3), match("C", "A", 0, 2, 1), match("A", "C", 0, 1, 2)];
    expect(teamForm(matches, "A")).toEqual(["V", "Î", "E"]);
  });

  it("păstrează doar ultimele meciuri și ignoră meciurile altor echipe", () => {
    const matches = [1, 2, 3, 4, 5, 6].map((d) => match("A", "B", d, 3, d));
    matches.push(match("B", "C", 9, 0, 7));
    expect(teamForm(matches, "A")).toEqual(["Î", "E", "V", "V", "V"]);
    expect(teamForm(matches, "A", 2)).toEqual(["V", "V"]);
  });
});
