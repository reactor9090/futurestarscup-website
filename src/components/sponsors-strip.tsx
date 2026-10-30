import Image from "next/image";
import type { PublicSponsor } from "@/lib/public-data";

// Sponsorii grupați pe categorie (ex. „Partener principal”), în ordinea în care apar.
export function SponsorsStrip({ sponsors }: { sponsors: PublicSponsor[] }) {
  if (sponsors.length === 0) return null;
  const tiers = new Map<string, PublicSponsor[]>();
  for (const s of sponsors) tiers.set(s.tier ?? "Parteneri", [...(tiers.get(s.tier ?? "Parteneri") ?? []), s]);

  return (
    <div className="space-y-6">
      {[...tiers].map(([tier, list]) => (
        <div key={tier}>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted">{tier}</h3>
          <ul className="flex flex-wrap items-center gap-4">
            {list.map((s) => {
              const logo = s.logo_url ? (
                <Image src={s.logo_url} alt={s.name} width={160} height={80} className="h-16 w-auto object-contain" />
              ) : (
                <span className="font-semibold">{s.name}</span>
              );
              return (
                <li key={s.id} className="grid min-h-20 min-w-32 place-items-center rounded-xl border border-line bg-white px-4 py-2">
                  {s.website_url ? (
                    <a href={s.website_url} target="_blank" rel="noopener noreferrer" title={s.name}>
                      {logo}
                    </a>
                  ) : (
                    logo
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
