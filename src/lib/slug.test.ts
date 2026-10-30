import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("transformă sezonul și categoria în slug", () => {
    expect(slugify("2026/2027")).toBe("2026-2027");
    expect(slugify("U12")).toBe("u12");
  });

  it("elimină diacriticele românești", () => {
    expect(slugify("Viitorul Chișinău")).toBe("viitorul-chisinau");
    expect(slugify("Ștefan cel Mare, Țânțari și Hîncești")).toBe("stefan-cel-mare-tantari-si-hincesti");
  });

  it("nu lasă cratime la capete", () => {
    expect(slugify("  --U 14--  ")).toBe("u-14");
    expect(slugify("???")).toBe("");
  });
});
