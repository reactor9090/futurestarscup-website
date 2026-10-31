import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { TeamBadge } from "@/components/club-logo";
import { EmptyState, Stat } from "@/components/ui";
import { MatchPanel, MatchRow } from "@/components/match-row";
import { positionLabels } from "@/lib/labels";
import { getTeamProfile } from "@/lib/public-data";

export const metadata: Metadata = { title: "Echipă" };

export default function TeamPage({ params }: PageProps<"/echipe/[teamId]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-7xl px-4 py-10 text-muted sm:px-6">Se încarcă…</p>}>
      <Team params={params} />
    </Suspense>
  );
}

async function Team({ params }: { params: PageProps<"/echipe/[teamId]">["params"] }) {
  const { teamId } = await params;
  if (!z.uuid().safeParse(teamId).success) notFound();
  const team = await getTeamProfile(teamId);
  if (!team) notFound();

  const players = [...team.players].sort(
    (a, b) =>
      (a.shirt_number ?? 1000) - (b.shirt_number ?? 1000) ||
      a.last_name.localeCompare(b.last_name, "ro") ||
      a.first_name.localeCompare(b.first_name, "ro"),
  );
  const finished = team.matches.filter((m) => m.status === "finished");
  const record = finished.reduce(
    (r, m) => {
      const home = m.home.id === team.id;
      const gf = (home ? m.home_score : m.away_score) ?? 0;
      const ga = (home ? m.away_score : m.home_score) ?? 0;
      return {
        won: r.won + Number(gf > ga),
        drawn: r.drawn + Number(gf === ga),
        lost: r.lost + Number(gf < ga),
        gf: r.gf + gf,
        ga: r.ga + ga,
      };
    },
    { won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 },
  );
  const facts = [
    ["Meciuri", finished.length],
    ["Victorii", record.won],
    ["Egaluri", record.drawn],
    ["Înfrângeri", record.lost],
    ["Goluri", `${record.gf}:${record.ga}`],
    ["Puncte", 3 * record.won + record.drawn],
  ];

  return (
    <>
      <div className="bg-forest">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-10 sm:px-6 sm:py-14">
          <TeamBadge url={team.club?.logo_url ?? null} name={team.name} size={96} />
          <div>
            <Link
              href={team.competition ? `/echipe?competitie=${team.competition.id}` : "/echipe"}
              className="text-sm text-white/60 hover:text-white"
            >
              ← {team.competition?.name ?? "Echipe"}
            </Link>
            <h1 className="mt-1 font-display text-5xl font-extrabold leading-none tracking-tight text-white sm:text-6xl">
              {team.name}
            </h1>
            <p className="mt-2 text-white/65">
              {[team.club?.city, team.club?.coach_name && `Antrenor: ${team.club.coach_name}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
        {team.club?.description && <p className="max-w-3xl text-lg">{team.club.description}</p>}

        <dl className="grid grid-cols-3 gap-3 text-center text-forest sm:grid-cols-6">
          {facts.map(([label, value]) => (
            <Stat
              key={label}
              label={String(label)}
              value={value}
              className={`rounded-2xl p-4 ${label === "Puncte" ? "bg-lime" : "border border-line bg-surface"}`}
            />
          ))}
        </dl>

        <section className="space-y-4">
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-forest">Lotul</h2>
          {players.length === 0 ? (
            <EmptyState>Lotul nu a fost publicat încă.</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-none border border-line bg-surface">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="bg-paper/60 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <tr className="border-b border-line">
                    <th className="w-14 px-5 py-3 text-left">Nr.</th>
                    <th className="py-3 text-left">Jucător</th>
                    <th className="py-3 text-left">Post</th>
                    <th className="w-12 py-3 text-center" title="Meciuri jucate">J</th>
                    <th className="w-14 py-3 text-center">Goluri</th>
                    <th className="w-14 py-3 text-center">Pase</th>
                    <th className="w-10 py-3 text-center" title="Cartonașe galbene">🟨</th>
                    <th className="w-12 pr-5 py-3 text-center" title="Cartonașe roșii">🟥</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {players.map((p) => (
                    <tr key={p.player_id} className="border-b border-line last:border-0 hover:bg-paper/40">
                      <td className="px-5 py-3 font-display text-lg font-extrabold text-forest/40">{p.shirt_number ?? ""}</td>
                      <td className="py-3">
                        <Link href={`/jucatori/${p.player_id}`} className="font-bold text-forest hover:text-pitch-700">
                          {p.first_name} {p.last_name}
                        </Link>
                      </td>
                      <td className="py-3 text-muted">{p.position ? positionLabels[p.position] : ""}</td>
                      <td className="py-3 text-center">{p.matches_played}</td>
                      <td className="py-3 text-center font-bold">{p.goals}</td>
                      <td className="py-3 text-center">{p.assists}</td>
                      <td className="py-3 text-center">{p.yellow_cards}</td>
                      <td className="py-3 pr-5 text-center">{p.red_cards}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-forest">Meciuri</h2>
          {team.matches.length === 0 ? (
            <EmptyState>Niciun meci programat încă.</EmptyState>
          ) : (
            <MatchPanel>
              <ul className="space-y-2.5">
                {team.matches.map((m) => (
                  <MatchRow key={m.id} match={m} when="date" />
                ))}
              </ul>
            </MatchPanel>
          )}
        </section>
      </div>
    </>
  );
}
