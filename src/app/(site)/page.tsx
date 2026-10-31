import Link from "next/link";
import { Suspense } from "react";
import { Announcements, HomeSponsors } from "@/components/home-content";
import { DefaultHero, HomeHero } from "@/components/home-hero";
import { HomeResults } from "@/components/home-results";
import { HomeCompetitionSections } from "@/components/home-sections";
import { EmptyState } from "@/components/ui";
import { getCompetitions, pickCompetition } from "@/lib/public-data";

const moreLinks = [
  { href: "/echipe", title: "Echipe", text: "Loturile și istoricul meciurilor" },
  { href: "/jucatori", title: "Jucători", text: "Caută orice jucător" },
  { href: "/premii", title: "Premii", text: "Trofeele și câștigătorii" },
  { href: "/inscriere", title: "Înscrie echipa", text: "Participă la următoarea ediție" },
];

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Suspense fallback={<DefaultHero />}>
        <HomeHero />
      </Suspense>

      <Suspense fallback={<div className="h-[36rem] animate-pulse bg-forest" />}>
        <CompetitionSections searchParams={searchParams} />
      </Suspense>
      <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <Suspense>
          <HomeResults searchParams={searchParams} />
        </Suspense>
      </div>

      <Suspense>
        <Announcements />
      </Suspense>

      <section className="mx-auto max-w-7xl px-4 pb-4 pt-14 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {moreLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="group flex h-full items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 transition hover:border-forest"
              >
                <span>
                  <span className="block font-display text-2xl font-extrabold tracking-tight text-forest">{l.title}</span>
                  <span className="block text-sm text-muted">{l.text}</span>
                </span>
                <span aria-hidden className="text-forest transition group-hover:translate-x-0.5">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Suspense>
        <HomeSponsors />
      </Suspense>
    </>
  );
}

async function CompetitionSections({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { competitie } = await searchParams;
  const competitions = await getCompetitions();
  const selected = pickCompetition(competitions, competitie);
  if (!selected) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <EmptyState>Nicio competiție publicată încă.</EmptyState>
      </div>
    );
  }
  return <HomeCompetitionSections competition={selected} competitions={competitions} />;
}
