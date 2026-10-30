import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { PageHeader } from "@/components/page-header";
import { positionLabels } from "@/lib/labels";
import { getCompetitions, getPlayerStats, pickCompetition } from "@/lib/public-data";

export const metadata: Metadata = { title: "Jucători" };

export default function JucatoriPage({ searchParams }: PageProps<"/jucatori">) {
  return (
    <>
      <PageHeader title="Jucători" description="Jucătorii fiecărei categorii și statisticile lor." />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
        <Suspense fallback={<p className="text-muted">Se încarcă…</p>}>
          <Players searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

// Fără diacritice și fără diferențe de majuscule, ca „stefan” să găsească „Ștefan”.
const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

async function Players({ searchParams }: { searchParams: PageProps<"/jucatori">["searchParams"] }) {
  const { competitie, q } = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;

  const search = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  const needle = normalize(search);
  const players = (await getPlayerStats(selected.id))
    .filter((p) => !needle || normalize(`${p.first_name} ${p.last_name} ${p.team_name}`).includes(needle))
    .sort(
      (a, b) =>
        a.last_name.localeCompare(b.last_name, "ro") ||
        a.first_name.localeCompare(b.first_name, "ro"),
    );

  return (
    <>
      <CompetitionPicker basePath="/jucatori" competitions={competitions} selectedId={selected.id} />
      <form action="/jucatori" className="flex max-w-md gap-2">
        <input type="hidden" name="competitie" value={selected.id} />
        <input
          name="q"
          defaultValue={search}
          placeholder="Caută după nume sau echipă"
          aria-label="Caută jucător"
          className="block w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-pitch-500 focus:ring-2 focus:ring-pitch-500/20"
        />
        <button className="rounded-md bg-pitch-700 px-4 py-2 text-sm font-semibold text-white hover:bg-pitch-800">
          Caută
        </button>
      </form>

      {players.length === 0 ? (
        <EmptyState>{search ? "Niciun jucător găsit." : "Jucătorii vor apărea după înscrierea loturilor."}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="px-3 py-2 text-left">Jucător</th>
                <th className="px-3 py-2 text-left">Echipa</th>
                <th className="px-3 py-2 text-left">Post</th>
                <th className="px-2 py-2 text-center" title="Meciuri jucate">J</th>
                <th className="px-2 py-2 text-center">Goluri</th>
                <th className="px-2 py-2 text-center">Assist.</th>
                <th className="px-2 py-2 text-center" title="Cartonașe galbene">🟨</th>
                <th className="px-2 py-2 text-center" title="Cartonașe roșii">🟥</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {players.map((p) => (
                <tr key={p.player_id + p.team_id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-semibold">
                    {p.first_name} {p.last_name}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/echipe/${p.team_id}`} className="text-pitch-700 hover:underline">
                      {p.team_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted">{p.position ? positionLabels[p.position] : ""}</td>
                  <td className="px-2 py-2 text-center">{p.matches_played}</td>
                  <td className="px-2 py-2 text-center font-semibold">{p.goals}</td>
                  <td className="px-2 py-2 text-center">{p.assists}</td>
                  <td className="px-2 py-2 text-center">{p.yellow_cards}</td>
                  <td className="px-2 py-2 text-center">{p.red_cards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
