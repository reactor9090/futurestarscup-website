-- Future Stars Cup — schema de bază
-- Regula: aici se stochează doar FAPTE (meciuri, scoruri, evenimente, loturi).
-- Clasamentele și statisticile sunt calculate în view-uri (vezi migrarea următoare).


-- ---------------------------------------------------------------------------
-- Tipuri
-- ---------------------------------------------------------------------------
create type stage_type as enum ('league', 'group', 'knockout');
create type match_status as enum ('scheduled', 'finished', 'postponed', 'cancelled');
create type match_event_type as enum ('goal', 'own_goal', 'yellow_card', 'red_card');
create type registration_status as enum ('pending', 'approved', 'rejected');
create type player_position as enum ('portar', 'fundas', 'mijlocas', 'atacant');

-- ---------------------------------------------------------------------------
-- Administratori
-- ---------------------------------------------------------------------------
create table admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function is_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sezoane, categorii, competiții (F27)
-- ---------------------------------------------------------------------------
create table seasons (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,            -- ex. „2026/2027”
  slug       text not null unique,            -- ex. „2026-2027”
  start_date date,
  end_date   date,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index seasons_single_current on seasons (is_current) where is_current;

create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,            -- ex. „U12”
  slug       text not null unique,            -- ex. „u12”
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- O competiție = un sezon × o categorie de vârstă.
create table competitions (
  id             uuid primary key default gen_random_uuid(),
  season_id      uuid not null references seasons (id) on delete cascade,
  category_id    uuid not null references categories (id) on delete restrict,
  name           text not null,
  min_birth_year int,
  max_birth_year int,
  -- înscrierile online sunt acceptate doar când e true
  registration_open boolean not null default false,
  is_published   boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (season_id, category_id)
);

-- Faze: campionat (toți cu toți), grupe sau eliminatorii.
create table stages (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions (id) on delete cascade,
  name           text not null,               -- ex. „Sezon regulat”, „Faza grupelor”, „Play-off”
  type           stage_type not null,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

create table stage_groups (
  id         uuid primary key default gen_random_uuid(),
  stage_id   uuid not null references stages (id) on delete cascade,
  name       text not null,                   -- ex. „Grupa A”
  sort_order int  not null default 0,
  unique (stage_id, name)
);

-- ---------------------------------------------------------------------------
-- Cluburi, echipe, jucători (F6–F8)
-- ---------------------------------------------------------------------------
-- Clubul = identitatea permanentă (logo, oraș). Echipa = participarea clubului
-- într-o competiție anume, ca să păstrăm istoricul pe sezoane.
create table clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  city        text,
  coach_name  text,
  description text,
  created_at  timestamptz not null default now()
);

-- Date de contact — vizibile doar adminilor.
create table club_contacts (
  club_id uuid primary key references clubs (id) on delete cascade,
  phone   text,
  email   text
);

create table teams (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions (id) on delete cascade,
  club_id        uuid not null references clubs (id) on delete cascade,
  name           text not null,               -- de obicei numele clubului
  created_at     timestamptz not null default now(),
  unique (competition_id, name)
);
create index teams_club_idx on teams (club_id);

create table group_teams (
  group_id uuid not null references stage_groups (id) on delete cascade,
  team_id  uuid not null references teams (id) on delete cascade,
  primary key (group_id, team_id)
);

-- Doar date publice despre copii: anul nașterii, nu data completă.
create table players (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  birth_year    int,
  position      player_position,
  photo_url     text,
  photo_consent boolean not null default false,
  created_at    timestamptz not null default now()
);
create index players_name_idx on players (lower(last_name), lower(first_name));

create table roster_entries (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams (id) on delete cascade,
  player_id    uuid not null references players (id) on delete cascade,
  shirt_number int check (shirt_number between 1 and 99),
  created_at   timestamptz not null default now(),
  unique (team_id, player_id),
  unique (team_id, shirt_number)
);
create index roster_entries_player_idx on roster_entries (player_id);

-- ---------------------------------------------------------------------------
-- Meciuri și evenimente (F3–F5, F24, F28)
-- ---------------------------------------------------------------------------
create table matches (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions (id) on delete cascade,
  stage_id       uuid not null references stages (id) on delete cascade,
  group_id       uuid references stage_groups (id) on delete set null,
  round          int,                         -- etapa (1, 2, 3…)
  round_label    text,                        -- ex. „Semifinală”, „Finală”
  home_team_id   uuid not null references teams (id) on delete cascade,
  away_team_id   uuid not null references teams (id) on delete cascade,
  kickoff_at     timestamptz,
  venue          text,
  status         match_status not null default 'scheduled',
  home_score     int check (home_score >= 0),
  away_score     int check (away_score >= 0),
  -- doar pentru eliminatorii terminate la egalitate
  home_penalties int check (home_penalties >= 0),
  away_penalties int check (away_penalties >= 0),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (home_team_id <> away_team_id),
  check (status <> 'finished' or (home_score is not null and away_score is not null))
);
create index matches_competition_idx on matches (competition_id, kickoff_at);
create index matches_stage_idx on matches (stage_id, group_id);
create index matches_home_idx on matches (home_team_id);
create index matches_away_idx on matches (away_team_id);
create trigger matches_updated_at before update on matches
  for each row execute function set_updated_at();

-- team_id = echipa jucătorului. La autogol, golul se contabilizează adversarului.
create table match_events (
  id               uuid primary key default gen_random_uuid(),
  match_id         uuid not null references matches (id) on delete cascade,
  type             match_event_type not null,
  team_id          uuid not null references teams (id) on delete cascade,
  player_id        uuid references players (id) on delete set null,
  assist_player_id uuid references players (id) on delete set null,
  minute           int check (minute between 0 and 150),
  created_at       timestamptz not null default now(),
  check (type = 'goal' or assist_player_id is null),
  check (assist_player_id is null or assist_player_id <> player_id)
);
create index match_events_match_idx on match_events (match_id);
create index match_events_player_idx on match_events (player_id);
create index match_events_assist_idx on match_events (assist_player_id);

-- Cine a jucat efectiv în meci (pentru „meciuri jucate”).
create table match_appearances (
  match_id  uuid not null references matches (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  team_id   uuid not null references teams (id) on delete cascade,
  primary key (match_id, player_id)
);
create index match_appearances_player_idx on match_appearances (player_id);

-- ---------------------------------------------------------------------------
-- Înscrieri online (F15, F16, F26)
-- ---------------------------------------------------------------------------
create table registrations (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions (id) on delete cascade,
  club_name      text not null,
  city           text,
  coach_name     text not null,
  coach_phone    text not null,
  coach_email    text,
  notes          text,
  status         registration_status not null default 'pending',
  admin_note     text,
  team_id        uuid references teams (id) on delete set null, -- setat la aprobare
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewed_by    uuid references auth.users (id) on delete set null
);
create index registrations_status_idx on registrations (status, created_at desc);

create table registration_players (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations (id) on delete cascade,
  first_name      text not null,
  last_name       text not null,
  birth_date      date,
  position        player_position,
  shirt_number    int check (shirt_number between 1 and 99),
  sort_order      int not null default 0
);
create index registration_players_reg_idx on registration_players (registration_id);

-- ---------------------------------------------------------------------------
-- Conținut: sponsori, premii, anunțuri (F17–F19)
-- ---------------------------------------------------------------------------
create table sponsors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo_url    text,
  website_url text,
  tier        text,                           -- ex. „Partener principal”
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table prizes (
  id               uuid primary key default gen_random_uuid(),
  competition_id   uuid not null references competitions (id) on delete cascade,
  title            text not null,             -- ex. „Locul 1”, „Golgheter”
  description      text,
  winner_team_id   uuid references teams (id) on delete set null,
  winner_player_id uuid references players (id) on delete set null,
  winner_text      text,                      -- câștigător liber, dacă nu e echipă/jucător
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

create table announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text,
  image_url    text,
  link_url     text,
  is_banner    boolean not null default false, -- apare în caruselul de pe prima pagină
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
