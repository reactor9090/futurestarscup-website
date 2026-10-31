import Image from "next/image";

/** Poza jucătorului (doar cu acord) sau un cerc cu numărul tricoului / inițialele. */
export function PlayerAvatar({
  player: p,
  size,
}: {
  player: { first_name: string; last_name: string; photo_url: string | null; shirt_number?: number | null };
  size: number;
}) {
  if (p.photo_url) {
    return (
      <Image
        src={p.photo_url}
        alt={`${p.first_name} ${p.last_name}`}
        width={size}
        height={size}
        className="shrink-0 rounded-full bg-paper object-cover ring-4 ring-lime"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-forest font-display font-extrabold text-lime ring-4 ring-paper"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {p.shirt_number ?? `${p.first_name[0] ?? ""}${p.last_name[0] ?? ""}`}
    </span>
  );
}
