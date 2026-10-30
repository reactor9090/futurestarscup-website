import { describe, expect, it } from "vitest";
import { fromLocalInput, toLocalInput } from "./datetime";

describe("ora României", () => {
  it("vara (UTC+3)", () => {
    expect(fromLocalInput("2026-07-15T14:30")).toBe("2026-07-15T11:30:00.000Z");
  });

  it("iarna (UTC+2)", () => {
    expect(fromLocalInput("2026-12-15T14:30")).toBe("2026-12-15T12:30:00.000Z");
  });

  it("dus-întors", () => {
    for (const v of ["2026-03-29T10:00", "2026-10-25T10:00", "2026-10-30T18:45"]) {
      expect(toLocalInput(fromLocalInput(v))).toBe(v);
    }
  });

  it("valori goale sau invalide", () => {
    expect(fromLocalInput("")).toBeNull();
    expect(fromLocalInput("mâine")).toBeNull();
    expect(toLocalInput(null)).toBe("");
  });
});
