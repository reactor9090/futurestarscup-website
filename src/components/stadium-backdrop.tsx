import Image from "next/image";

/**
 * Fundalul cu poza stadionului, ușor încețoșată, sub un strat închis ca textul alb să rămână lizibil.
 * Se pune într-un părinte `relative overflow-hidden`; conținutul de deasupra are nevoie de `relative`.
 * `dim` = header-ele scurte ale paginilor interioare primesc un strat mai închis decât hero-ul.
 */
export function StadiumBackdrop({ dim = false }: { dim?: boolean }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      <Image
        src="/hero.png"
        alt=""
        fill
        priority
        sizes="100vw"
        quality={70}
        className="scale-105 object-cover object-[center_35%] blur-[2px]"
      />
      <div className={`absolute inset-0 ${dim ? "bg-forest/65" : "bg-forest/45"}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/15 to-transparent" />
    </div>
  );
}

const STAR = "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z";

/**
 * Fundalul auriu al secțiunilor închise de pe prima pagină (program, golgheteri), desenat din cod:
 * strălucire caldă în colțuri, câteva linii aurii curbate și stele discrete în dreapta sus.
 * Liniile nu se îngroașă când SVG-ul se întinde (non-scaling-stroke), deci arată curat la orice lățime.
 * `tone="light"` = același motiv, mult mai discret, pe fundalul crem al secțiunilor deschise.
 */
export function GoldBackdrop({ id, tone = "dark" }: { id: string; tone?: "dark" | "light" }) {
  const ref = (name: string) => `${id}-${name}`;
  const light = tone === "light";
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${light ? "bg-paper" : "bg-forest"}`} aria-hidden>
      {/* Strălucirea din colțuri și o pată caldă, slabă, în mijloc. */}
      {light ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_50%_at_0%_0%,color-mix(in_oklab,var(--color-lime)_16%,transparent),transparent_70%),radial-gradient(ellipse_40%_50%_at_100%_100%,color-mix(in_oklab,var(--color-lime)_14%,transparent),transparent_70%)]" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_55%_at_0%_0%,color-mix(in_oklab,var(--color-lime)_30%,transparent),transparent_70%),radial-gradient(ellipse_40%_50%_at_100%_100%,color-mix(in_oklab,var(--color-lime)_28%,transparent),transparent_70%),radial-gradient(ellipse_60%_50%_at_55%_60%,color-mix(in_oklab,var(--color-lime)_6%,transparent),transparent_75%)]" />
      )}

      <svg className={`absolute inset-0 size-full ${light ? "opacity-45" : ""}`} viewBox="0 0 1600 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id={ref("gold-line-a")} x1="0" x2="1">
            <stop offset="0" stopColor="var(--color-lime)" stopOpacity="0" />
            <stop offset="0.35" stopColor="var(--color-lime)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--color-lime)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={ref("gold-line-b")} x1="0" x2="1">
            <stop offset="0" stopColor="var(--color-lime)" stopOpacity="0" />
            <stop offset="0.75" stopColor="var(--color-lime)" stopOpacity="0.85" />
            <stop offset="1" stopColor="var(--color-lime)" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id={ref("gold-line-faint")} x1="0" x2="1">
            <stop offset="0" stopColor="var(--color-lime)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--color-lime)" stopOpacity="0.25" />
            <stop offset="1" stopColor="var(--color-lime)" stopOpacity="0" />
          </linearGradient>
          <filter id={ref("gold-glow")} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Linia de sus, din stânga: un halou difuz plus firul subțire. */}
        <path d="M-50 320 C 250 200, 420 80, 700 -20" fill="none" stroke={`url(#${ref("gold-line-a")})`} strokeWidth="4" filter={`url(#${ref("gold-glow")})`} vectorEffect="non-scaling-stroke" opacity="0.5" />
        <path d="M-50 320 C 250 200, 420 80, 700 -20" fill="none" stroke={`url(#${ref("gold-line-a")})`} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <path d="M-50 520 C 300 420, 700 380, 1100 250 S 1500 40, 1700 -10" fill="none" stroke={`url(#${ref("gold-line-faint")})`} strokeWidth="1" vectorEffect="non-scaling-stroke" />

        {/* Linia de jos, spre dreapta. */}
        <path d="M-50 720 C 300 840, 700 920, 1000 820 S 1400 640, 1700 660" fill="none" stroke={`url(#${ref("gold-line-b")})`} strokeWidth="4" filter={`url(#${ref("gold-glow")})`} vectorEffect="non-scaling-stroke" opacity="0.5" />
        <path d="M-50 720 C 300 840, 700 920, 1000 820 S 1400 640, 1700 660" fill="none" stroke={`url(#${ref("gold-line-b")})`} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Stelele din dreapta sus, abia vizibile (în SVG separat ca să nu se deformeze). */}
      <svg className={`absolute right-[3%] top-[6%] w-40 sm:w-56 ${light ? "text-lime/[0.12]" : "text-lime/[0.07]"}`} viewBox="0 0 60 40" fill="currentColor">
        <path d={STAR} transform="translate(32 0) scale(1.15)" />
        <path d={STAR} transform="translate(19 13) scale(0.6)" />
        <path d={STAR} transform="translate(10 21) scale(0.4)" />
      </svg>

      {/* Umbră spre margini, ca centrul (unde e conținutul) să rămână cel mai liniștit. */}
      {!light && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,color-mix(in_oklab,var(--color-forest)_45%,transparent))]" />}
    </div>
  );
}
