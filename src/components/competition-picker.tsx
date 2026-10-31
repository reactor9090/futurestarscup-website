import { Segmented } from "@/components/ui";
import type { PublicCompetition } from "@/lib/public-data";

/** Eticheta scurtă: categoria pentru sezonul curent, numele complet pentru sezoanele vechi. */
export const competitionLabel = (c: PublicCompetition) =>
  c.season?.is_current && c.category ? c.category.name : c.name;

// Alegerea categoriei de vârstă; selecția stă în adresă (?competitie=id), deci se poate trimite ca link.
// `params` păstrează ceilalți parametri ai paginii (ex. vederea), `anchor` readuce pagina la secțiune.
export function CompetitionPicker({
  basePath,
  competitions,
  selectedId,
  params = {},
  anchor,
  className,
  tone,
}: {
  basePath: string;
  competitions: PublicCompetition[];
  selectedId: string;
  params?: Record<string, string>;
  anchor?: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  if (competitions.length < 2) return null;
  return (
    <Segmented
      label="Categorie"
      className={className}
      tone={tone}
      options={competitions.map((c) => ({
        href: `${basePath}?${new URLSearchParams({ ...params, competitie: c.id })}${anchor ? `#${anchor}` : ""}`,
        label: competitionLabel(c),
        active: c.id === selectedId,
      }))}
    />
  );
}

export { EmptyState } from "@/components/ui";
