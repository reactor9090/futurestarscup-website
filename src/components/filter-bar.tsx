import Form from "next/form";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Icon, icons } from "@/components/icons";

// Bara de căutare și filtre: un formular GET, deci funcționează și fără JavaScript și rezultatul se poate
// trimite ca link. Cu JavaScript, listele se aplică imediat, iar pagina nu mai sare sus.

const field =
  "block w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-lime/60";

export function FilterBar({
  action,
  hidden,
  search,
  selects = [],
}: {
  action: string;
  hidden: Record<string, string>;
  search?: { value: string; placeholder: string };
  selects?: { name: string; label: string; value: string; options: [string, string][] }[];
}) {
  return (
    <Form action={action} scroll={false} replace className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {search && (
        <label className="relative min-w-0 sm:flex-[2]">
          <Icon d={icons.search} className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={search.value}
            placeholder={search.placeholder}
            aria-label={search.placeholder}
            className={`${field} pl-10`}
          />
        </label>
      )}
      {selects.map((s) => (
        <AutoSubmitSelect key={s.name} name={s.name} defaultValue={s.value} aria-label={s.label} className={`${field} sm:flex-1`}>
          {s.options.map(([value, label]) => (
            <option key={value} value={value}>
              {s.name === "sort" ? `Sortează: ${label}` : label}
            </option>
          ))}
        </AutoSubmitSelect>
      ))}
      {/* Enter în căutare trimite formularul; butonul e doar pentru cititoarele de ecran. */}
      <button className="sr-only">Caută</button>
    </Form>
  );
}
