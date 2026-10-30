export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="bg-pitch-900 bg-[radial-gradient(ellipse_at_top_right,var(--color-pitch-700),transparent_60%)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide text-white sm:text-5xl">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-pitch-100/80">{description}</p>}
      </div>
    </div>
  );
}

// Temporar, până construim secțiunea (faza 4 din plan).
export function UnderConstruction({ items }: { items: string[] }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rounded-xl border border-dashed border-line bg-surface p-6 sm:p-8">
        <p className="font-display text-lg font-bold uppercase tracking-wide text-pitch-700">În construcție</p>
        <p className="mt-1 text-muted">Pe această pagină vor apărea:</p>
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
