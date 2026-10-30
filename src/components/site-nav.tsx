"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Acasă" },
  { href: "/clasament", label: "Clasament" },
  { href: "/meciuri", label: "Meciuri" },
  { href: "/echipe", label: "Echipe" },
  { href: "/jucatori", label: "Jucători" },
  { href: "/golgheteri", label: "Golgheteri" },
  { href: "/premii", label: "Premii" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigare principală">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive(pathname, link.href)
                ? "bg-white/10 text-white"
                : "text-pitch-100/80 hover:bg-white/5 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/inscriere"
          className="ml-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-pitch-950 hover:bg-gold-400"
        >
          Înscrie echipa
        </Link>
      </nav>

      <button
        type="button"
        className="grid size-10 place-items-center rounded-md text-white hover:bg-white/10 lg:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Închide meniul" : "Deschide meniul"}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <nav
          id="mobile-nav"
          className="absolute inset-x-0 top-full border-t border-white/10 bg-pitch-950 px-4 pb-4 pt-2 shadow-lg lg:hidden"
          aria-label="Navigare principală"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-2.5 text-base font-medium ${
                isActive(pathname, link.href) ? "bg-white/10 text-white" : "text-pitch-100/80"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/inscriere"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-md bg-gold-500 px-3 py-2.5 text-center font-semibold text-pitch-950"
          >
            Înscrie echipa
          </Link>
        </nav>
      )}
    </>
  );
}
