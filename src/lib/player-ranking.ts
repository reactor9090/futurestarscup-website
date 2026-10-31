import type { PlayerStatRow } from "@/lib/public-data";

const byName = (a: PlayerStatRow, b: PlayerStatRow) =>
  a.last_name.localeCompare(b.last_name, "ro") || a.first_name.localeCompare(b.first_name, "ro");

/** Jucătorii cu cel puțin o unitate din `key`, ordonați; cei cu aceeași valoare împart poziția. */
export function rankPlayers<T extends PlayerStatRow>(stats: T[], key: "goals" | "assists") {
  const other = key === "goals" ? "assists" : "goals";
  const rows = stats
    .filter((p) => p[key] > 0)
    .sort((a, b) => b[key] - a[key] || b[other] - a[other] || a.matches_played - b.matches_played || byName(a, b));
  return rows.map((row) => ({ row, position: rows.findIndex((r) => r[key] === row[key]) + 1 }));
}
