import Link from "next/link";
import { TeamBadge } from "@/components/club-logo";
import type { PublicMatch } from "@/lib/public-data";

const TZ = "Europe/Bucharest";
const timeFormat = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dateFormat = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, day: "numeric", month: "short" });
const dayFormat = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** „Duminică, 8 noiembrie” */
export const formatDay = (iso: string) => capitalize(dayFormat.format(new Date(iso)));

/** Panou verde închis care ține o listă de meciuri. */
export function MatchPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-none bg-forest p-4 sm:p-7 ${className}`}>{children}</div>;
}

/**
 * Un meci pe un rând: ora (sau data), gazdele, scorul / VS, oaspeții.
 * `when="date"` pentru liste din mai multe zile (profilul echipei sau al jucătorului).
 */
export function MatchRow({
  match: m,
  when = "time",
  note,
}: {
  match: PublicMatch;
  when?: "time" | "date";
  /** Text mic sub rând (ex. golurile jucătorului). */
  note?: React.ReactNode;
}) {
  const finished = m.status === "finished";
  const status = m.status === "postponed" ? "Amânat" : m.status === "cancelled" ? "Anulat" : null;
  const penalties =
    finished && m.home_penalties !== null && m.away_penalties !== null
      ? `${m.home_penalties}–${m.away_penalties} la penalty`
      : null;
  const kickoff = m.kickoff_at
    ? when === "time"
      ? timeFormat.format(new Date(m.kickoff_at))
      : dateFormat.format(new Date(m.kickoff_at))
    : "—";
  const extra = [m.group?.name, penalties].filter(Boolean).join(" · ");

  return (
    <li className="rounded-xl border border-white/5 bg-forest-soft px-3 py-3 text-sm sm:px-4">
      <div className="grid grid-cols-[3rem_1fr_auto_1fr] items-center gap-2 sm:grid-cols-[4.5rem_1fr_auto_1fr_4.5rem] sm:gap-3">
        <span className="text-xs font-bold tabular-nums text-lime">{kickoff}</span>
        <Link href={`/echipe/${m.home.id}`} className="flex min-w-0 items-center justify-end gap-2.5 text-right font-semibold text-white hover:text-lime">
          <span className="truncate">{m.home.name}</span>
          <TeamBadge url={m.home.club?.logo_url ?? null} name={m.home.name} size={30} tone="dark" />
        </Link>
        {m.status === "live" ? (
          <span className="relative min-w-14 rounded-lg bg-red-600 px-3 py-1.5 text-center font-bold tabular-nums text-white">
            {m.home_score} – {m.away_score}
            <span className="absolute -top-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-1.5 text-[9px] font-extrabold text-red-600">
              <span className="size-1.5 animate-pulse rounded-full bg-red-600" aria-hidden />
              LIVE
            </span>
          </span>
        ) : finished ? (
          <span className="min-w-14 rounded-lg bg-white/10 px-3 py-1.5 text-center font-bold tabular-nums text-white">
            {m.home_score} – {m.away_score}
          </span>
        ) : (
          <span
            className={`min-w-14 rounded-lg px-3 py-1.5 text-center text-xs font-extrabold ${
              status ? "bg-gold-100 text-ink" : "bg-lime text-forest"
            }`}
          >
            {status ?? "VS"}
          </span>
        )}
        <Link href={`/echipe/${m.away.id}`} className="flex min-w-0 items-center gap-2.5 font-semibold text-white hover:text-lime">
          <TeamBadge url={m.away.club?.logo_url ?? null} name={m.away.name} size={30} />
          <span className="truncate">{m.away.name}</span>
        </Link>
        <span className="hidden truncate text-right text-[11px] text-white/40 sm:block">{m.venue}</span>
      </div>
      {(extra || note) && (
        <p className="mt-1.5 text-center text-[11px] text-white/50">
          {[extra, note].filter(Boolean).map((t, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {t}
            </span>
          ))}
        </p>
      )}
    </li>
  );
}
