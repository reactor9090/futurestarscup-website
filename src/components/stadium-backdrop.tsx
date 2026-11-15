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
