import type { Metadata } from "next";
import { Suspense } from "react";
import { ClubLogo } from "@/components/club-logo";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { PageHeader } from "@/components/page-header";
import { getCompetitions, getStandings, pickCompetition, type StandingsTable } from "@/lib/public-data";

export const metadata: Metadata = { title: "Clasament" };

export default function ClasamentPage({ searchParams }: PageProps<"/clasament">) {
  return (
    <>
      <PageHeader
        title="Clasament"
        description="Clasamentul fiecărei categorii de vârstă, calculat automat după fiecare rezultat."
      />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <Suspense fallback={<p className="text-muted">Se încarcă…</p>}>
          <Standings searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Standings({ searchParams }: { searchParams: PageProps<"/clasament">["searchParams"] }) {
  const { competitie } = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const stages = await getStandings(selected.id);
  const hasRows = stages.some((s) => s.tables.some((t) => t.rows.length > 0));

  return (
    <>
      <CompetitionPicker basePath="/clasament" competitions={competitions} selectedId={selected.id} />
      {!hasRows && <EmptyState>Clasamentul va apărea după ce sunt înscrise echipele.</EmptyState>}
      {stages.map((stage) => (
        <section key={stage.id} className="space-y-4">
          {stages.length > 1 && (
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide">{stage.name}</h2>
          )}
          {stage.tables.map((table) => (
            <StandingsTableView key={table.groupName ?? "all"} table={table} />
          ))}
        </section>
      ))}
    </>
  );
}

function StandingsTableView({ table }: { table: StandingsTable }) {
  if (table.rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[34rem] text-sm">
        <caption className="border-b border-line px-4 py-3 text-left font-display text-lg font-bold uppercase tracking-wide">
          {table.groupName ?? "Clasament general"}
        </caption>
        <thead className="text-xs uppercase tracking-wide text-muted">
          <tr className="border-b border-line">
            <th className="w-10 px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Echipa</th>
            <th className="px-2 py-2 text-center" title="Meciuri jucate">J</th>
            <th className="px-2 py-2 text-center" title="Victorii">V</th>
            <th className="px-2 py-2 text-center" title="Egaluri">E</th>
            <th className="px-2 py-2 text-center" title="Înfrângeri">Î</th>
            <th className="px-2 py-2 text-center" title="Goluri marcate : primite">G</th>
            <th className="px-2 py-2 text-center" title="Golaveraj">+/−</th>
            <th className="px-3 py-2 text-center" title="Puncte">P</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {table.rows.map((row) => (
            <tr key={row.team_id} className="border-b border-line last:border-0">
              <td className="px-3 py-2 font-semibold">{row.position}</td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-2 font-semibold">
                  <ClubLogo url={row.logo_url} size={28} />
                  {row.team_name}
                </span>
              </td>
              <td className="px-2 py-2 text-center">{row.played}</td>
              <td className="px-2 py-2 text-center">{row.won}</td>
              <td className="px-2 py-2 text-center">{row.drawn}</td>
              <td className="px-2 py-2 text-center">{row.lost}</td>
              <td className="px-2 py-2 text-center">
                {row.goals_for}:{row.goals_against}
              </td>
              <td className="px-2 py-2 text-center">
                {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
              </td>
              <td className="px-3 py-2 text-center text-base font-bold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
