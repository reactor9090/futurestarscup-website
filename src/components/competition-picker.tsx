import Link from "next/link";
import type { PublicCompetition } from "@/lib/public-data";

// Alegerea categoriei de vârstă; selecția stă în adresă (?competitie=id), deci se poate trimite ca link.
export function CompetitionPicker({
  basePath,
  competitions,
  selectedId,
}: {
  basePath: string;
  competitions: PublicCompetition[];
  selectedId: string;
}) {
  if (competitions.length < 2) return null;
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Categorie">
      {competitions.map((c) => (
        <Link
          key={c.id}
          href={`${basePath}?competitie=${c.id}`}
          aria-current={c.id === selectedId ? "page" : undefined}
          className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
            c.id === selectedId ? "border-pitch-700 bg-pitch-700 text-white" : "border-line bg-surface hover:bg-canvas"
          }`}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-center text-muted">{children}</p>
  );
}
