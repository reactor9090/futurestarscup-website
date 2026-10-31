// Iconițe mici, desenate cu linie (24×24), ca să nu depindem de o librărie.

export function Icon({ d, className = "size-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export const icons = {
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  calendarDots: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  board: "M3 5h18v14H3zM7 9v6M17 9v6M12 9v1M12 14v1",
  chevron: "M9 6l6 6-6 6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  ball: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7.5l3.8 2.8-1.4 4.4H9.6l-1.4-4.4zM12 7.5V3M15.8 10.3l4.4-1.4M14.4 14.7l2.7 3.7M9.6 14.7l-2.7 3.7M8.2 10.3L3.8 8.9",
  boot: "M3 7h6l1 4 4 1.5 5.5 1A2.5 2.5 0 0122 16v1H3zM3 17v2.5h19V17M7 19.5V21M11 19.5V21M15 19.5V21",
  shirt: "M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 01-8 0z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  star: "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z",
  trophy: "M8 4h8v5a4 4 0 01-8 0zM8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 21h8M10 17h4v4h-4z",
  crown: "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01",
  target: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13a1 1 0 100-2 1 1 0 000 2z",
  users: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M16 3.5a4 4 0 010 7.5M18 14a5 5 0 014 5v2",
};
