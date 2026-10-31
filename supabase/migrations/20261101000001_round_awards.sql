-- Jucătorul etapei: ales de organizatori, apare în caruselul de pe prima pagină.
-- Poza vine din `players.photo_url` (doar cu acordul părinților), sponsorul din `sponsors`.

create table round_awards (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions (id) on delete cascade,
  round          int check (round > 0),            -- etapa; null = premiu fără etapă
  title          text not null,                    -- ex. „Jucătorul etapei 1”
  player_id      uuid not null references players (id) on delete restrict,
  team_id        uuid not null references teams (id) on delete restrict,
  body           text,
  sponsor_id     uuid references sponsors (id) on delete set null,
  is_published   boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);
create index round_awards_competition_idx on round_awards (competition_id);

alter table round_awards enable row level security;
create policy "admin_write" on round_awards for all to authenticated using (is_admin()) with check (is_admin());
create policy "public_read" on round_awards for select using (is_published or is_admin());
