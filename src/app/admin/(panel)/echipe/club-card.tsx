import Link from "next/link";
import { ClubLogo } from "@/components/club-logo";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Field, inputClass } from "@/components/admin/fields";
import { addTeam, deleteClub, deleteTeam, removeClubLogo, updateClub, uploadClubLogo } from "./actions";

export { ClubLogo };

type Contact = { phone: string | null; email: string | null };

export type ClubData = {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  coach_name: string | null;
  description: string | null;
  // PostgREST întoarce un obiect pentru relația 1-la-1, dar tratăm și varianta cu listă.
  club_contacts: Contact | Contact[] | null;
  teams: {
    id: string;
    name: string;
    competition: { id: string; name: string } | null;
    roster_entries: { count: number }[];
  }[];
};

export function ClubCard({ club, competitions }: { club: ClubData; competitions: { id: string; name: string }[] }) {
  const contact = (Array.isArray(club.club_contacts) ? club.club_contacts[0] : club.club_contacts) ?? null;
  const joined = new Set(club.teams.map((t) => t.competition?.id));
  const available = competitions.filter((c) => !joined.has(c.id));

  return (
    <details className="rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4">
        <ClubLogo url={club.logo_url} />
        <div className="min-w-0">
          <p className="font-display text-xl font-bold uppercase tracking-wide">{club.name}</p>
          <p className="text-sm text-muted">{[club.city, club.coach_name].filter(Boolean).join(" · ") || "Fără detalii"}</p>
        </div>
        <span className="ml-auto flex flex-wrap gap-1.5">
          {club.teams.map((t) => (
            <span key={t.id} className="rounded-full bg-pitch-100 px-2.5 py-1 text-xs font-semibold text-pitch-900">
              {t.competition?.name ?? "—"}
            </span>
          ))}
          {club.teams.length === 0 && <span className="rounded-full bg-line px-2.5 py-1 text-xs font-semibold text-muted">Fără competiție</span>}
        </span>
      </summary>

      <div className="space-y-6 border-t border-line px-5 py-5">
        <ActionForm action={updateClub} className="space-y-3">
          <input type="hidden" name="id" value={club.id} />
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Nume club" className="w-60">
              <input name="name" defaultValue={club.name} required maxLength={80} className={inputClass} />
            </Field>
            <Field label="Oraș" className="w-44">
              <input name="city" defaultValue={club.city ?? ""} maxLength={80} className={inputClass} />
            </Field>
            <Field label="Antrenor" className="w-52">
              <input name="coach_name" defaultValue={club.coach_name ?? ""} maxLength={80} className={inputClass} />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Telefon (privat)" className="w-44">
              <input name="phone" type="tel" defaultValue={contact?.phone ?? ""} maxLength={40} className={inputClass} />
            </Field>
            <Field label="Email (privat)" className="w-60">
              <input name="email" type="email" defaultValue={contact?.email ?? ""} maxLength={200} className={inputClass} />
            </Field>
          </div>
          <Field label="Descriere (apare pe pagina echipei)" className="max-w-2xl">
            <textarea name="description" defaultValue={club.description ?? ""} maxLength={1000} rows={3} className={inputClass} />
          </Field>
          <SubmitButton variant="secondary">Salvează</SubmitButton>
        </ActionForm>

        <div className="flex flex-wrap items-end gap-4 border-t border-line pt-4">
          <ActionForm action={uploadClubLogo} resetOnSuccess className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={club.id} />
            <Field label="Logo (PNG, JPG sau WebP, maxim 1 MB)">
              <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" required className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-pitch-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-pitch-900" />
            </Field>
            <SubmitButton variant="secondary">Încarcă logo</SubmitButton>
          </ActionForm>
          {club.logo_url && (
            <ActionForm action={removeClubLogo}>
              <input type="hidden" name="id" value={club.id} />
              <SubmitButton variant="ghost" confirm="Ștergi logo-ul?">
                Șterge logo-ul
              </SubmitButton>
            </ActionForm>
          )}
        </div>

        <div className="space-y-3 border-t border-line pt-4">
          <h3 className="font-display text-lg font-bold uppercase tracking-wide">Echipe în competiții</h3>
          <ul className="space-y-2">
            {club.teams.map((team) => (
              <li key={team.id}>
                <ActionForm action={deleteTeam} className="flex flex-wrap items-center gap-3 rounded-lg bg-canvas px-3 py-2">
                  <input type="hidden" name="id" value={team.id} />
                  <span className="font-medium">{team.competition?.name ?? "Competiție necunoscută"}</span>
                  <Link href={`/admin/echipe/${team.id}`} className="text-sm font-medium text-pitch-700 underline">
                    Lot ({team.roster_entries[0]?.count ?? 0} jucători) →
                  </Link>
                  <span className="ml-auto">
                    <SubmitButton variant="ghost" confirm={`Scoți ${club.name} din ${team.competition?.name}? Lotul de jucători se șterge.`}>
                      Scoate din competiție
                    </SubmitButton>
                  </span>
                </ActionForm>
              </li>
            ))}
            {club.teams.length === 0 && <li className="text-sm text-muted">Clubul nu participă la nicio competiție.</li>}
          </ul>

          {available.length > 0 && (
            <ActionForm action={addTeam} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="club_id" value={club.id} />
              <select name="competition_id" required defaultValue="" aria-label={`Adaugă ${club.name} la o competiție`} className={`${inputClass} w-auto min-w-56`}>
                <option value="" disabled>
                  Alege competiția…
                </option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <SubmitButton variant="secondary">Adaugă la competiție</SubmitButton>
            </ActionForm>
          )}
        </div>

        <ActionForm action={deleteClub} className="border-t border-line pt-4">
          <input type="hidden" name="id" value={club.id} />
          <SubmitButton variant="danger" confirm={`Ștergi clubul ${club.name}?`}>
            Șterge clubul
          </SubmitButton>
        </ActionForm>
      </div>
    </details>
  );
}
