// Orele meciurilor se introduc și se afișează în ora României, indiferent de fusul serverului.
const TZ = "Europe/Bucharest";

const parts = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Valoarea unui `<input type="datetime-local">` ("2026-10-30T14:30") pentru un instant ISO. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return parts.format(date).replace(" ", "T");
}

/** Inversul: "2026-10-30T14:30" (ora României) → instant ISO UTC. Null dacă e gol sau invalid. */
export function fromLocalInput(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Decalajul zonei depinde de instant (ora de vară), deci îl corectăm în două trepte.
  let utc = wall;
  for (let i = 0; i < 2; i++) {
    const [day, time] = parts.format(new Date(utc)).split(" ");
    const [sy, smo, sd] = day.split("-").map(Number);
    const [sh, smi] = time.split(":").map(Number);
    utc += wall - Date.UTC(sy, smo - 1, sd, sh, smi);
  }
  const result = new Date(utc);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

export function formatKickoff(iso: string | null): string {
  if (!iso) return "Data nestabilită";
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Ora a trecut deja (ex. un meci care trebuia să înceapă). */
export function isPast(iso: string | null): boolean {
  return iso !== null && new Date(iso).getTime() < Date.now();
}
