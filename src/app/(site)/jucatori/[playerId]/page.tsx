import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { TeamBadge } from "@/components/club-logo";
import { MatchPanel, MatchRow } from "@/components/match-row";
import { PlayerAvatar } from "@/components/player-avatar";
import { Eyebrow, EmptyState, Stat } from "@/components/ui";
import { positionLabels } from "@/lib/labels";
import { getPlayerProfile } from "@/lib/public-data";

export const metadata: Metadata = { title: "Jucător" };

export default function PlayerPage({ params }: PageProps<"/jucatori/[playerId]">) {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse bg-forest" />}>
      <Player params={params} />
    </Suspense>
  );
}

async function Player({ params }: { params: PageProps<"/jucatori/[playerId]">["params"] }) {
  const { playerId } = await params;
  if (!z.uuid().safeParse(playerId).success) notFound();
  const player = await getPlayerProfile(playerId);
  if (!player) notFound();

  // Antetul arată competiția cea mai recentă (getPlayerProfile le ordonează așa).
  const current = player.seasons[0];
  const totals = player.seasons.reduce(
    (t, s) => ({
      matches: t.matches + s.matches_played,
      goals: t.goals + s.goals,
      assists: t.assists + s.assists,
      yellow: t.yellow + s.yellow_cards,
      red: t.red + s.red_cards,
    }),
    { matches: 0, goals: 0, assists: 0, yellow: 0, red: 0 },
  );

  return (
    <>
      <div className="relative overflow-hidden bg-forest">
        <div
          className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(90deg,var(--color-forest-soft)_0_80px,var(--color-forest)_80px_160px)]"
          aria-hidden
        />
        {current.shirt_number !== null && (
          <span
            className="pointer-events-none absolute -bottom-10 right-0 select-none font-display text-[16rem] font-extrabold leading-none text-white/5"
            aria-hidden
          >
            {current.shirt_number}
          </span>
        )}
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6 sm:py-16">
          <PlayerAvatar player={{ ...player, shirt_number: current.shirt_number }} size={136} />
          <div>
            <Link href={`/jucatori?competitie=${current.competition.id}`} className="text-sm text-white/60 hover:text-white">
              ← Jucători · {current.competition.name}
            </Link>
            <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight text-white sm:text-7xl">
              {player.first_name} <span className="text-lime">{player.last_name}</span>
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-white/70">
              <Link href={`/echipe/${current.team_id}`} className="flex items-center gap-2 font-semibold text-white hover:text-lime">
                <TeamBadge url={current.logo_url} name={current.team_name} size={24} tone="dark" />
                {current.team_name}
              </Link>
              {[
                player.position && positionLabels[player.position],
                current.shirt_number !== null && `nr. ${current.shirt_number}`,
                player.birth_year && `născut în ${player.birth_year}`,
              ]
                .filter(Boolean)
                .map((t) => (
                  <span key={String(t)}>· {t}</span>
                ))}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6">
        <dl className="grid grid-cols-2 gap-3 text-forest sm:grid-cols-5">
          <Stat label="Meciuri" value={totals.matches} className="rounded-2xl border border-line bg-surface p-4" />
          <Stat label="Goluri" value={totals.goals} className="rounded-2xl bg-lime p-4" />
          <Stat label="Pase decisive" value={totals.assists} className="rounded-2xl border border-line bg-surface p-4" />
          <Stat label="Cartonașe galbene" value={totals.yellow} className="rounded-2xl border border-line bg-surface p-4" />
          <Stat label="Cartonașe roșii" value={totals.red} className="rounded-2xl border border-line bg-surface p-4" />
        </dl>

        {player.seasons.length > 1 && (
          <section className="space-y-4">
            <Eyebrow>Pe competiții</Eyebrow>
            <div className="overflow-x-auto rounded-none border border-line bg-surface">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="bg-paper/60 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 text-left">Competiție</th>
                    <th className="py-3 text-left">Echipa</th>
                    <th className="w-12 py-3 text-center" title="Meciuri jucate">J</th>
                    <th className="w-16 py-3 text-center">Goluri</th>
                    <th className="w-16 px-5 py-3 text-center">Pase</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {player.seasons.map((s) => (
                    <tr key={s.team_id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 font-semibold text-forest">{s.competition.name}</td>
                      <td className="py-3">
                        <Link href={`/echipe/${s.team_id}`} className="text-pitch-700 hover:underline">
                          {s.team_name}
                        </Link>
                      </td>
                      <td className="py-3 text-center">{s.matches_played}</td>
                      <td className="py-3 text-center font-bold">{s.goals}</td>
                      <td className="px-5 py-3 text-center">{s.assists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-forest">Meciuri jucate</h2>
          {player.matches.length === 0 ? (
            <EmptyState>Niciun meci înregistrat încă.</EmptyState>
          ) : (
            <MatchPanel>
              <ul className="space-y-2.5">
                {player.matches.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    when="date"
                    note={
                      m.goals + m.assists > 0
                        ? [m.goals > 0 && `⚽ ${m.goals} ${m.goals === 1 ? "gol" : "goluri"}`, m.assists > 0 && `${m.assists} ${m.assists === 1 ? "pasă decisivă" : "pase decisive"}`]
                            .filter(Boolean)
                            .join(" · ")
                        : null
                    }
                  />
                ))}
              </ul>
            </MatchPanel>
          )}
        </section>
      </div>
    </>
  );
}
