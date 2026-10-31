import { describe, expect, it } from "vitest";
import { currentRound, groupRounds } from "./rounds";

type Status = "scheduled" | "finished" | "postponed" | "cancelled";
const match = (round: number | null, status: Status, stage = 0, label: string | null = null) => ({
  round,
  round_label: label,
  status,
  stage: { name: `Faza ${stage}`, sort_order: stage },
});

describe("groupRounds", () => {
  it("grupează pe etape, fazele în ordinea lor", () => {
    const rounds = groupRounds([
      match(null, "scheduled", 1, "Finală"),
      match(1, "finished"),
      match(2, "scheduled"),
      match(1, "finished"),
    ]);
    expect(rounds.map((r) => [r.key, r.title, r.matches.length])).toEqual([
      ["0-1", "Etapa 1", 2],
      ["0-2", "Etapa 2", 1],
      ["1-finala", "Finală", 1],
    ]);
  });
});

describe("currentRound", () => {
  it("alege prima etapă cu meciuri de jucat", () => {
    const rounds = groupRounds([match(1, "finished"), match(2, "scheduled"), match(3, "scheduled")]);
    expect(currentRound(rounds)?.key).toBe("0-2");
  });

  it("alege ultima etapă când totul s-a jucat, null fără meciuri", () => {
    expect(currentRound(groupRounds([match(1, "finished"), match(2, "finished")]))?.key).toBe("0-2");
    expect(currentRound([])).toBeNull();
  });
});
