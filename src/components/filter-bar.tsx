// Bara de căutare și filtre: un formular GET simplu, deci funcționează fără JavaScript
// și rezultatul se poate trimite ca link.

const field =
  "block w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-lime/60";

export function FilterBar({
  action,
  hidden,
  search,
  selects = [],
}: {
  action: string;
  hidden: Record<string, string>;
  search: { value: string; placeholder: string };
  selects?: { name: string; label: string; value: string; options: [string, string][] }[];
}) {
  return (
    <form action={action} className="flex flex-col gap-2 rounded-3xl border border-line bg-surface/60 p-2 sm:flex-row">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input
        type="search"
        name="q"
        defaultValue={search.value}
        placeholder={search.placeholder}
        aria-label={search.placeholder}
        className={`${field} sm:flex-[2]`}
      />
      {selects.map((s) => (
        <select key={s.name} name={s.name} defaultValue={s.value} aria-label={s.label} className={`${field} sm:flex-1`}>
          {s.options.map(([value, label]) => (
            <option key={value} value={value}>
              {s.name === "sort" ? `Sortează: ${label}` : label}
            </option>
          ))}
        </select>
      ))}
      <button className="rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest-soft">Aplică</button>
    </form>
  );
}
