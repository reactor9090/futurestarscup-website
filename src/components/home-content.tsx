import Image from "next/image";
import { SponsorsStrip } from "@/components/sponsors-strip";
import { getAnnouncements, getSponsors, type PublicAnnouncement } from "@/lib/public-data";

const date = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" });

export async function Announcements() {
  const all = await getAnnouncements();
  if (all.length === 0) return null;
  // Cele din carusel primele, ca bannere cu imagine; restul ca știri.
  const banners = all.filter((a) => a.is_banner);
  const news = all.filter((a) => !a.is_banner).slice(0, 6);

  return (
    <section className="mx-auto max-w-7xl space-y-6 px-4 pt-12 sm:px-6">
      <h2 className="font-display text-5xl font-extrabold leading-none tracking-tight text-forest sm:text-6xl">Noutăți</h2>
      {banners.length > 0 && (
        <ul className="flex snap-x gap-4 overflow-x-auto pb-2">
          {banners.map((a) => (
            <li key={a.id} className="w-[85%] shrink-0 snap-start sm:w-[28rem]">
              <AnnouncementCard announcement={a} large />
            </li>
          ))}
        </ul>
      )}
      {news.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {news.map((a) => (
            <li key={a.id}>
              <AnnouncementCard announcement={a} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AnnouncementCard({ announcement: a, large = false }: { announcement: PublicAnnouncement; large?: boolean }) {
  const content = (
    <>
      {a.image_url && (
        <Image
          src={a.image_url}
          alt=""
          width={800}
          height={450}
          className={`w-full object-cover ${large ? "aspect-video" : "aspect-[16/7]"}`}
        />
      )}
      <div className="space-y-1 p-4">
        <p className="text-xs text-muted">{date.format(new Date(a.published_at))}</p>
        <h3 className="font-display text-2xl font-extrabold tracking-tight text-forest">{a.title}</h3>
        {a.body && <p className="whitespace-pre-line text-sm text-muted">{a.body}</p>}
      </div>
    </>
  );
  const box = "block h-full overflow-hidden rounded-3xl border border-line bg-surface";
  return a.link_url ? (
    <a href={a.link_url} target="_blank" rel="noopener noreferrer" className={`${box} hover:border-forest`}>
      {content}
    </a>
  ) : (
    <div className={box}>{content}</div>
  );
}

export async function HomeSponsors() {
  const sponsors = await getSponsors();
  if (sponsors.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl space-y-4 px-4 pb-4 pt-12 sm:px-6">
      <h2 className="font-display text-5xl font-extrabold leading-none tracking-tight text-forest sm:text-6xl">Parteneri</h2>
      <SponsorsStrip sponsors={sponsors} />
    </section>
  );
}
