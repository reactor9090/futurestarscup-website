import Image from "next/image";

export function ClubLogo({ url, size = 40 }: { url: string | null; size?: number }) {
  return url ? (
    <Image src={url} alt="" width={size} height={size} className="rounded-md bg-white object-contain" style={{ width: size, height: size }} />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-md bg-pitch-100 text-pitch-700"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-1/2" fill="currentColor">
        <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
      </svg>
    </span>
  );
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** Logo-ul echipei sau, dacă lipsește, inițialele ei într-un pătrat rotunjit. */
export function TeamBadge({
  url,
  name,
  size = 32,
  tone = "light",
}: {
  url: string | null;
  name: string;
  size?: number;
  tone?: "light" | "dark";
}) {
  if (url) {
    return (
      <Image src={url} alt="" width={size} height={size} className="shrink-0 rounded-lg bg-white object-contain" style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center border font-extrabold ${size >= 56 ? "rounded-2xl tracking-wide" : size < 28 ? "rounded-md tracking-tight" : "rounded-lg tracking-wide"} ${
        tone === "dark" ? "border-lime/30 bg-lime/10 text-lime" : "border-pitch-700/10 bg-pitch-50 text-pitch-800"
      }`}
      // Textul crește odată cu insigna, ca inițialele să nu se piardă într-un pătrat mare.
      style={{ width: size, height: size, fontSize: Math.round(size < 28 ? size * 0.4 : size * 0.3) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
