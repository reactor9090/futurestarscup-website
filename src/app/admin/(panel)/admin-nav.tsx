"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Secțiunile marcate `soon` se construiesc în faza 2 (admin core) și 5–6.
export const adminSections = [
  { href: "/admin", label: "Panou" },
  { href: "/admin/sezoane", label: "Sezoane și categorii" },
  { href: "/admin/competitii", label: "Competiții și faze" },
  { href: "/admin/echipe", label: "Cluburi, echipe, jucători" },
  { href: "/admin/meciuri", label: "Meciuri și rezultate", soon: true },
  { href: "/admin/inscrieri", label: "Înscrieri", soon: true },
  { href: "/admin/continut", label: "Anunțuri, sponsori, premii", soon: true },
];

export function AdminNav() {
  return <AdminNavLinks pathname={usePathname()} />;
}

// Separat de AdminNav, ca layout-ul să-l poată afișa și ca fallback de <Suspense>
// (pe rute dinamice precum /admin/echipe/[teamId] adresa curentă nu e cunoscută la prerender).
export function AdminNavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible" aria-label="Administrare">
      {adminSections.map((s) =>
        s.soon ? (
          <span
            key={s.href}
            className="flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-pitch-100/40"
          >
            {s.label}
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">curând</span>
          </span>
        ) : (
          <Link
            key={s.href}
            href={s.href}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
              pathname === s.href ? "bg-white/10 text-white" : "text-pitch-100/80 hover:bg-white/5 hover:text-white"
            }`}
          >
            {s.label}
          </Link>
        ),
      )}
      <Link
        href="/"
        className="shrink-0 rounded-md px-3 py-2 text-sm text-pitch-100/60 hover:text-white lg:mt-4"
      >
        ← Vezi site-ul
      </Link>
    </nav>
  );
}
