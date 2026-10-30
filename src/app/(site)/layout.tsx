import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { SiteNav } from "@/components/site-nav";

const footerLinks = [
  {
    title: "Competiție",
    links: [
      { href: "/clasament", label: "Clasament" },
      { href: "/meciuri", label: "Program și rezultate" },
      { href: "/golgheteri", label: "Golgheteri" },
      { href: "/premii", label: "Premii și sponsori" },
    ],
  },
  {
    title: "Participanți",
    links: [
      { href: "/echipe", label: "Echipe" },
      { href: "/jucatori", label: "Jucători" },
      { href: "/inscriere", label: "Înscriere echipă" },
    ],
  },
];

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-40 bg-pitch-950">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <Suspense>
            <SiteNav />
          </Suspense>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 bg-pitch-950 text-pitch-100/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm">
              Campionatul de fotbal pentru copii. Clasamente, program și statistici actualizate după fiecare meci.
            </p>
          </div>
          {footerLinks.map((col) => (
            <div key={col.title}>
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">{col.title}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link className="hover:text-white" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs">© Future Stars Cup</div>
      </footer>
    </>
  );
}
