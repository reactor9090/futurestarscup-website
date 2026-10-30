import type { Metadata } from "next";
import { Suspense } from "react";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { PageHeader } from "@/components/page-header";
import { getCompetitions, getPlayerStats, pickCompetition, type PlayerStatRow } from "@/lib/public-data";

export const metadata: Metadata = { title: "Golgheteri" };

export default function GolgheteriPage({ searchParams }: PageProps<"/golgheteri">) {
  return (
    <>
      <PageHeader title="Golgheteri" description="Cei mai buni marcatori și pasatori ai fiecărei categorii." />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <Suspense fallback={<p className="text-muted">Se încarcă…</p>}>
          <TopScorers searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

const byName = (a: PlayerStatRow, b: PlayerStatRow) =>
  a.last_name.localeCompare(b.last_name, "ro") || a.first_name.localeCompare(b.first_name, "ro");

/** Locuri cu egalitate: jucătorii cu aceeași valoare împart poziția. */
function ranked(rows: PlayerStatRow[], key: "goals" | "assists") {
  return rows.map((row) => ({ row, position: rows.findIndex((r) => r[key] === row[key]) + 1 }));
}

async function TopScorers({ searchParams }: { searchParams: PageProps<"/golgheteri">["searchParams"] }) {
  const { competitie } = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const stats = await getPlayerStats(selected.id);
  const scorers = stats
    .filter((p) => p.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.matches_played - b.matches_played || byName(a, b));
  const assisters = stats
    .filter((p) => p.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.matches_played - b.matches_played || byName(a, b));

  return (
    <>
      <CompetitionPicker basePath="/golgheteri" competitions={competitions} selectedId={selected.id} />
      {scorers.length === 0 && assisters.length === 0 ? (
        <EmptyState>Golgheterii vor apărea după primele goluri înregistrate.</EmptyState>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <Leaderboard title="Golgheteri" valueLabel="Goluri" rows={ranked(scorers, "goals")} value={(p) => p.goals} />
          <Leaderboard
            title="Pase decisive"
            valueLabel="Assisturi"
            rows={ranked(assisters, "assists")}
            value={(p) => p.assists}
          />
        </div>
      )}
    </>
  );
}

function Leaderboard({
  title,
  valueLabel,
  rows,
  value,
}: {
  title: string;
  valueLabel: string;
  rows: { row: PlayerStatRow; position: number }[];
  value: (p: PlayerStatRow) => number;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-sm">
        <caption className="border-b border-line px-4 py-3 text-left font-display text-lg font-bold uppercase tracking-wide">
          {title}
        </caption>
        <thead className="text-xs uppercase tracking-wide text-muted">
          <tr className="border-b border-line">
            <th className="w-10 px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Jucător</th>
            <th className="px-2 py-2 text-center" title="Meciuri jucate">J</th>
            <th className="px-3 py-2 text-center">{valueLabel}</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map(({ row, position }) => (
            <tr key={row.player_id + row.team_id} className="border-b border-line last:border-0">
              <td className="px-3 py-2 font-semibold">{position}</td>
              <td className="px-3 py-2">
                <span className="font-semibold">
                  {row.first_name} {row.last_name}
                </span>
                <span className="block text-xs text-muted">{row.team_name}</span>
              </td>
              <td className="px-2 py-2 text-center">{row.matches_played}</td>
              <td className="px-3 py-2 text-center text-base font-bold">{value(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
