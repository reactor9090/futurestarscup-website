import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TeamBadge } from "@/components/club-logo";
import { CompetitionPicker, EmptyState } from "@/components/competition-picker";
import { LeaderCard } from "@/components/leader-card";
import { PageHeader } from "@/components/page-header";
import { PositionBadge, Segmented, signed } from "@/components/ui";
import type { FormResult } from "@/lib/form";
import { rankPlayers } from "@/lib/player-ranking";
import { getCompetitions, getPlayerStats, getStandings, pickCompetition, type StandingsTable } from "@/lib/public-data";

export const metadata: Metadata = { title: "Clasament" };

export default function ClasamentPage({ searchParams }: PageProps<"/clasament">) {
  return (
    <>
      <PageHeader
        eyebrow="Situația la zi"
        title="Clasament"
        description="Clasamentul fiecărei categorii de vârstă, calculat automat după fiecare rezultat."
      />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-forest/5" />}>
          <Standings searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Standings({ searchParams }: { searchParams: PageProps<"/clasament">["searchParams"] }) {
  const { competitie, vedere } = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, competitie);
  if (!selected) return <EmptyState>Nicio competiție publicată încă.</EmptyState>;
  const scorersView = vedere === "marcatori";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <CompetitionPicker
          basePath="/clasament"
          competitions={competitions}
          selectedId={selected.id}
          params={scorersView ? { vedere: "marcatori" } : {}}
        />
        <Segmented
          label="Vedere"
          options={[
            { href: `/clasament?competitie=${selected.id}`, label: "Clasament", active: !scorersView },
            { href: `/clasament?competitie=${selected.id}&vedere=marcatori`, label: "Top marcatori", active: scorersView },
          ]}
        />
      </div>
      {scorersView ? <ScorersView competitionId={selected.id} /> : <TablesView competitionId={selected.id} />}
    </>
  );
}

async function ScorersView({ competitionId }: { competitionId: string }) {
  const stats = await getPlayerStats(competitionId);
  const scorers = rankPlayers(stats, "goals");
  const assisters = rankPlayers(stats, "assists");
  if (scorers.length === 0 && assisters.length === 0) {
    return <EmptyState>Marcatorii vor apărea după primele goluri înregistrate.</EmptyState>;
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {scorers.length > 0 && <LeaderCard title="Marcatori" valueLabel="Goluri" rows={scorers.slice(0, 15)} value={(p) => p.goals} />}
      {assisters.length > 0 && (
        <LeaderCard title="Pase decisive" valueLabel="Pase" rows={assisters.slice(0, 15)} value={(p) => p.assists} />
      )}
    </div>
  );
}

async function TablesView({ competitionId }: { competitionId: string }) {
  const stages = await getStandings(competitionId);
  if (!stages.some((s) => s.tables.some((t) => t.rows.length > 0))) {
    return <EmptyState>Clasamentul va apărea după ce sunt înscrise echipele.</EmptyState>;
  }

  return (
    <>
      {stages.map((stage) => (
        <section key={stage.id} className="space-y-6">
          {stages.length > 1 && (
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-forest">{stage.name}</h2>
          )}
          {stage.tables.map((table) => (
            <StandingsBlock
              key={table.groupName ?? "all"}
              table={table}
              champion={stage.complete && stage.type === "league"}
            />
          ))}
        </section>
      ))}
      <p className="text-xs text-muted">
        J – meciuri jucate · V – victorii · E – egaluri · Î – înfrângeri · Goluri – marcate:primite · Forma – ultimele 5
        meciuri · P – puncte. Apasă pe o echipă pentru lot și profil.
      </p>
    </>
  );
}

type Row = StandingsTable["rows"][number];

function StandingsBlock({ table, champion }: { table: StandingsTable; champion: boolean }) {
  if (table.rows.length === 0) return null;
  // Podiumul are sens doar după primele meciuri; înainte, toți au 0 puncte.
  const podium = table.rows.some((r) => r.played > 0) ? table.rows.slice(0, 3) : [];
  const rest = table.rows.slice(podium.length);

  return (
    <div className="space-y-5">
      {table.groupName && (
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-pitch-700">{table.groupName}</h3>
      )}
      {podium.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-forest px-4 pb-6 pt-10 sm:px-8">
          <ol className="grid items-end gap-4 md:grid-cols-3">
            {podium.map((row) => (
              <PodiumCard key={row.team_id} row={row} champion={champion && row.position === 1} />
            ))}
          </ol>
        </div>
      )}
      {rest.length > 0 && <StandingsTableView rows={rest} />}
    </div>
  );
}

