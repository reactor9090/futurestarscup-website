import Image from "next/image";
import Link from "next/link";
import { TeamBadge } from "@/components/club-logo";
import { Eyebrow } from "@/components/ui";
import { positionLabels } from "@/lib/labels";
import { getRoundAwards, type RoundAward } from "@/lib/public-data";

const stripes =
  "absolute inset-0 opacity-40 [background:repeating-linear-gradient(90deg,var(--color-forest-soft)_0_80px,var(--color-forest)_80px_160px)]";

/** Hero-ul paginii de start: caruselul „Jucătorul etapei”, sau prezentarea campionatului dacă nu există. */
export async function HomeHero() {
  const awards = await getRoundAwards();
  if (awards.length === 0) return <DefaultHero />;

  return (
    <section className="relative overflow-hidden bg-forest">
      <div className={stripes} aria-hidden />
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
      <div className={stripes} aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/60 to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <Eyebrow className="text-lime">Sezonul 2026/2027</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-7xl">
          Campionatul viitorilor <span className="text-lime">campioni</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-white/70">
          Clasamente, program, rezultate și statistici pentru toate categoriile de vârstă, actualizate după fiecare meci.
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
    </section>
  );
}
