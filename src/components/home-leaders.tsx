import Link from "next/link";
import { TeamBadge } from "@/components/club-logo";
import { CompetitionPicker } from "@/components/competition-picker";
import { Icon, icons } from "@/components/icons";
import { PlayerAvatar } from "@/components/player-avatar";
import { Eyebrow } from "@/components/ui";
import type { PlayerCardRow, PublicCompetition, PublicMatch } from "@/lib/public-data";

// Secțiunea „Golgheteri” de pe prima pagină: top marcatori și top pasatori, plus cifrele competiției,
// pe fundal verde închis, pe toată lățimea paginii.

type Ranked = { row: PlayerCardRow; position: number }[];
type Unit = { one: string; many: string };

const goals: Unit = { one: "gol", many: "goluri" };
const assists: Unit = { one: "pasă decisivă", many: "pase decisive" };
const unitFor = (value: number, unit: Unit) => (value === 1 ? unit.one : unit.many);

function PositionChip({ position, big = false }: { position: number; big?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl font-display font-extrabold ${
        big ? "size-11 bg-lime text-2xl text-forest" : "size-8 bg-white/10 text-base text-white"
      }`}
    >
      {position}
    </span>
  );
}

function TeamLine({ player: p, size }: { player: PlayerCardRow; size: number }) {
  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-white/55">
      <TeamBadge url={p.logo_url} name={p.team_name} size={size} tone="dark" />
      <span className="truncate">{p.team_name}</span>
    </span>
  );
}

/** Locul 1: rând mare, cu poza (sau numărul) și o coroană în fundal. */
function LeaderRow({ entry: { row: p, position }, value, unit }: { entry: Ranked[number]; value: number; unit: Unit }) {
  return (
    <Link
      href={`/jucatori/${p.player_id}`}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-lime/25 bg-gradient-to-r from-lime/15 via-white/5 to-transparent p-3.5 sm:gap-4 sm:p-4"
    >
      <Icon
        d={icons.crown}
        className="pointer-events-none absolute right-20 top-1/2 size-16 -translate-y-1/2 text-lime/10 max-sm:hidden"
      />
      <PositionChip position={position} big />
      <PlayerAvatar player={p} size={52} tone="dark" />
      <span className="relative min-w-0 flex-1">
        <span className="line-clamp-2 font-display text-xl font-extrabold leading-tight tracking-tight text-white group-hover:text-lime">
          {p.first_name} {p.last_name}
        </span>
        <TeamLine player={p} size={18} />
      </span>
      <span className="relative text-right">
        <span className="block font-display text-4xl font-extrabold tabular-nums leading-none text-lime">{value}</span>
        <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-white/60">{unitFor(value, unit)}</span>
      </span>
    </Link>
  );
}

function PlayerRow({ entry: { row: p, position }, value, unit }: { entry: Ranked[number]; value: number; unit: Unit }) {
  return (
    <li>
      <Link
        href={`/jucatori/${p.player_id}`}
        className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5 transition hover:border-lime/30"
      >
        <PositionChip position={position} />
        <PlayerAvatar player={p} size={34} tone="dark" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-white group-hover:text-lime">
            {p.first_name} {p.last_name}
          </span>
          <TeamLine player={p} size={16} />
        </span>
        <span className="text-right">
          <span className="block font-display text-xl font-extrabold tabular-nums leading-none text-white">{value}</span>
          <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wider text-white/50">{unitFor(value, unit)}</span>
        </span>
      </Link>
    </li>
  );
}

function LeaderBoard({
  title,
  description,
  icon,
  rows,
  value,
  unit,
  href,
  empty,
}: {
  title: string;
  description: string;
  icon: string;
  rows: Ranked;
  value: (p: PlayerCardRow) => number;
  unit: Unit;
  href: string;
  empty: string;
}) {
  const [first, ...rest] = rows.slice(0, 5);
  return (
    <div className="relative overflow-hidden rounded-none border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <span className="absolute left-0 top-8 h-24 w-1 rounded-r-full bg-lime" aria-hidden />
      <div className="flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime text-forest">
          <Icon d={icon} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl font-extrabold leading-none tracking-tight text-white">{title}</h3>
          <p className="mt-1 text-xs text-white/55">{description}</p>
        </div>
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-bold text-white transition hover:border-lime hover:text-lime sm:flex"
        >
          Vezi toți
          <Icon d={icons.arrow} />
        </Link>
      </div>

      {first ? (
        <div className="mt-5 space-y-2">
          <LeaderRow entry={first} value={value(first.row)} unit={unit} />
          {rest.length > 0 && (
            <ul className="space-y-2">
              {rest.map((e) => (
                <PlayerRow key={e.row.player_id + e.row.team_id} entry={e} value={value(e.row)} unit={unit} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">{empty}</p>
      )}
    </div>
  );
}

export function HomeLeaders({
  competition,
  competitions,
  stats,
  scorers,
  assisters,
  matches,
}: {
  competition: PublicCompetition;
  competitions: PublicCompetition[];
  stats: PlayerCardRow[];
  scorers: Ranked;
  assisters: Ranked;
  matches: PublicMatch[];
}) {
  const href = `/golgheteri?competitie=${competition.id}`;
  // Golurile din scoruri (oficiale), nu din marcatori: marcatorii pot lipsi la unele meciuri.
  const totalGoals = matches
    .filter((m) => m.status === "finished")
    .reduce((sum, m) => sum + (m.home_score ?? 0) + (m.away_score ?? 0), 0);
  const figures = [
    { label: "Jucători în competiție", value: new Set(stats.map((p) => p.player_id)).size, icon: icons.users },
    { label: "Goluri marcate", value: totalGoals, icon: icons.ball },
    { label: "Pase decisive", value: stats.reduce((sum, p) => sum + p.assists, 0), icon: icons.target },
    { label: "Echipe participante", value: new Set(stats.map((p) => p.team_id)).size, icon: icons.shirt },
  ];

  return (
    <section id="golgheteri" className="relative scroll-mt-16 overflow-hidden bg-forest">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,color-mix(in_oklab,var(--color-lime)_16%,transparent),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <div>
            <Eyebrow className="text-lime">Top jucători</Eyebrow>
            <h2 className="mt-3 font-display text-5xl font-extrabold leading-none tracking-tight text-white sm:text-6xl">
              Golgheteri
            </h2>
            <p className="mt-3 text-white/55">
              Cei mai buni jucători {competition.season ? `ai sezonului ${competition.season.name}` : "ai competiției"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CompetitionPicker basePath="/" competitions={competitions} selectedId={competition.id} tone="dark" />
            <Link
              href={href}
              className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white transition hover:border-lime hover:text-lime"
            >
              <Icon d={icons.trophy} className="size-4 text-lime" />
              Vezi clasamentul complet
              <Icon d={icons.arrow} />
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <LeaderBoard
            title="Marcatori"
            description="Top jucători după numărul de goluri marcate"
            icon={icons.ball}
            rows={scorers}
            value={(p) => p.goals}
            unit={goals}
            href={href}
            empty="Marcatorii vor apărea după primele goluri înregistrate."
          />
          <LeaderBoard
            title="Pase decisive"
            description="Top jucători după numărul de pase decisive"
            icon={icons.boot}
            rows={assisters}
            value={(p) => p.assists}
            unit={assists}
            href={href}
            empty="Pasatorii vor apărea după primele pase decisive înregistrate."
          />
        </div>

        <dl className="mt-5 grid grid-cols-2 rounded-none border border-white/10 bg-white/[0.03] lg:grid-cols-4">
          {figures.map((f, i) => (
            <div
              key={f.label}
              className={`flex items-center gap-3 p-4 sm:px-6 ${i % 2 === 1 ? "border-l border-white/10" : ""} ${i >= 2 ? "border-t border-white/10 lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            >
              <Icon d={f.icon} className="size-7 text-lime" />
              <div>
                <dd className="font-display text-2xl font-extrabold tabular-nums leading-none text-white">{f.value}</dd>
                <dt className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">{f.label}</dt>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
