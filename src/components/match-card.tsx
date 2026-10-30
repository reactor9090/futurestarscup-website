import { ClubLogo } from "@/components/club-logo";
import { formatKickoff } from "@/lib/datetime";
import type { PublicMatch } from "@/lib/public-data";

const statusNote = { postponed: "Amânat", cancelled: "Anulat" } as const;

export function MatchCard({ match: m }: { match: PublicMatch }) {
  const finished = m.status === "finished";
  const note = m.status === "postponed" || m.status === "cancelled" ? statusNote[m.status] : null;
  const penalties =
    finished && m.home_penalties !== null && m.away_penalties !== null
      ? `${m.home_penalties}–${m.away_penalties} la lovituri de departajare`
      : null;

  return (
    <li className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="mb-2 flex flex-wrap gap-x-2 text-xs text-muted">
        <span>{formatKickoff(m.kickoff_at)}</span>
        {m.venue && <span>· {m.venue}</span>}
        {m.group && <span>· {m.group.name}</span>}
        {note && <span className="rounded bg-gold-100 px-1.5 font-medium text-ink">{note}</span>}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="flex items-center justify-end gap-2 text-right font-semibold">
          {m.home.name}
          <ClubLogo url={m.home.club?.logo_url ?? null} size={32} />
        </span>
        <span className="min-w-16 rounded-md bg-canvas px-3 py-1 text-center font-display text-xl font-bold tabular-nums">
          {finished ? `${m.home_score} – ${m.away_score}` : "vs"}
        </span>
        <span className="flex items-center gap-2 font-semibold">
          <ClubLogo url={m.away.club?.logo_url ?? null} size={32} />
          {m.away.name}
        </span>
      </div>
      {penalties && <p className="mt-1 text-center text-xs text-muted">{penalties}</p>}
    </li>
  );
}
