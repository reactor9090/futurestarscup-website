import Link from "next/link";

// Elemente comune ale site-ului public (stilul forest + lime).

export function Eyebrow({ children, className = "text-pitch-700" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${className}`}>{children}</p>;
}

export function SectionHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-2 font-display text-5xl font-extrabold leading-none tracking-tight text-forest sm:text-6xl">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

export function ArrowLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-2 text-sm font-bold text-pitch-800 ${className}`}>
      {children}
      <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-3xl border border-dashed border-line bg-surface p-8 text-center text-muted">{children}</p>
  );
}

/** Comutator cu pastile (categorie, etapă, vedere). Opțiunile sunt linkuri, deci selecția stă în adresă. */
export function Segmented({
  label,
  options,
  className = "",
  tone = "light",
}: {
  label: string;
  options: { href: string; label: string; active: boolean }[];
  className?: string;
  /** `dark` pe fundal verde închis: pastila activă devine lime. */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <nav
      className={`flex max-w-full flex-wrap gap-1 rounded-full p-1 ${dark ? "border border-white/10 bg-white/5" : "bg-forest/5"} ${className}`}
      aria-label={label}
    >
      {options.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          scroll={false}
          aria-current={o.active ? "page" : undefined}
          className={`rounded-full px-4 py-2 text-xs font-bold transition ${
            o.active
              ? dark
                ? "bg-lime text-forest"
                : "bg-forest text-white"
              : dark
                ? "text-white/60 hover:text-white"
                : "text-forest/55 hover:text-forest"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

/** Bulină cu poziția: lime pentru locurile evidențiate. */
export function PositionBadge({ position, highlight }: { position: number; highlight: boolean }) {
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold ${
        highlight ? "bg-lime text-forest" : "text-muted"
      }`}
    >
      {position}
    </span>
  );
}

/** Statistică mică: valoare mare, etichetă dedesubt. */
export function Stat({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dd className="font-display text-2xl font-extrabold tabular-nums leading-tight">{value}</dd>
      <dt className="text-[10px] font-semibold uppercase tracking-wider opacity-55">{label}</dt>
    </div>
  );
}

/** Golaveraj cu semn: +5, 0, −3 (minus tipografic). */
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");
