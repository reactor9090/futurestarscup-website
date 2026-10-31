import Link from "next/link";

export function Logo({ href = "/", tone = "light" }: { href?: string; tone?: "light" | "dark" }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5" aria-label="Future Stars Cup — acasă">
      <span className="grid size-9 place-items-center rounded-lg bg-lime text-forest">
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      </span>
      <span
        className={`font-display text-xl font-extrabold uppercase leading-none tracking-wide ${
          tone === "light" ? "text-white" : "text-ink"
        }`}
      >
        Future Stars <span className="text-lime">Cup</span>
      </span>
    </Link>
  );
}
