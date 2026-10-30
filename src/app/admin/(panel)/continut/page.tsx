import type { Metadata } from "next";
import Image from "next/image";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card, Field, inputClass } from "@/components/admin/fields";
import { createSessionClient } from "@/lib/supabase/server";
import {
  createAnnouncement,
  createPrize,
  createSponsor,
  deleteAnnouncement,
  deletePrize,
  deleteSponsor,
  updateAnnouncement,
  updatePrize,
  updateSponsor,
} from "./actions";

export const metadata: Metadata = { title: "Anunțuri, sponsori, premii", robots: { index: false } };

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  link_url: string | null;
  is_banner: boolean;
  is_published: boolean;
  sort_order: number;
};
type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string | null;
  sort_order: number;
  is_active: boolean;
};
type Prize = {
  id: string;
  competition_id: string;
  title: string;
  description: string | null;
  winner_team_id: string | null;
  winner_text: string | null;
  sort_order: number;
};
type Competition = {
  id: string;
  name: string;
  season: { start_date: string | null } | null;
  teams: { id: string; name: string }[];
};

const fileClass =
  "block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-pitch-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-pitch-900";

export default async function ContentPage() {
  const supabase = await createSessionClient();
  const [announcements, sponsors, prizes, competitions] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, image_url, link_url, is_banner, is_published, sort_order")
      .order("sort_order")
      .order("published_at", { ascending: false })
      .overrideTypes<Announcement[]>(),
    supabase
      .from("sponsors")
      .select("id, name, logo_url, website_url, tier, sort_order, is_active")
      .order("sort_order")
      .order("name")
      .overrideTypes<Sponsor[]>(),
    supabase
      .from("prizes")
      .select("id, competition_id, title, description, winner_team_id, winner_text, sort_order")
      .order("sort_order")
      .overrideTypes<Prize[]>(),
    supabase.from("competitions").select("id, name, season:seasons(start_date), teams(id, name)").overrideTypes<Competition[]>(),
  ]);
  const failed = announcements.error ?? sponsors.error ?? prizes.error ?? competitions.error;
  if (failed) throw new Error(failed.message);

  const competitionList = (competitions.data ?? []).sort(
    (a, b) => (b.season?.start_date ?? "").localeCompare(a.season?.start_date ?? "") || a.name.localeCompare(b.name, "ro"),
  );

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Anunțuri, sponsori, premii</h1>
        <p className="mt-1 text-muted">
          Conținutul editorial al site-ului. Imaginile sunt PNG, JPG sau WebP, de maxim 1 MB.
        </p>
      </div>

      <Card title="Anunțuri" description="Anunțurile marcate „în carusel” apar pe prima pagină.">
        <div className="space-y-2">
          {(announcements.data ?? []).map((a) => (
            <details key={a.id} className="rounded-lg border border-line">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 font-semibold">
                {a.title}
                {a.is_banner && <Pill>Carusel</Pill>}
                {!a.is_published && <Pill>Ascuns</Pill>}
              </summary>
              <div className="space-y-4 border-t border-line p-4">
                <ActionForm action={updateAnnouncement} className="space-y-3">
                  <input type="hidden" name="id" value={a.id} />
                  <AnnouncementFields announcement={a} />
                  <SubmitButton variant="secondary">Salvează</SubmitButton>
                </ActionForm>
                <DeleteForm action={deleteAnnouncement} id={a.id} confirm={`Ștergi anunțul „${a.title}”?`} />
              </div>
            </details>
          ))}
          {(announcements.data ?? []).length === 0 && <p className="text-sm text-muted">Niciun anunț încă.</p>}
        </div>
        <ActionForm action={createAnnouncement} resetOnSuccess className="mt-4 space-y-3 rounded-lg bg-canvas p-4">
          <p className="text-sm font-semibold">Anunț nou</p>
          <AnnouncementFields />
          <SubmitButton>Adaugă anunțul</SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Sponsori și parteneri">
        <div className="space-y-2">
          {(sponsors.data ?? []).map((s) => (
            <details key={s.id} className="rounded-lg border border-line">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 font-semibold">
                {s.name}
                {s.tier && <span className="text-sm font-normal text-muted">{s.tier}</span>}
                {!s.is_active && <Pill>Inactiv</Pill>}
              </summary>
              <div className="space-y-4 border-t border-line p-4">
                <ActionForm action={updateSponsor} className="space-y-3">
                  <input type="hidden" name="id" value={s.id} />
                  <SponsorFields sponsor={s} />
                  <SubmitButton variant="secondary">Salvează</SubmitButton>
                </ActionForm>
                <DeleteForm action={deleteSponsor} id={s.id} confirm={`Ștergi sponsorul ${s.name}?`} />
              </div>
            </details>
          ))}
          {(sponsors.data ?? []).length === 0 && <p className="text-sm text-muted">Niciun sponsor încă.</p>}
        </div>
        <ActionForm action={createSponsor} resetOnSuccess className="mt-4 space-y-3 rounded-lg bg-canvas p-4">
          <p className="text-sm font-semibold">Sponsor nou</p>
          <SponsorFields />
          <SubmitButton>Adaugă sponsorul</SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Premii" description="Premiile fiecărei competiții. Câștigătorul se completează după finalul competiției.">
        {competitionList.length === 0 && <p className="text-sm text-muted">Creează întâi o competiție.</p>}
        <div className="space-y-6">
          {competitionList.map((c) => (
            <section key={c.id} className="space-y-2">
              <h3 className="font-display text-lg font-bold uppercase tracking-wide">{c.name}</h3>
              {(prizes.data ?? [])
                .filter((p) => p.competition_id === c.id)
                .map((p) => (
                  <details key={p.id} className="rounded-lg border border-line">
                    <summary className="cursor-pointer list-none px-4 py-3 font-semibold">
                      {p.title}
                      <span className="ml-2 text-sm font-normal text-muted">
                        {c.teams.find((t) => t.id === p.winner_team_id)?.name ?? p.winner_text ?? "fără câștigător"}
                      </span>
                    </summary>
                    <div className="space-y-4 border-t border-line p-4">
                      <ActionForm action={updatePrize} className="space-y-3">
                        <input type="hidden" name="id" value={p.id} />
                        <PrizeFields teams={c.teams} prize={p} />
                        <SubmitButton variant="secondary">Salvează</SubmitButton>
                      </ActionForm>
                      <DeleteForm action={deletePrize} id={p.id} confirm={`Ștergi premiul „${p.title}”?`} />
                    </div>
                  </details>
                ))}
              <ActionForm action={createPrize} resetOnSuccess className="space-y-3 rounded-lg bg-canvas p-4">
                <input type="hidden" name="competition_id" value={c.id} />
                <p className="text-sm font-semibold">Premiu nou</p>
                <PrizeFields teams={c.teams} />
                <SubmitButton>Adaugă premiul</SubmitButton>
              </ActionForm>
            </section>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-gold-100 px-1.5 py-0.5 text-xs font-medium">{children}</span>;
}

function DeleteForm({
  action,
  id,
  confirm,
}: {
  action: (prev: { error?: string; ok?: string }, formData: FormData) => Promise<{ error?: string; ok?: string }>;
  id: string;
  confirm: string;
}) {
  return (
    <ActionForm action={action} className="border-t border-line pt-4">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" confirm={confirm}>
        Șterge
      </SubmitButton>
    </ActionForm>
  );
}

function ImagePicker({ name, label, current }: { name: string; label: string; current?: string | null }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      {current && (
        <Image src={current} alt="" width={96} height={64} className="h-16 w-24 rounded-md bg-white object-contain" />
      )}
      <Field label={label}>
        <input name={name} type="file" accept="image/png,image/jpeg,image/webp" className={fileClass} />
      </Field>
      {current && (
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input name="remove_image" type="checkbox" className="size-4 accent-pitch-700" />
          Șterge imaginea
        </label>
      )}
    </div>
  );
}

function AnnouncementFields({ announcement: a }: { announcement?: Announcement }) {
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Titlu" className="w-72">
          <input name="title" required maxLength={120} defaultValue={a?.title} className={inputClass} />
        </Field>
        <Field label="Link (opțional)" className="w-72">
          <input name="link_url" type="url" maxLength={300} placeholder="https://…" defaultValue={a?.link_url ?? ""} className={inputClass} />
        </Field>
        <Field label="Ordine" className="w-20">
          <input name="sort_order" type="number" min={0} max={1000} defaultValue={a?.sort_order ?? 0} className={inputClass} />
        </Field>
      </div>
      <Field label="Text (opțional)" className="max-w-2xl">
        <textarea name="body" rows={3} maxLength={2000} defaultValue={a?.body ?? ""} className={inputClass} />
      </Field>
      <ImagePicker name="image" label="Imagine" current={a?.image_url} />
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input name="is_published" type="checkbox" defaultChecked={a?.is_published ?? true} className="size-4 accent-pitch-700" />
          Publicat
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="is_banner" type="checkbox" defaultChecked={a?.is_banner ?? false} className="size-4 accent-pitch-700" />
          În carusel pe prima pagină
        </label>
      </div>
    </>
  );
}

