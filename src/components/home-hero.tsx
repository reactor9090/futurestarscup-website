import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { TeamBadge } from "@/components/club-logo";
import { Eyebrow } from "@/components/ui";
import { positionLabels } from "@/lib/labels";
import { getCompetitions, getHeroTeams, getRoundAwards, type RoundAward } from "@/lib/public-data";

/** Fundalul hero-ului: poza terenului, ușor încețoșată, sub un strat închis ca textul să rămână lizibil. */
function HeroBackdrop() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <Image src="/hero.png" alt="" fill priority sizes="100vw" quality={70} className="scale-105 object-cover object-[center_35%] blur-[2px]" />
      <div className="absolute inset-0 bg-forest/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/15 to-transparent" />
    </div>
  );
}

/** Hero-ul paginii de start: caruselul „Jucătorul etapei”, sau prezentarea campionatului dacă nu există. */
export async function HomeHero() {
  const awards = await getRoundAwards();
  if (awards.length === 0) return <DefaultHero />;

  return (
    <section className="relative overflow-hidden bg-forest">
      <HeroBackdrop />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <ul className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:thin]" aria-label="Jucătorul etapei">
          {awards.map((a, i) => (
            <li key={a.id} className="w-full shrink-0 snap-start" aria-label={`${i + 1} din ${awards.length}`}>
              <AwardSlide award={a} />
            </li>
          ))}
        </ul>
        {awards.length > 1 && (
          <p className="mt-2 text-xs text-white/40">Glisează pentru ceilalți jucători ai etapei · {awards.length} premii</p>
        )}
      </div>
    </section>
  );
}

function AwardSlide({ award: a }: { award: RoundAward }) {
  const p = a.player;
  return (
    <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
      <div>
        <span className="inline-flex rounded-full bg-lime px-3 py-1.5 text-[11px] font-bold text-forest">
          {a.title} · {a.competition.name}
        </span>
        <h1 className="mt-5 font-display text-6xl font-extrabold uppercase leading-[0.9] tracking-tight text-white sm:text-8xl">
          {p.first_name}
          <br />
          <span className="text-lime">{p.last_name}</span>
        </h1>
        <p className="mt-4 flex items-center gap-2 text-white/70">
          <TeamBadge url={a.team.club?.logo_url ?? null} name={a.team.name} size={24} tone="dark" />
          {[a.team.name, p.position && positionLabels[p.position], a.shirt_number && `nr. ${a.shirt_number}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {a.body && <p className="mt-4 max-w-xl whitespace-pre-line text-white/70">{a.body}</p>}
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/jucatori/${p.id}`} className="rounded-xl bg-lime px-5 py-3 text-sm font-bold text-forest hover:brightness-95">
            Vezi profilul
          </Link>
          <Link
            href={`/clasament?competitie=${a.competition.id}`}
            className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            Clasamentul
          </Link>
        </div>
        {a.sponsor && (
          <p className="mt-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-white/50">
            Jucătorul etapei by
            {a.sponsor.logo_url ? (
              <Image src={a.sponsor.logo_url} alt={a.sponsor.name} width={110} height={32} className="h-7 w-auto rounded bg-white object-contain px-1.5" />
            ) : (
              <span className="text-sm normal-case text-white">{a.sponsor.name}</span>
            )}
          </p>
        )}
      </div>

      {/* Cartonașul jucătorului: poza (cu acord) sau numărul tricoului. */}
      <div className="mx-auto w-60 rotate-2 rounded-3xl bg-lime p-2.5 shadow-2xl sm:w-64">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-forest-soft">
          {p.photo_url ? (
            <Image src={p.photo_url} alt={`${p.first_name} ${p.last_name}`} fill sizes="256px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 grid place-items-center font-display text-[9rem] font-extrabold text-lime/90">
              {a.shirt_number ?? "★"}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between px-2 pb-1 pt-2.5 text-forest">
          <span className="font-display text-lg font-extrabold uppercase leading-none">
            {p.last_name}
            <span className="block text-[10px] font-bold tracking-wider opacity-60">{a.title}</span>
          </span>
          {a.shirt_number && (
            <span className="grid size-9 place-items-center rounded-full bg-forest font-display text-lg font-extrabold text-lime">
              {a.shirt_number}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DefaultHero() {
  return (
    <section className="relative overflow-hidden bg-forest">
      <HeroBackdrop />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_28rem]">
        <div>
        <Eyebrow className="text-lime">Ediția 2026-2027</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-7xl">
          Future Stars Cup <span className="text-lime">2026</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-white/70">
          Clasamente, program, rezultate și statistici pentru toate categoriile de vârstă, actualizate după fiecare meci.
        </p>
        <Suspense>
          <HeroCategories />
        </Suspense>
        <p className="mt-3 flex items-center gap-2 text-white/80">
          <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-lime" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          Stadionul Parcul La Izvor
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/clasament" className="rounded-xl bg-lime px-5 py-3 text-sm font-bold text-forest hover:brightness-95">
            Vezi clasamentul
          </Link>
          <Link href="/meciuri" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
            Programul meciurilor
          </Link>
        </div>
        </div>
        <Suspense>
          <TeamsPanel />
        </Suspense>
      </div>
    </section>
  );
}

/** Panou cu logourile echipelor participante, luate automat din baza de date. */
async function TeamsPanel() {
  const teams = await getHeroTeams();
  if (teams.length === 0) return null;
  return (
    <div className="relative mt-2 lg:mt-0">
      <span className="absolute -top-3 right-6 z-10 bg-gradient-to-r from-lime/80 to-lime px-6 py-1.5 font-display text-sm font-extrabold uppercase tracking-wider text-forest [clip-path:polygon(6%_0,100%_0,94%_100%,0_100%)]">
        Echipe participante
      </span>
      <div className="rounded-[2rem] border border-lime/50 bg-forest/70 p-4 pt-8 shadow-2xl backdrop-blur-sm sm:p-5 sm:pt-8">
        <ul className="grid grid-cols-4 gap-2 sm:gap-3">
          {teams.map((t) => (
            <li key={t.id}>
              <Link
                href={`/echipe/${t.id}`}
                title={t.name}
                className="grid aspect-square place-items-center rounded-xl border border-lime/25 bg-white/5 p-1 transition hover:border-lime hover:bg-white/10"
              >
                <TeamBadge url={t.logo_url} name={t.name} size={48} tone="dark" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Categoriile de vârstă din ediția curentă, ex. „U10 | U12 | U14”. */
async function HeroCategories() {
  const competitions = await getCompetitions();
  const season = competitions[0]?.season?.name;
  const names = [
    ...new Map(
      competitions
        .filter((c) => c.category && c.season?.name === season)
        .sort((a, b) => a.category!.sort_order - b.category!.sort_order)
        .map((c) => [c.category!.name, c.category!.name]),
    ).values(),
  ];
  if (names.length === 0) return null;
  return (
    <p className="mt-4 flex flex-wrap items-center gap-x-3 font-display text-2xl font-bold tracking-wide text-white">
      {names.map((n, i) => (
        <span key={n} className="flex items-center gap-3">
          {i > 0 && <span className="text-lime/70" aria-hidden>|</span>}
          {n}
        </span>
      ))}
    </p>
  );
}
