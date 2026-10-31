import Link from "next/link";
import { PositionBadge } from "@/components/ui";
import type { rankPlayers } from "@/lib/player-ranking";
import type { PlayerStatRow } from "@/lib/public-data";

type Ranked = ReturnType<typeof rankPlayers>;

/** Top jucători după o statistică (goluri, pase), cu link spre profil. */
export function LeaderCard({
  title,
  valueLabel,
  rows,
  value,
}: {
  title: string;
  valueLabel: string;
  rows: Ranked;
  value: (p: PlayerStatRow) => number;
}) {
  return (
    <div className="rounded-3xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="font-display text-2xl font-extrabold tracking-tight text-forest">{title}</h3>
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{valueLabel}</span>
      </div>
      <ol className="divide-y divide-line">
        {rows.map(({ row, position }) => (
          <li key={row.player_id + row.team_id}>
            <Link href={`/jucatori/${row.player_id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-paper/60">
              <PositionBadge position={position} highlight={position === 1} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-forest">
                  {row.first_name} {row.last_name}
                </span>
                <span className="block truncate text-xs text-muted">{row.team_name}</span>
              </span>
              <span className="font-display text-2xl font-extrabold tabular-nums text-forest">{value(row)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