function SponsorFields({ sponsor: s }: { sponsor?: Sponsor }) {
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Nume" className="w-56">
          <input name="name" required maxLength={80} defaultValue={s?.name} className={inputClass} />
        </Field>
        <Field label="Categorie (ex. Partener principal)" className="w-60">
          <input name="tier" maxLength={60} defaultValue={s?.tier ?? ""} className={inputClass} />
        </Field>
        <Field label="Site web" className="w-64">
          <input name="website_url" type="url" maxLength={300} placeholder="https://…" defaultValue={s?.website_url ?? ""} className={inputClass} />
        </Field>
        <Field label="Ordine" className="w-20">
          <input name="sort_order" type="number" min={0} max={1000} defaultValue={s?.sort_order ?? 0} className={inputClass} />
        </Field>
      </div>
      <ImagePicker name="logo" label="Logo" current={s?.logo_url} />
      <label className="flex items-center gap-2 text-sm">
        <input name="is_active" type="checkbox" defaultChecked={s?.is_active ?? true} className="size-4 accent-pitch-700" />
        Afișat pe site
      </label>
    </>
  );
}

function PrizeFields({ teams, prize: p }: { teams: Competition["teams"]; prize?: Prize }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Premiu (ex. Locul 1)" className="w-44">
        <input name="title" required maxLength={80} defaultValue={p?.title} className={inputClass} />
      </Field>
      <Field label="Descriere" className="w-60">
        <input name="description" maxLength={500} defaultValue={p?.description ?? ""} className={inputClass} />
      </Field>
      <Field label="Echipa câștigătoare" className="w-48">
        <select name="winner_team_id" defaultValue={p?.winner_team_id ?? ""} className={inputClass}>
          <option value="">—</option>
          {[...teams]
            .sort((a, b) => a.name.localeCompare(b.name, "ro"))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Sau câștigător liber (ex. nume jucător)" className="w-56">
        <input name="winner_text" maxLength={120} defaultValue={p?.winner_text ?? ""} className={inputClass} />
      </Field>
      <Field label="Ordine" className="w-20">
        <input name="sort_order" type="number" min={0} max={1000} defaultValue={p?.sort_order ?? 0} className={inputClass} />
      </Field>
    </div>
  );
}
