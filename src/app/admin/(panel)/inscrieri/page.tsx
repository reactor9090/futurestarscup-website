import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Field, inputClass } from "@/components/admin/fields";
import { positionLabels, type Position } from "@/lib/labels";
import { createSessionClient } from "@/lib/supabase/server";
import { approveRegistration, deleteRegistration, rejectRegistration, saveAccessCode } from "./actions";

export const metadata: Metadata = { title: "Înscrieri", robots: { index: false } };

type Registration = {
  id: string;
  club_name: string;
  city: string | null;
  coach_name: string;
  coach_phone: string;
  coach_email: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  team_id: string | null;
  competition: { name: string; min_birth_year: number | null; max_birth_year: number | null } | null;
  registration_players: {
    id: string;
    first_name: string;
    last_name: string;
    birth_date: string | null;
    position: Position | null;
    shirt_number: number | null;
    sort_order: number;
  }[];
};

const statusLabel = { pending: "În așteptare", approved: "Aprobată", rejected: "Respinsă" } as const;
const when = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" });

export default async function RegistrationsPage() {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(
      `id, club_name, city, coach_name, coach_phone, coach_email, notes, status, admin_note, created_at, team_id,
       competition:competitions(name, min_birth_year, max_birth_year),
       registration_players(id, first_name, last_name, birth_date, position, shirt_number, sort_order)`,
    )
    .order("created_at", { ascending: false })
    .overrideTypes<Registration[]>();
  if (error) throw new Error(error.message);

  const settings = await supabase.from("registration_settings").select("access_code").maybeSingle();
  const accessCode = settings.data?.access_code ?? "";

  const pending = data.filter((r) => r.status === "pending").reverse(); // cele mai vechi întâi
  const processed = data.filter((r) => r.status !== "pending");

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Înscrieri</h1>
        <p className="mt-1 text-muted">
          Echipele trimise din formularul public. La aprobare se creează automat clubul, echipa, jucătorii și lotul;
          datele de contact ale antrenorului rămân vizibile doar aici.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Cod de înscriere</h2>
        <p className="text-sm text-muted">
          {accessCode
            ? "Doar cine are codul poate completa formularul public. Dă codul echipelor invitate și schimbă-l oricând."
            : "Niciun cod setat: formularul public e deschis oricui. Setează un cod ca să-l restricționezi."}
        </p>
        <ActionForm action={saveAccessCode} className="flex flex-wrap items-end gap-3">
          <Field label="Cod">
            <input name="access_code" defaultValue={accessCode} maxLength={50} autoComplete="off" className={inputClass} />
          </Field>
          <SubmitButton>Salvează codul</SubmitButton>
        </ActionForm>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">În așteptare ({pending.length})</h2>
        {pending.map((r) => (
          <RegistrationCard key={r.id} registration={r} defaultOpen />
        ))}
        {pending.length === 0 && <p className="text-sm text-muted">Nicio înscriere de verificat.</p>}
      </section>

      {processed.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Procesate</h2>
          {processed.map((r) => (
            <RegistrationCard key={r.id} registration={r} />
          ))}
        </section>
      )}
    </div>
  );
}

function RegistrationCard({ registration: r, defaultOpen = false }: { registration: Registration; defaultOpen?: boolean }) {
  const players = [...r.registration_players].sort((a, b) => a.sort_order - b.sort_order);
  const { min_birth_year: min, max_birth_year: max } = r.competition ?? {};
  const outOfRange = (birthDate: string | null) => {
    const year = birthDate ? Number(birthDate.slice(0, 4)) : null;
    return year !== null && ((min != null && year < min) || (max != null && year > max));
  };
  const flagged = players.filter((p) => outOfRange(p.birth_date)).length;

  return (
    <details open={defaultOpen} className="rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4">
        <span className="font-display text-xl font-bold uppercase tracking-wide">{r.club_name}</span>
        <span className="text-sm text-muted">
          {r.competition?.name} · {players.length} jucători · {when.format(new Date(r.created_at))}
        </span>
        <span className="ml-auto flex gap-2">
          {flagged > 0 && (
            <span className="rounded bg-gold-100 px-1.5 py-0.5 text-xs font-medium">{flagged} în afara vârstei</span>
          )}
          <span className="rounded bg-canvas px-1.5 py-0.5 text-xs font-medium">{statusLabel[r.status]}</span>
        </span>
      </summary>

      <div className="space-y-5 border-t border-line px-5 py-5">
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <Row label="Oraș" value={r.city} />
          <Row label="Antrenor" value={r.coach_name} />
          <Row label="Telefon" value={r.coach_phone} />
          <Row label="Email" value={r.coach_email} />
        </dl>
        {r.notes && <p className="whitespace-pre-line rounded-md bg-canvas p-3 text-sm">{r.notes}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="px-2 py-1.5 text-left">Nr.</th>
                <th className="px-2 py-1.5 text-left">Jucător</th>
                <th className="px-2 py-1.5 text-left">Născut</th>
                <th className="px-2 py-1.5 text-left">Post</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-2 py-1.5 text-muted">{p.shirt_number ?? ""}</td>
                  <td className="px-2 py-1.5 font-medium">
                    {p.first_name} {p.last_name}
                  </td>
                  <td className={`px-2 py-1.5 ${outOfRange(p.birth_date) ? "font-semibold text-danger" : ""}`}>
                    {p.birth_date ?? "—"}
                    {outOfRange(p.birth_date) && " ⚠"}
                  </td>
                  <td className="px-2 py-1.5 text-muted">{p.position ? positionLabels[p.position] : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(min || max) && (
            <p className="mt-2 text-xs text-muted">
              Categoria primește jucători născuți {min ?? "…"}–{max ?? "…"}. ⚠ = în afara intervalului; poți aproba oricum.
            </p>
          )}
        </div>

        {r.status === "pending" && (
          <div className="flex flex-wrap items-end gap-4 border-t border-line pt-4">
            <ActionForm action={approveRegistration}>
              <input type="hidden" name="id" value={r.id} />
              <SubmitButton confirm={`Aprobi echipa ${r.club_name}? Se creează clubul, echipa și lotul.`}>Aprobă</SubmitButton>
            </ActionForm>
            <ActionForm action={rejectRegistration} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={r.id} />
              <Field label="Motiv (opțional, doar pentru uz intern)" className="w-72">
                <input name="note" maxLength={500} className={inputClass} />
              </Field>
              <SubmitButton variant="danger" confirm={`Respingi înscrierea ${r.club_name}?`}>
                Respinge
              </SubmitButton>
            </ActionForm>
          </div>
        )}
        {r.status !== "pending" && (
          <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4 text-sm">
            {r.admin_note && <span className="text-muted">Motiv: {r.admin_note}</span>}
            {r.status === "rejected" && (
              <ActionForm action={deleteRegistration}>
                <input type="hidden" name="id" value={r.id} />
                <SubmitButton variant="danger" confirm="Ștergi definitiv această înscriere?">
                  Șterge
                </SubmitButton>
              </ActionForm>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-muted">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
