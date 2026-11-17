import Image from "next/image";
import { Icon, icons } from "@/components/icons";
import { GoldDivider, ShowcasePanel } from "@/components/showcase";
import type { PublicSponsor } from "@/lib/public-data";

const DEFAULT_TIER = "Parteneri";
const MAIN_TIER = "Partener principal";

/**
 * Partenerii principali = cei cu „principal” în categorie. Dacă nu e marcat niciunul și există un singur
 * partener, el devine automat partenerul principal, ca secțiunea să nu arate goală.
 */
function splitSponsors(sponsors: PublicSponsor[]) {
  let main = sponsors.filter((s) => s.tier && /principal/i.test(s.tier));
  if (main.length === 0 && sponsors.length === 1) main = sponsors;
  const rest = sponsors.filter((s) => !main.includes(s));
  const tiers = new Map<string, PublicSponsor[]>();
  for (const s of rest) {
    const tier = s.tier?.trim() || DEFAULT_TIER;
    tiers.set(tier, [...(tiers.get(tier) ?? []), s]);
  }
  return { main, tiers: [...tiers] };
}

/** Logo-ul pe o plăcuță albă (logo-urile pot fi închise la culoare), urmat de nume. */
function SponsorMark({
  sponsor,
  size,
}: {
  sponsor: PublicSponsor;
  size: "lg" | "sm";
}) {
  const lg = size === "lg";
  return (
    <span
      className={`flex min-w-0 items-center justify-center ${lg ? "gap-5" : "gap-3"}`}
    >
      {sponsor.logo_url ? (
        <span
          className={`grid shrink-0 place-items-center rounded-xl bg-white ${lg ? "h-16 px-3 sm:h-20" : "h-11 px-2"}`}
        >
          <Image
            src={sponsor.logo_url}
            alt=""
            width={lg ? 200 : 120}
            height={lg ? 80 : 44}
            className={`w-auto object-contain ${lg ? "h-12 max-w-40 sm:h-16" : "h-8 max-w-24"}`}
          />
        </span>
      ) : (
        <span
          className={`shrink-0 font-display font-extrabold italic text-lime ${lg ? "text-4xl" : "text-2xl"}`}
          aria-hidden
        >
          {"//"}
        </span>
      )}
      <span
        className={`truncate font-display font-extrabold tracking-tight text-white ${lg ? "text-3xl sm:text-5xl" : "text-xl"}`}
      >
        {sponsor.name}
      </span>
    </span>
  );
}

function SponsorLink({
  sponsor,
  className,
  children,
}: {
  sponsor: PublicSponsor;
  className: string;
  children: React.ReactNode;
}) {
  return sponsor.website_url ? (
    <a
      href={sponsor.website_url}
      target="_blank"
      rel="noopener noreferrer"
      title={sponsor.name}
      className={className}
    >
      {children}
    </a>
  ) : (
    <div className={className}>{children}</div>
  );
}

/** Secțiunea „Partenerii noștri”: partenerul principal mare, ceilalți pe categorii, pe fundalul stadionului. */
export function SponsorsStrip({ sponsors }: { sponsors: PublicSponsor[] }) {
  if (sponsors.length === 0) return null;
  const { main, tiers } = splitSponsors(sponsors);

  return (
    <ShowcasePanel
      title="Partenerii noștri"
      subtitle="Alături de noi în dezvoltarea tinerilor fotbaliști."
    >
      {main.length > 0 && (
        <ul className="mt-12 space-y-8">
          {main.map((s) => (
            <li key={s.id} className="relative">
              <span className="absolute -top-3.5 left-5 z-10 flex items-center gap-2 rounded-full bg-lime px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-forest shadow-lg sm:left-8">
                <Icon d={icons.crown} className="size-3.5" />
                {s.tier?.trim() || MAIN_TIER}
              </span>
              <SponsorLink
                sponsor={s}
                className="relative block overflow-hidden rounded-2xl border border-lime/60 bg-forest/70 px-6 py-10 shadow-2xl backdrop-blur-sm transition hover:border-lime sm:py-12"
              >
                <span
                  className="absolute inset-x-[15%] top-0 h-px bg-gradient-to-r from-transparent via-lime to-transparent"
                  aria-hidden
                />
                <span
                  className="absolute inset-x-[25%] bottom-0 h-px bg-gradient-to-r from-transparent via-lime to-transparent"
                  aria-hidden
                />
                <SponsorMark sponsor={s} size="lg" />
              </SponsorLink>
            </li>
          ))}
        </ul>
      )}

      {tiers.map(([tier, list]) => (
        <div key={tier} className="mt-10 space-y-5">
          <GoldDivider>{tier}</GoldDivider>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((s) => (
              <li key={s.id}>
                <SponsorLink
                  sponsor={s}
                  className="flex h-full items-center justify-center rounded-2xl border border-white/20 bg-forest/60 px-4 py-5 backdrop-blur-sm transition hover:border-lime/70"
                >
                  <SponsorMark sponsor={s} size="sm" />
                </SponsorLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </ShowcasePanel>
  );
}
