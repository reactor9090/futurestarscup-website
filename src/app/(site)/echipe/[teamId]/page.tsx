import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ClubLogo } from "@/components/club-logo";
import { MatchCard } from "@/components/match-card";
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
      <div className="bg-pitch-900 bg-[radial-gradient(ellipse_at_top_right,var(--color-pitch-700),transparent_60%)]">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-10 sm:px-6 sm:py-14">
          <ClubLogo url={team.club?.logo_url ?? null} size={88} />
          <div>
            <Link
              href={team.competition ? `/echipe?competitie=${team.competition.id}` : "/echipe"}
              className="text-sm text-pitch-100/70 hover:text-white"
            >
              ← {team.competition?.name ?? "Echipe"}
            </Link>
            <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide text-white sm:text-5xl">
              {team.name}
            </h1>
            <p className="text-pitch-100/80">
              {[team.club?.city, team.club?.coach_name && `Antrenor: ${team.club.coach_name}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
        {team.club?.description && <p className="max-w-3xl text-lg">{team.club.description}</p>}

        <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {facts.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-surface px-3 py-3 text-center">
              <dd className="font-display text-3xl font-bold tabular-nums">{value}</dd>
              <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
            </div>
          ))}
        </dl>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Lotul</h2>
          {players.length === 0 ? (
            <p className="text-muted">Lotul nu a fost publicat încă.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr className="border-b border-line">
                    <th className="w-12 px-3 py-2 text-left">Nr.</th>
                    <th className="px-3 py-2 text-left">Jucător</th>
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
                    <tr key={p.player_id} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 text-muted">{p.shirt_number ?? ""}</td>
                      <td className="px-3 py-2 font-semibold">
                        {p.first_name} {p.last_name}
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
        </section>

        <section className="max-w-4xl space-y-3">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Meciuri</h2>
          {team.matches.length === 0 && <p className="text-muted">Niciun meci programat încă.</p>}
          <ul className="space-y-2">
            {team.matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
