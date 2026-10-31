import { slugify } from "@/lib/slug";

// Gruparea meciurilor pe etape, pentru /meciuri și pagina de start.

type RoundMatch = {
  round: number | null;
  round_label: string | null;
  status: "scheduled" | "finished" | "postponed" | "cancelled";
  stage: { name: string; sort_order: number } | null;
};

/** Etapa unui meci ca titlu: eticheta („Finala”), „Etapa 3” sau „Alte meciuri”. */
export const roundTitle = (m: RoundMatch) => m.round_label ?? (m.round ? `Etapa ${m.round}` : "Alte meciuri");

export type Round<M> = { key: string; title: string; stageName: string | null; matches: M[] };

/**
 * Etapele în ordinea fazelor, apoi în ordinea în care apar (meciurile vin sortate după oră).
 * Cheia e stabilă la adăugarea de meciuri, ca linkurile `?etapa=` să rămână valabile.
 */
export function groupRounds<M extends RoundMatch>(matches: M[]): Round<M>[] {
  const rounds = new Map<string, Round<M> & { order: number }>();
  for (const m of matches) {
    const order = m.stage?.sort_order ?? 0;
    const title = roundTitle(m);
    const key = `${order}-${m.round_label ? slugify(m.round_label) : (m.round ?? "x")}`;
    const round = rounds.get(key) ?? { key, title, stageName: m.stage?.name ?? null, matches: [], order };
    round.matches.push(m);
    rounds.set(key, round);
  }
  return [...rounds.values()]
    .map((r, i) => ({ ...r, index: i }))
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map(({ key, title, stageName, matches }) => ({ key, title, stageName, matches }));
}

/** Etapa curentă: prima cu meciuri încă de jucat, altfel ultima. */
export function currentRound<M extends RoundMatch>(rounds: Round<M>[]): Round<M> | null {
  return rounds.find((r) => r.matches.some((m) => m.status === "scheduled")) ?? rounds.at(-1) ?? null;
}
