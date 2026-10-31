import Link from "next/link";
import { Icon, icons } from "@/components/icons";

/** Comutatorul grilă / listă; `href` construiește adresa pentru fiecare vedere (păstrând filtrele). */
export function ViewToggle({ list, href }: { list: boolean; href: (view: "grila" | "lista") => string }) {
  return (
    <nav className="flex gap-1.5" aria-label="Afișare">
      {(["grila", "lista"] as const).map((view) => {
        const active = (view === "lista") === list;
        return (
          <Link
            key={view}
            href={href(view)}
            scroll={false}
            aria-label={view === "grila" ? "Afișare ca grilă" : "Afișare ca listă"}
            aria-current={active ? "page" : undefined}
            className={`grid size-11 place-items-center rounded-xl border transition ${
              active ? "border-forest bg-forest text-white" : "border-line bg-surface text-forest hover:border-forest"
            }`}
          >
            <Icon d={view === "grila" ? icons.grid : icons.list} className="size-5" />
          </Link>
        );
      })}
    </nav>
  );
}

/** Locul: lime pentru primul, argintiu și bronz pentru 2 și 3. */
export function PlaceBadge({ position, size = "md" }: { position: number | null; size?: "md" | "sm" }) {
  if (position === null) return null;
  const tone =
    position === 1
      ? "bg-lime text-forest"
      : position === 2
        ? "bg-slate-200 text-forest"
        : position === 3
          ? "bg-[#e8c3a3] text-forest"
          : "bg-forest/5 text-forest";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl font-display font-extrabold ${tone} ${size === "md" ? "size-11 text-2xl" : "size-9 text-lg"}`}
    >
      {position}
    </span>
  );
}
