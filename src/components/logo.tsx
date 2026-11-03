import Image from "next/image";
import Link from "next/link";

// "light" = pe fundal închis (logo alb), "dark" = pe fundal deschis (culorile originale).
export function Logo({
  href = "/",
  tone = "light",
  height = 40,
}: {
  href?: string;
  tone?: "light" | "dark";
  height?: number;
}) {
  return (
    <Link href={href} className="flex shrink-0 items-center" aria-label="Future Stars Cup — acasă">
      <Image
        src="/logo.png"
        alt="Future Stars Cup"
        width={1000}
        height={578}
        priority
        className={tone === "light" ? "brightness-0 invert" : undefined}
        style={{ height, width: "auto" }}
      />
    </Link>
  );
}
