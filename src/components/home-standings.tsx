import Link from "next/link";
import { TeamBadge } from "@/components/club-logo";
import { competitionLabel, CompetitionPicker } from "@/components/competition-picker";
import { Icon, icons } from "@/components/icons";
import { EmptyState, Eyebrow, signed } from "@/components/ui";
import type { FormResult } from "@/lib/form";
import type { PublicCompetition, PublicMatch, StageStandings, StandingsTable } from "@/lib/public-data";
import { groupRounds } from "@/lib/rounds";

// Secțiunea „Clasament” de pe prima pagină: tabelul (cu forma), liderul și câteva statistici rapide.

const updatedFormat = new Intl.DateTimeFormat("ro-RO", {
  timeZone: "Europe/Bucharest",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type Row = StandingsTable["rows"][number];

const formStyle: Record<FormResult, string> = {
  V: "bg-pitch-600 text-white",
  E: "bg-gold-400 text-ink",
  Î: "bg-danger text-white",
};
const formTitle: Record<FormResult, string> = { V: "Victorie", E: "Egal", Î: "Înfrângere" };

/** Ultimele 5 rezultate; locurile goale (meciuri încă nejucate) apar ca „-”. */
function FormSlots({ form }: { form: FormResult[] }) {
  const slots: (FormResult | null)[] = [...form, ...Array<null>(Math.max(0, 5 - form.length)).fill(null)];
  return (
    <span className="flex gap-1" aria-label={form.length ? `Forma: ${form.join(" ")}` : "Niciun meci jucat"}>
      {slots.map((r, i) => (
        <span
          key={i}
          title={r ? formTitle[r] : undefined}
          className={`grid size-6 place-items-center rounded-md text-[10px] font-extrabold ${r ? formStyle[r] : "bg-forest/5 text-muted"}`}
        >
          {r ?? "-"}
        </span>
      ))}
    </span>
  );
}

function StandingsCard({
  title,
  meta,
  rows,
  otherGroups,
  href,
}: {
  title: string;
  meta: string[];
  rows: Row[];
  /** Celelalte grupe ale fazei, care apar doar în pagina completă. */
  otherGroups: string[];
  href: string;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      <div className="flex items-center gap-4 bg-forest px-5 py-5 sm:px-7">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-lime text-forest">
          <Icon d={icons.trophy} className="size-7" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-3xl font-extrabold leading-none tracking-tight text-white">{title}</h3>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/60">
            {meta.map((m, i) => (
              <span key={m}>
                {i > 0 && <span className="mr-3 text-white/25">|</span>}
                {m}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-paper/60 text-[11px] font-bold uppercase tracking-wider text-muted">
            <tr className="border-b border-line">
              <th className="w-16 px-5 py-3.5 text-left">#</th>
              <th className="py-3.5 text-left">Echipă</th>
              <th className="w-10 py-3.5 text-center" title="Meciuri jucate">J</th>
              <th className="w-10 py-3.5 text-center" title="Victorii">V</th>
              <th className="w-10 py-3.5 text-center" title="Egaluri">E</th>
              <th className="w-10 py-3.5 text-center" title="Înfrângeri">Î</th>
              <th className="w-16 py-3.5 text-center" title="Goluri marcate : primite">Goluri</th>
              <th className="w-14 py-3.5 text-center" title="Golaveraj">+/−</th>
              <th className="w-16 py-3.5 text-center" title="Puncte">Pct</th>
              <th className="w-40 px-5 py-3.5 text-left">Formă</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r) => {
              const leader = r.position === 1 && r.played > 0;
              return (
                <tr
                  key={r.team_id}
                  className={`border-b border-line last:border-0 ${leader ? "bg-lime/10 shadow-[inset_3px_0_0_var(--color-lime)]" : "hover:bg-paper/40"}`}
                >
                  <td className="px-5 py-3.5">
                    <span
                      className={`grid size-8 place-items-center rounded-lg text-sm font-bold ${leader ? "bg-lime text-forest" : "bg-forest/5 text-forest"}`}
                    >
                      {r.position}
                    </span>
                  </td>
                  <td className="py-3">
                    <Link href={`/echipe/${r.team_id}`} className="flex items-center gap-3 text-base font-bold text-forest hover:text-pitch-700">
                      <TeamBadge url={r.logo_url} name={r.team_name} size={38} />
                      <span className="truncate">{r.team_name}</span>
                    </Link>
                  </td>
                  <td className="py-3.5 text-center text-muted">{r.played}</td>
                  <td className="py-3.5 text-center text-muted">{r.won}</td>
                  <td className="py-3.5 text-center text-muted">{r.drawn}</td>
                  <td className="py-3.5 text-center text-muted">{r.lost}</td>
                  <td className="py-3.5 text-center text-muted">
                    {r.goals_for}:{r.goals_against}
                  </td>
                  <td className="py-3.5 text-center text-muted">{signed(r.goal_difference)}</td>
                  <td className="py-3.5 text-center">
                    <span
                      className={`inline-grid size-9 place-items-center rounded-lg text-base font-extrabold ${leader ? "bg-lime text-forest" : "bg-forest/5 text-forest"}`}
                    >
                      {r.points}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <FormSlots form={r.form} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {otherGroups.length > 0 && (
        <Link
          href={href}
          className="group mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted hover:border-forest hover:text-forest"
        >
          <span>
            Mai {otherGroups.length === 1 ? "e și" : "sunt și"}{" "}
            <strong className="text-forest">{otherGroups.join(", ")}</strong>
          </span>
          <span className="flex items-center gap-1.5 font-bold text-forest">
            Vezi toate grupele
            <Icon d={icons.arrow} className="size-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {/* Legenda stă jos, chiar dacă celălalt card e mai înalt. */}
      <p className="m-4 mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl bg-paper/70 px-4 py-3 text-xs text-muted">
        <Icon d={icons.info} className="size-4 text-forest/50" />
        <span>J – meciuri</span>
        <span>V – victorii</span>
        <span>E – egaluri</span>
        <span>Î – înfrângeri</span>
        <span>+/− – golaveraj</span>
        <span>Pct – puncte</span>
      </p>
    </div>
  );
}

function LeaderCard({ row, label }: { row: Row; label: string }) {
  const stats = [
    ["Meciuri", row.played],
    ["Victorii", row.won],
    ["Goluri", `${row.goals_for}:${row.goals_against}`],
    ["Puncte", row.points],
  ] as const;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-forest p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-lime/15 blur-3xl" aria-hidden />
      <span className="relative flex w-fit items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-[11px] font-bold text-forest">
        <Icon d={icons.crown} className="size-3.5" />
        {label}
      </span>
      <Link href={`/echipe/${row.team_id}`} className="group relative mt-5 flex items-center gap-4">
        <TeamBadge url={row.logo_url} name={row.team_name} size={72} tone="dark" />
        <span className="font-display text-4xl font-extrabold leading-[0.95] tracking-tight text-white group-hover:text-lime">
          {row.team_name}
        </span>
      </Link>
      <dl className="relative mt-6 grid grid-cols-4 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-1 py-3 text-center">
            <dd className="font-display text-2xl font-extrabold tabular-nums leading-none text-white">{value}</dd>
            <dt className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/50">{label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

function QuickStats({ matches, teams, href }: { matches: PublicMatch[]; teams: number; href: string }) {
  const finished = matches.filter((m) => m.status === "finished");
  const goals = finished.reduce((sum, m) => sum + (m.home_score ?? 0) + (m.away_score ?? 0), 0);
  const average = finished.length ? (goals / finished.length).toFixed(1).replace(".", ",") : "0";
  const stats = [
    { label: "Goluri", value: goals, note: `în ${finished.length} ${finished.length === 1 ? "meci" : "meciuri"}`, icon: icons.ball },
    { label: "Pe meci", value: average, note: "media golurilor", icon: icons.chart },
    { label: "Echipe", value: teams, note: "în competiție", icon: icons.users },
  ];
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <h3 className="flex items-center gap-2 font-bold text-forest">
        <Icon d={icons.chart} className="size-5" />
        Statistici rapide
      </h3>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-paper/70 p-3">
            <Icon d={s.icon} className="size-5 text-forest/60" />
            <dd className="mt-2 font-display text-3xl font-extrabold tabular-nums leading-none text-forest">{s.value}</dd>
            <dt className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-muted">{s.label}</dt>
            <p className="mt-0.5 text-[10px] text-muted/80">{s.note}</p>
          </div>
        ))}
      </dl>
      <Link
        href={href}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3.5 text-sm font-bold text-white transition hover:bg-forest-soft"
      >
        Vezi clasamentul complet
        <Icon d={icons.arrow} />
      </Link>
    </div>
  );
}

export function HomeStandings({
  competition,
  competitions,
  stages,
  matches,
}: {
  competition: PublicCompetition;
  competitions: PublicCompetition[];
  stages: StageStandings[];
  matches: PublicMatch[];
}) {
  // Pe prima pagină: primul tabel cu echipe (la faza pe grupe, primul grup); restul e în pagina completă.
  const stage = stages.find((s) => s.tables.some((t) => t.rows.length > 0));
  const table = stage?.tables.find((t) => t.rows.length > 0);
  const rows = table?.rows.slice(0, 8) ?? [];
  const leader = rows[0]?.played ? rows[0] : null;
  const fullHref = `/clasament?competitie=${competition.id}`;

  // Ultima etapă cu rezultate și ora ultimului rezultat, din meciurile acestui tabel.
  const tableMatches = matches.filter(
    (m) => m.stage?.name === stage?.name && (m.group?.name ?? null) === (table?.groupName ?? null),
  );
  const played = groupRounds(tableMatches).filter((r) => r.matches.some((m) => m.status === "finished"));
  const lastResult = tableMatches
    .filter((m) => m.status === "finished" && m.kickoff_at)
    .map((m) => m.kickoff_at!)
    .sort()
    .at(-1);

  const title = [competitionLabel(competition), table?.groupName, played.at(-1)?.title].filter(Boolean).join(" · ");
  const meta = [
    competition.season ? `Sezonul ${competition.season.name}` : null,
    `${table?.rows.length ?? 0} echipe`,
    lastResult ? `Ultimul rezultat: ${updatedFormat.format(new Date(lastResult))}` : "Niciun meci jucat încă",
  ].filter((m): m is string => Boolean(m));

  return (
    <section id="clasament" className="scroll-mt-16">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div>
          <Eyebrow>Situația la zi</Eyebrow>
          <h2 className="mt-3 font-display text-5xl font-extrabold leading-none tracking-tight text-forest sm:text-6xl">
            Clasament
          </h2>
          <p className="mt-3 text-muted">Vezi poziția echipelor, punctele, golaverajul și forma actuală.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CompetitionPicker basePath="/" competitions={competitions} selectedId={competition.id} />
          <Link
            href={fullHref}
            className="flex items-center gap-2 rounded-full border-2 border-forest px-5 py-2.5 text-sm font-bold text-forest transition hover:bg-forest hover:text-white"
          >
            <Icon d={icons.calendar} />
            Toate clasamentele
            <Icon d={icons.arrow} />
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-10">
          <EmptyState>Clasamentul va apărea după ce sunt înscrise echipele.</EmptyState>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_24rem]">
          <StandingsCard
            title={title}
            meta={meta}
            rows={rows}
            otherGroups={(stage?.tables ?? []).filter((t) => t !== table && t.groupName).map((t) => t.groupName!)}
            href={fullHref}
          />
          <div className="space-y-5">
            {leader && <LeaderCard row={leader} label={table?.groupName ? "Liderul grupei" : "Liderul clasamentului"} />}
            <QuickStats matches={matches} teams={table?.rows.length ?? 0} href={fullHref} />
          </div>
        </div>
      )}
    </section>
  );
}
