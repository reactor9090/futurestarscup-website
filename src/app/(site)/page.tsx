import Link from "next/link";
import { Suspense } from "react";
import { Announcements, HomeSponsors } from "@/components/home-content";

const sections = [
  { href: "/clasament", title: "Clasament", text: "Pozițiile echipelor pe fiecare categorie de vârstă, calculate automat." },
  { href: "/meciuri", title: "Program și rezultate", text: "Toate meciurile, pe etape: ora, terenul și scorul final." },
  { href: "/golgheteri", title: "Golgheteri", text: "Cei mai buni marcatori și pasatori ai campionatului." },
  { href: "/echipe", title: "Echipe", text: "Profilul fiecărei echipe, lotul de jucători și istoricul meciurilor." },
  { href: "/jucatori", title: "Jucători", text: "Caută orice jucător și vezi-i statisticile." },
  { href: "/premii", title: "Premii și sponsori", text: "Trofeele puse în joc, câștigătorii și partenerii noștri." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-pitch-950">
        <div
          className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(90deg,var(--color-pitch-900)_0_80px,var(--color-pitch-800)_80px_160px)]"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pitch-950 via-pitch-950/70 to-transparent" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gold-500">Sezonul 2026/2027</p>
          <h1 className="mt-3 max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-wide text-white sm:text-7xl">
            Campionatul viitorilor <span className="text-gold-500">campioni</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-pitch-100/80">
            Clasamente, program, rezultate și statistici pentru toate categoriile de vârstă — actualizate după fiecare meci.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/clasament"
              className="rounded-md bg-gold-500 px-5 py-3 font-semibold text-pitch-950 hover:bg-gold-400"
            >
              Vezi clasamentul
            </Link>
            <Link
              href="/meciuri"
              className="rounded-md border border-white/20 px-5 py-3 font-semibold text-white hover:bg-white/10"
            >
              Programul meciurilor
            </Link>
          </div>
        </div>
      </section>

      <Suspense>
        <Announcements />
      </Suspense>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group rounded-xl border border-line bg-surface p-6 transition hover:-translate-y-0.5 hover:border-pitch-500 hover:shadow-md"
            >
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide group-hover:text-pitch-700">
                {s.title}
              </h2>
              <p className="mt-1.5 text-muted">{s.text}</p>
            </Link>
          ))}
        </div>
      </section>
      <Suspense>
        <HomeSponsors />
      </Suspense>
    </>
  );
}
