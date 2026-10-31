import Link from "next/link";
import { TeamBadge } from "@/components/club-logo";
import { Icon, icons } from "@/components/icons";
import { signed } from "@/components/ui";
import type { FormResult } from "@/lib/form";
import type { StandingsTable } from "@/lib/public-data";

// Tabelul de clasament (cu forma) și legenda lui, folosite pe prima pagină și în /clasament.

export type StandingsRow = StandingsTable["rows"][number];

const formStyle: Record<FormResult, string> = {
  V: "bg-pitch-600 text-white",
  E: "bg-gold-400 text-ink",
  Î: "bg-danger text-white",
};
const formTitle: Record<FormResult, string> = { V: "Victorie", E: "Egal", Î: "Înfrângere" };

/** Ultimele 5 rezultate; locurile goale (meciuri încă nejucate) apar ca „-”. */
export function FormSlots({ form }: { form: FormResult[] }) {
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

export function StandingsRows({ rows }: { rows: StandingsRow[] }) {
  return (
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
  );
}

export function StandingsLegend({ className = "" }: { className?: string }) {
  return (
    <p className={`m-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl bg-paper/70 px-4 py-3 text-xs text-muted ${className}`}>
      <Icon d={icons.info} className="size-4 text-forest/50" />
      <span>J – meciuri</span>
      <span>V – victorii</span>
      <span>E – egaluri</span>
      <span>Î – înfrângeri</span>
      <span>+/− – golaveraj</span>
      <span>Pct – puncte</span>
      <span>Formă – ultimele 5 meciuri</span>
    </p>
  );
}
