export const inputClass =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-pitch-500 focus:ring-2 focus:ring-pitch-500/20";

export function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-xs font-medium text-muted ${className}`}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