function PodiumCard({ row, champion }: { row: Row; champion: boolean }) {
  const first = row.position === 1;
  // Pe ecran lat: 2 – 1 – 3, cu primul mai înalt.
  const order = row.position === 1 ? "md:order-2" : row.position === 2 ? "md:order-1" : "md:order-3";
  return (
    <li className={order}>
      <Link
        href={`/echipe/${row.team_id}`}
        className={`relative flex flex-col items-center rounded-3xl p-5 text-center transition hover:-translate-y-0.5 ${
          first ? "bg-lime text-forest md:pb-8 md:pt-8" : "bg-surface text-forest"
        }`}
      >
        <span className="absolute left-4 top-3 font-display text-3xl font-extrabold">{row.position}</span>
        {champion && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-forest px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-lime">
            ★ Campioană
          </span>
        )}
        <TeamBadge url={row.logo_url} name={row.team_name} size={first ? 80 : 64} />
        <span className="mt-3 font-bold">{row.team_name}</span>
        <span className="mt-1 font-display text-5xl font-extrabold tabular-nums leading-none">
          {row.points}
          <span className="ml-1 text-base">p</span>
        </span>
        <span className="mt-3 flex flex-wrap justify-center gap-1.5 text-[11px] font-semibold">
          <span className="rounded-full bg-forest/10 px-2.5 py-1">
            {row.won}V · {row.drawn}E · {row.lost}Î
          </span>
          <span className="rounded-full bg-forest/10 px-2.5 py-1">GD {signed(row.goal_difference)}</span>
        </span>
        <FormDots form={row.form} className="mt-3" />
      </Link>
    </li>
  );
}

const formStyle: Record<FormResult, string> = {
  V: "bg-pitch-500 text-white",
  E: "bg-gold-400 text-ink",
  Î: "bg-danger text-white",
};
const formTitle: Record<FormResult, string> = { V: "Victorie", E: "Egal", Î: "Înfrângere" };

function FormDots({ form, className = "" }: { form: FormResult[]; className?: string }) {
  if (form.length === 0) return null;
  return (
    <span className={`flex justify-center gap-1 ${className}`} aria-label={`Forma: ${form.join(" ")}`}>
      {form.map((r, i) => (
        <span key={i} title={formTitle[r]} className={`grid size-5 place-items-center rounded-full text-[9px] font-extrabold ${formStyle[r]}`}>
          {r}
        </span>
      ))}
    </span>
  );
}

function StandingsTableView({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-paper/60 text-[11px] font-bold uppercase tracking-wider text-muted">
          <tr className="border-b border-line">
            <th className="w-14 px-4 py-3.5 text-left">#</th>
            <th className="py-3.5 text-left">Echipa</th>
            <th className="w-10 py-3.5 text-center" title="Meciuri jucate">J</th>
            <th className="w-10 py-3.5 text-center" title="Victorii">V</th>
            <th className="w-10 py-3.5 text-center" title="Egaluri">E</th>
            <th className="w-10 py-3.5 text-center" title="Înfrângeri">Î</th>
            <th className="w-16 py-3.5 text-center" title="Goluri marcate : primite">Goluri</th>
            <th className="w-12 py-3.5 text-center" title="Golaveraj">+/−</th>
            <th className="w-36 py-3.5 text-center">Forma</th>
            <th className="w-14 px-4 py-3.5 text-right" title="Puncte">P</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row) => (
            <tr key={row.team_id} className="border-b border-line last:border-0 hover:bg-paper/40">
              <td className="px-4 py-3">
                <PositionBadge position={row.position} highlight={false} />
              </td>
              <td className="py-2.5">
                <Link href={`/echipe/${row.team_id}`} className="flex items-center gap-3 font-bold text-forest hover:text-pitch-700">
                  <TeamBadge url={row.logo_url} name={row.team_name} size={30} />
                  {row.team_name}
                </Link>
              </td>
              <td className="py-3 text-center text-muted">{row.played}</td>
              <td className="py-3 text-center text-pitch-600">{row.won}</td>
              <td className="py-3 text-center text-gold-600">{row.drawn}</td>
              <td className="py-3 text-center text-danger">{row.lost}</td>
              <td className="py-3 text-center text-muted">
                {row.goals_for}:{row.goals_against}
              </td>
              <td className="py-3 text-center text-muted">{signed(row.goal_difference)}</td>
              <td className="py-3">
                <FormDots form={row.form} />
              </td>
              <td className="px-4 py-3 text-right text-base font-extrabold text-forest">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
