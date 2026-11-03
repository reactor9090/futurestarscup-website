"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Iconițe mici, desenate cu linie (24×24), ca să nu depindem de o librărie.
const icons = {
  home: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z",
  trophy: "M8 4h8v5a4 4 0 01-8 0zM8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 21h8M10 17h4v4h-4z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  shield: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z",
  users: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M16 3.5a4 4 0 010 7.5M18 14a5 5 0 014 5v2",
  ball: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7l4 3-1.5 4.5h-5L8 10zM12 3v4M16 10l4.5-1.5M14.5 14.5l2.5 4M9.5 14.5L7 18.5M8 10L3.5 8.5",
  gift: "M4 10h16v11H4zM2 7h20v3H2zM12 7v14M12 7S10.5 3 8 3.5 7 7 12 7zM12 7s1.5-4 4-3.5S17 7 12 7z",
} as const;

const links = [
  { href: "/", label: "Acasă", icon: icons.home },
  { href: "/clasament", label: "Clasament", icon: icons.trophy },
  { href: "/meciuri", label: "Meciuri", icon: icons.calendar },
  { href: "/echipe", label: "Echipe", icon: icons.shield },
  { href: "/jucatori", label: "Jucători", icon: icons.users },
  { href: "/golgheteri", label: "Golgheteri", icon: icons.ball },
  { href: "/premii", label: "Premii", icon: icons.gift },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-1 rounded-2xl bg-forest/5 p-1 xl:flex" aria-label="Navigare principală">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(pathname, link.href) ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              isActive(pathname, link.href) ? "bg-forest text-white" : "text-ink/70 hover:bg-forest/5 hover:text-ink"
            }`}
          >
            <Icon d={link.icon} />
            {link.label}
          </Link>
        ))}
        <Link
          href="/inscriere"
          className="ml-1 rounded-xl bg-lime px-4 py-2 text-sm font-bold text-forest hover:brightness-95"
        >
          Înscrie echipa
        </Link>
      </nav>

      <button
        type="button"
        className="grid size-10 place-items-center rounded-xl text-ink hover:bg-forest/5 xl:hidden"
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
          className="absolute inset-x-0 top-full border-t border-line bg-white px-4 pb-4 pt-2 shadow-lg xl:hidden"
          aria-label="Navigare principală"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-semibold ${
                isActive(pathname, link.href) ? "bg-forest text-white" : "text-ink/75"
              }`}
            >
              <Icon d={link.icon} />
              {link.label}
            </Link>
          ))}
          <Link
            href="/inscriere"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-xl bg-lime px-3 py-2.5 text-center font-bold text-forest"
          >
            Înscrie echipa
          </Link>
        </nav>
      )}
    </>
  );
}
