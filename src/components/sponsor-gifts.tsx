import Image from "next/image";
import { Icon, icons } from "@/components/icons";
import { ShowcasePanel } from "@/components/showcase";
import type { PublicSponsorGift } from "@/lib/public-data";

const DEFAULT_RECIPIENTS = "Fiecare jucător";

/** Ramură de lauri (stânga); cea din dreapta e oglindită. */
function Laurel({ flip = false }: { flip?: boolean }) {
  const leaves = [
    [10, 8],
    [8, 15],
    [6.5, 22],
    [6, 29],
    [6.5, 36],
  ];
  return (
    <svg viewBox="0 0 24 48" className={`h-10 w-5 shrink-0 text-lime ${flip ? "-scale-x-100" : ""}`} fill="currentColor" aria-hidden>
      <path d="M18 46C8 40 4 30 5 18 6 11 9 5 13 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {leaves.map(([x, y]) => (
        <ellipse key={y} cx={x} cy={y} rx="4.2" ry="1.9" transform={`rotate(-40 ${x} ${y})`} />
      ))}
    </svg>
  );
}

function GiftCard({ gift: g }: { gift: PublicSponsorGift }) {
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-3xl border border-lime/60 bg-forest/70 shadow-[0_0_30px_-8px_var(--color-lime)] backdrop-blur-sm transition hover:border-lime">
      {/* Lumina aurie din spatele produsului și firul luminos de jos. */}
      <span
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_42%,color-mix(in_oklab,var(--color-lime)_28%,transparent),transparent_70%)]"
        aria-hidden
      />
      <span className="absolute inset-x-[20%] bottom-0 h-px bg-gradient-to-r from-transparent via-lime to-transparent" aria-hidden />

      <span className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-lime px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-forest shadow-lg">
        <Icon d={icons.users} className="size-3.5" />
        {g.recipients?.trim() || DEFAULT_RECIPIENTS}
      </span>

      <div className="relative aspect-[4/3]">
        {g.image_url ? (
          <Image
            src={g.image_url}
            alt={g.title}
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
            className="object-contain p-8 pt-12 drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="grid size-full place-items-center">
            <Icon d={icons.star} className="size-20 text-lime drop-shadow-[0_0_18px_var(--color-lime)]" />
          </span>
        )}
      </div>

      <div className="relative mt-auto px-5 pb-6 text-center">
        <h3 className="font-display text-2xl font-extrabold leading-tight tracking-tight">{g.title}</h3>
        {g.description && <p className="mt-1 text-sm text-white/65">{g.description}</p>}
        {g.sponsor && (
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-white/55">
            oferit de
            {g.sponsor.logo_url ? (
              <span className="grid h-6 place-items-center rounded bg-white px-1.5">
                <Image src={g.sponsor.logo_url} alt={g.sponsor.name} width={80} height={24} className="h-4 w-auto object-contain" />
              </span>
            ) : (
              <span className="font-semibold text-white/85">{g.sponsor.name}</span>
            )}
          </p>
        )}
      </div>
    </li>
  );
}

/** Secțiunea „Premiile partenerilor”: ce primesc jucătorii de la sponsori, în carduri cu poza produsului. */
export function SponsorGifts({ gifts }: { gifts: PublicSponsorGift[] }) {
  if (gifts.length === 0) return null;
  // Puține premii stau centrate, nu lipite în stânga unui grid de 3.
  const cols = gifts.length === 1 ? "max-w-sm" : gifts.length === 2 ? "max-w-3xl sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <ShowcasePanel title="Premiile partenerilor" subtitle="Performanța merită recompensată!">
      <ul className={`mx-auto mt-12 grid gap-6 ${cols}`}>
        {gifts.map((g) => (
          <GiftCard key={g.id} gift={g} />
        ))}
      </ul>
      <div className="mt-12 flex items-center justify-center gap-4 sm:gap-6">
        <Laurel />
        <p className="text-center font-display text-base font-extrabold uppercase tracking-[0.3em] text-lime sm:text-xl">
          Mulțumim partenerilor noștri
        </p>
        <Laurel flip />
      </div>
    </ShowcasePanel>
  );
}
