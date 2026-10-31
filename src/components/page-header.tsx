import { Eyebrow } from "@/components/ui";

export function PageHeader({
  title,
  description,
  eyebrow = "Future Stars Cup",
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-forest">
      <div
        className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(90deg,var(--color-forest-soft)_0_80px,var(--color-forest)_80px_160px)]"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 py-12 sm:px-6 sm:py-16">
        <div>
          <Eyebrow className="text-lime">{eyebrow}</Eyebrow>
          <h1 className="mt-3 font-display text-5xl font-extrabold leading-none tracking-tight text-white sm:text-6xl">
            {title}
          </h1>
          {description && <p className="mt-3 max-w-2xl text-white/65">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

// Temporar, până construim secțiunea (faza 4 din plan).
export function UnderConstruction({ items }: { items: string[] }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-dashed border-line bg-surface p-6 sm:p-8">
        <p className="font-display text-lg font-bold uppercase tracking-wide text-pitch-700">În construcție</p>
        <p className="mt-1 text-muted">Pe această pagină vor apărea:</p>
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-lime" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
