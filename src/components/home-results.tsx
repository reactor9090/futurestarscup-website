import Link from "next/link";
import { TeamBadge } from "@/components/club-logo";
import { Icon, icons } from "@/components/icons";
import { Eyebrow, Segmented } from "@/components/ui";
import { getCompetitions, getRecentResults, type RecentResult } from "@/lib/public-data";
import { roundTitle } from "@/lib/rounds";

// Secțiunea „Rezultate” de pe prima pagină: ultimele scoruri, filtrate pe sezon și categorie.
// Filtrele au parametrii lor (`rez_sezon`, `rez_cat`), ca să nu schimbe categoria celorlalte secțiuni.

const dateFormat = new Intl.DateTimeFormat("ro-RO", {
  timeZone: "Europe/Bucharest",
  day: "numeric",
  month: "long",
  year: "numeric",
});

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Adresa paginii de start cu filtrele de rezultate schimbate, păstrând restul parametrilor. */
function resultsHref(params: Params, changes: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const v = first(value);
    if (v && !(key in changes)) query.set(key, v);
  }
  for (const [key, value] of Object.entries(changes)) if (value) query.set(key, value);
  const qs = query.toString();
  return `/${qs ? `?${qs}` : ""}#rezultate`;
}

/** Câștigătorul: după scor, iar la egalitate după loviturile de departajare. */
function winner(m: RecentResult): "home" | "away" | null {
  const diff = (m.home_score ?? 0) - (m.away_score ?? 0) || (m.home_penalties ?? 0) - (m.away_penalties ?? 0);
  return diff > 0 ? "home" : diff < 0 ? "away" : null;
}

function ResultCard({ match: m }: { match: RecentResult }) {
  const won = winner(m);
  const penalties = m.home_penalties !== null && m.away_penalties !== null;
  const sides = [
    { key: "home", team: m.home, score: m.home_score, pens: m.home_penalties },
    { key: "away", team: m.away, score: m.away_score, pens: m.away_penalties },
  ] as const;

  return (
    <li className="rounded-3xl border border-line bg-surface p-5 transition hover:border-forest/30 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted">
            <span className="text-sm text-forest">{m.competition.category?.name ?? m.competition.name}</span>
            <span className="mx-1.5">·</span>
            {[m.competition.season?.name, roundTitle(m)].filter(Boolean).join(" · ")}
          </p>
          {m.kickoff_at && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Icon d={icons.calendar} className="size-3.5" />
              {dateFormat.format(new Date(m.kickoff_at))}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-lime px-3 py-1 text-[10px] font-extrabold text-forest">FINAL</span>
      </div>

      <div className="mt-4 divide-y divide-line">
        {sides.map(({ key, team, score, pens }) => (
          <Link key={key} href={`/echipe/${team.id}`} className="group flex items-center gap-4 py-2.5 first:pt-0 last:pb-0">
            <TeamBadge url={team.club?.logo_url ?? null} name={team.name} size={44} />
            <span className={`min-w-0 flex-1 truncate text-forest group-hover:text-pitch-700 ${won === key ? "font-bold" : "font-medium"}`}>
              {team.name}
            </span>
            {penalties && <span className="text-xs text-muted">({pens})</span>}
            <span
              className={`grid h-11 min-w-11 place-items-center rounded-xl px-2 font-display text-3xl font-extrabold tabular-nums ${
                won === key ? "bg-lime text-forest" : "text-forest"
              }`}
            >
              {score}
            </span>
          </Link>
        ))}
      </div>
    </li>
  );
}

export async function HomeResults({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const competitions = await getCompetitions();
  if (competitions.length === 0) return null;

  // Sezoanele în ordinea lor (curentul primul); implicit sezonul curent, toate categoriile.
  const seasons = [...new Set(competitions.map((c) => c.season?.name).filter((s): s is string => Boolean(s)))];
  const season = seasons.includes(first(params.rez_sezon)) ? first(params.rez_sezon) : (seasons[0] ?? "");
  const inSeason = competitions.filter((c) => (c.season?.name ?? "") === season);
  const categories = [...new Set(inSeason.map((c) => c.category?.name).filter((n): n is string => Boolean(n)))];
  const category = categories.includes(first(params.rez_cat)) ? first(params.rez_cat) : "";
  const selected = inSeason.filter((c) => !category || c.category?.name === category);

  const results = await getRecentResults(6, selected.map((c) => c.id));

  return (
    <section id="rezultate" className="scroll-mt-16">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <Eyebrow>Ultimele scoruri</Eyebrow>
          <h2 className="mt-3 font-display text-5xl font-extrabold leading-none tracking-tight text-forest sm:text-6xl">
            Rezultate
          </h2>
          <p className="mt-3 text-muted">Vezi ultimele meciuri și rezultate din toate categoriile de vârstă.</p>
        </div>
        <Link href="/meciuri" className="group flex items-center gap-2 text-sm font-bold text-forest">
          Toate meciurile
          <Icon d={icons.arrow} className="size-5 transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {categories.length > 1 && (
          <>
            <Segmented
              label="Categorie"
              options={[
                { href: resultsHref(params, { rez_cat: "" }), label: "Toate", active: !category },
                ...categories.map((name) => ({
                  href: resultsHref(params, { rez_cat: name }),
                  label: name,
                  active: name === category,
                })),
              ]}
            />
            {seasons.length > 1 && <span className="hidden h-8 w-px bg-line sm:block" aria-hidden />}
          </>
        )}
        {seasons.length > 1 && (
          // Meniu fără JavaScript; `key` îl închide după ce alegi un sezon.
          <details key={season} className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-forest hover:border-forest/40">
              <Icon d={icons.calendar} />
              Sezon {season}
              <Icon d={icons.chevron} className="size-4 rotate-90 transition group-open:-rotate-90" />
            </summary>
            <ul className="absolute left-0 z-10 mt-2 min-w-full overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-lg">
              {seasons.map((s) => (
                <li key={s}>
                  <Link
                    href={resultsHref(params, { rez_sezon: s, rez_cat: "" })}
                    scroll={false}
                    className={`block px-4 py-2 text-sm hover:bg-paper ${s === season ? "font-bold text-forest" : "text-muted"}`}
                  >
                    Sezon {s}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {results.length === 0 ? (
        <p className="mt-6 rounded-3xl border border-dashed border-line bg-surface p-8 text-center text-muted">
          Niciun rezultat încă {category ? `la ${category}` : ""} în sezonul {season}.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((m) => (
            <ResultCard key={m.id} match={m} />
          ))}
        </ul>
      )}
    </section>
  );
}
