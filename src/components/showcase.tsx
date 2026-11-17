import { icons } from "@/components/icons";
import { StadiumBackdrop } from "@/components/stadium-backdrop";

/** Linie aurie care se stinge spre capete. */
export function GoldLine({ className = "" }: { className?: string }) {
  return <span className={`h-px flex-1 bg-gradient-to-r from-transparent via-lime/70 to-transparent ${className}`} aria-hidden />;
}

/** Text spațiat între două linii aurii (ex. „PARTENERI”). */
export function GoldDivider({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <GoldLine />
      <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/80">{children}</div>
      <GoldLine />
    </div>
  );
}

/**
 * Panoul închis „de gală” (parteneri, premii): fundalul stadionului, o stea aurie mare în colț
 * și titlul centrat sub „FUTURE STARS CUP”.
 */
export function ShowcasePanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-forest px-4 py-12 text-white sm:px-10 sm:py-16">
      <StadiumBackdrop dim />
      <div className="absolute inset-0 bg-forest/50" aria-hidden />
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute -right-10 -top-10 size-64 rotate-12 text-lime/15 sm:size-80"
        fill="currentColor"
        aria-hidden
      >
        <path d={icons.star} />
      </svg>

      <div className="relative mx-auto max-w-5xl">
        <div className="text-center">
          <GoldDivider className="mx-auto max-w-md">Future Stars Cup</GoldDivider>
          <h2 className="mt-4 font-display text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">{title}</h2>
          {subtitle && <p className="mt-3 text-white/70">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
