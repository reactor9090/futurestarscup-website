-- Premiile partenerilor: ce oferă sponsorii jucătorilor (ex. o geantă și o sticlă pentru fiecare jucător).
-- Separat de `prizes`, care sunt premiile competiției (Locul 1, Golgheter…) cu câștigători.
-- Poza stă în bucket-ul public „media”, sub sponsor-gifts/.

create table sponsor_gifts (
  id          uuid primary key default gen_random_uuid(),
  sponsor_id  uuid references sponsors (id) on delete set null,
  title       text not null,                -- ex. „Geantă sport premium”
  description text,
  recipients  text,                         -- ex. „Fiecare jucător”, „Golgheterul turneului”
  image_url   text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table sponsor_gifts enable row level security;
create policy "admin_write" on sponsor_gifts for all to authenticated using (is_admin()) with check (is_admin());
create policy "public_read" on sponsor_gifts for select using (is_active or is_admin());
