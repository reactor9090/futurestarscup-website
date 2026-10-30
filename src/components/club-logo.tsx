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
