-- ===== supabase/migrations/20261030000001_schema.sql =====
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

-- ===== supabase/migrations/20261030000002_stats_views.sql =====
-- Statistici calculate din fapte (F2, F9, F10, F11, F25, F28).
-- Nimic de aici nu se editează manual: corectezi un meci → totul se recalculează.
-- security_invoker = RLS-ul tabelelor de bază se aplică și view-urilor.

-- Fiecare meci terminat, văzut din perspectiva fiecărei echipe (2 rânduri / meci).
create view team_match_rows with (security_invoker = true) as
select m.id as match_id, m.competition_id, m.stage_id, m.group_id,
       m.home_team_id as team_id, m.away_team_id as opponent_id,
       m.home_score as goals_for, m.away_score as goals_against,
       true as is_home
from matches m
where m.status = 'finished'
union all
select m.id, m.competition_id, m.stage_id, m.group_id,
       m.away_team_id, m.home_team_id,
       m.away_score, m.home_score,
       false
from matches m
where m.status = 'finished';

-- Ce echipe apar în clasamentul unei faze:
--   campionat → toate echipele competiției; grupe → echipele din fiecare grupă.
create view stage_participants with (security_invoker = true) as
select s.id as stage_id, null::uuid as group_id, t.id as team_id
from stages s
join teams t on t.competition_id = s.competition_id
where s.type = 'league'
union all
select g.stage_id, g.id, gt.team_id
from stage_groups g
join group_teams gt on gt.group_id = g.id;

-- Clasament brut pe fază/grupă: 3p victorie, 1p egal, 0p înfrângere.
-- Ordinea finală (inclusiv întâlnirile directe) se aplică în aplicație: src/lib/standings.ts
create view standings with (security_invoker = true) as
select sp.stage_id,
       sp.group_id,
       sp.team_id,
       t.name as team_name,
       c.slug as club_slug,
       c.logo_url,
       count(r.match_id)::int                                         as played,
       count(*) filter (where r.goals_for > r.goals_against)::int     as won,
       count(*) filter (where r.goals_for = r.goals_against)::int     as drawn,
       count(*) filter (where r.goals_for < r.goals_against)::int     as lost,
       coalesce(sum(r.goals_for), 0)::int                             as goals_for,
       coalesce(sum(r.goals_against), 0)::int                         as goals_against,
       coalesce(sum(r.goals_for - r.goals_against), 0)::int           as goal_difference,
       (3 * count(*) filter (where r.goals_for > r.goals_against)
          + count(*) filter (where r.goals_for = r.goals_against))::int as points
from stage_participants sp
join teams t on t.id = sp.team_id
join clubs c on c.id = t.club_id
left join team_match_rows r
  on r.team_id = sp.team_id
 and r.stage_id = sp.stage_id
 and r.group_id is not distinct from sp.group_id
group by sp.stage_id, sp.group_id, sp.team_id, t.name, c.slug, c.logo_url;

-- Statistici totale ale unei echipe în competiție (toate fazele) — F9.
create view team_stats with (security_invoker = true) as
select t.id as team_id,
       t.competition_id,
       t.name as team_name,
       c.slug as club_slug,
       c.logo_url,
       count(r.match_id)::int                                         as played,
       count(*) filter (where r.goals_for > r.goals_against)::int     as won,
       count(*) filter (where r.goals_for = r.goals_against)::int     as drawn,
       count(*) filter (where r.goals_for < r.goals_against)::int     as lost,
       coalesce(sum(r.goals_for), 0)::int                             as goals_for,
       coalesce(sum(r.goals_against), 0)::int                         as goals_against,
       coalesce(sum(r.goals_for - r.goals_against), 0)::int           as goal_difference
from teams t
join clubs c on c.id = t.club_id
left join team_match_rows r on r.team_id = t.id
group by t.id, t.competition_id, t.name, c.slug, c.logo_url;

-- Statistici jucător per echipă (deci per competiție) — F10, F11.
-- „Meciuri jucate” = prezență înregistrată SAU orice eveniment în meci,
-- ca un marcator să nu apară cu 0 meciuri dacă adminul a uitat prezența.
create view player_stats with (security_invoker = true) as
with finished as (
  select id from matches where status = 'finished'
),
played as (
  select a.player_id, a.team_id, a.match_id
  from match_appearances a join finished f on f.id = a.match_id
  union
  select e.player_id, e.team_id, e.match_id
  from match_events e join finished f on f.id = e.match_id
  where e.player_id is not null
  union
  select e.assist_player_id, e.team_id, e.match_id
  from match_events e join finished f on f.id = e.match_id
  where e.assist_player_id is not null
),
events as (
  select e.* from match_events e join finished f on f.id = e.match_id
)
select r.player_id,
       r.team_id,
       t.competition_id,
       t.name as team_name,
       c.slug as club_slug,
       p.first_name,
       p.last_name,
       p.position,
       r.shirt_number,
       (select count(*) from played pl
         where pl.player_id = r.player_id and pl.team_id = r.team_id)::int as matches_played,
       (select count(*) from events e
         where e.type = 'goal' and e.player_id = r.player_id and e.team_id = r.team_id)::int as goals,
       (select count(*) from events e
         where e.type = 'goal' and e.assist_player_id = r.player_id and e.team_id = r.team_id)::int as assists,
       (select count(*) from events e
         where e.type = 'yellow_card' and e.player_id = r.player_id and e.team_id = r.team_id)::int as yellow_cards,
       (select count(*) from events e
         where e.type = 'red_card' and e.player_id = r.player_id and e.team_id = r.team_id)::int as red_cards
from roster_entries r
join players p on p.id = r.player_id
join teams t on t.id = r.team_id
join clubs c on c.id = t.club_id;

-- ===== supabase/migrations/20261030000003_security.sql =====
-- Securitate (RLS): oricine citește datele publice, doar adminii scriu.
-- Vizitatorii pot doar trimite înscrieri, prin funcția submit_registration.

do $$
declare
  t text;
begin
  foreach t in array array[
    'seasons', 'categories', 'competitions', 'stages', 'stage_groups',
    'clubs', 'teams', 'group_teams', 'players', 'roster_entries',
    'matches', 'match_events', 'match_appearances',
    'sponsors', 'prizes', 'announcements'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "admin_write" on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end;
$$;

-- Citire publică
create policy "public_read" on seasons           for select using (true);
create policy "public_read" on categories        for select using (true);
create policy "public_read" on competitions      for select using (is_published or is_admin());
create policy "public_read" on stages            for select using (true);
create policy "public_read" on stage_groups      for select using (true);
create policy "public_read" on clubs             for select using (true);
create policy "public_read" on teams             for select using (true);
create policy "public_read" on group_teams       for select using (true);
create policy "public_read" on players           for select using (true);
create policy "public_read" on roster_entries    for select using (true);
create policy "public_read" on matches           for select using (true);
create policy "public_read" on match_events      for select using (true);
create policy "public_read" on match_appearances for select using (true);
create policy "public_read" on sponsors          for select using (is_active or is_admin());
create policy "public_read" on prizes            for select using (true);
create policy "public_read" on announcements     for select using (is_published or is_admin());

-- Doar admin: contacte, înscrieri, lista de admini
alter table club_contacts        enable row level security;
alter table registrations        enable row level security;
alter table registration_players enable row level security;
alter table admins               enable row level security;

create policy "admin_all" on club_contacts        for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin_all" on registrations        for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin_all" on registration_players for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin_read" on admins              for select to authenticated using (is_admin());

-- ---------------------------------------------------------------------------
-- Înscriere publică (F15, F16) — validare + inserare atomică
-- ---------------------------------------------------------------------------
create function submit_registration(payload jsonb) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_competition uuid := (payload ->> 'competition_id')::uuid;
  v_players     jsonb := coalesce(payload -> 'players', '[]'::jsonb);
  v_id          uuid;
  v_player      jsonb;
  v_i           int := 0;
begin
  if not exists (select 1 from competitions
                 where id = v_competition and registration_open and is_published) then
    raise exception 'Înscrierile pentru această competiție sunt închise';
  end if;
  if coalesce(trim(payload ->> 'club_name'), '') = ''
     or coalesce(trim(payload ->> 'coach_name'), '') = ''
     or coalesce(trim(payload ->> 'coach_phone'), '') = '' then
    raise exception 'Date obligatorii lipsă';
  end if;
  if jsonb_typeof(v_players) <> 'array'
     or jsonb_array_length(v_players) < 1
     or jsonb_array_length(v_players) > 40 then
    raise exception 'Lotul trebuie să aibă între 1 și 40 de jucători';
  end if;

  insert into registrations (competition_id, club_name, city, coach_name, coach_phone, coach_email, notes)
  values (v_competition,
          left(trim(payload ->> 'club_name'), 120),
          left(nullif(trim(payload ->> 'city'), ''), 120),
          left(trim(payload ->> 'coach_name'), 120),
          left(trim(payload ->> 'coach_phone'), 40),
          left(nullif(trim(payload ->> 'coach_email'), ''), 200),
          left(nullif(trim(payload ->> 'notes'), ''), 2000))
  returning id into v_id;

  for v_player in select * from jsonb_array_elements(v_players) loop
    if coalesce(trim(v_player ->> 'first_name'), '') = ''
       or coalesce(trim(v_player ->> 'last_name'), '') = '' then
      raise exception 'Fiecare jucător trebuie să aibă nume și prenume';
    end if;
    insert into registration_players
      (registration_id, first_name, last_name, birth_date, position, shirt_number, sort_order)
    values (v_id,
            left(trim(v_player ->> 'first_name'), 80),
            left(trim(v_player ->> 'last_name'), 80),
            nullif(v_player ->> 'birth_date', '')::date,
            nullif(v_player ->> 'position', '')::player_position,
            nullif(v_player ->> 'shirt_number', '')::int,
            v_i);
    v_i := v_i + 1;
  end loop;

  return v_id;
end;
$$;

revoke all on function submit_registration(jsonb) from public;
grant execute on function submit_registration(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Aprobare / respingere înscriere (F26) — doar admin
-- ---------------------------------------------------------------------------
create function slugify(input text) returns text
language sql immutable
as $$
  select trim(both '-' from regexp_replace(
           translate(lower(input), 'ăâîșşțţ', 'aaisstt'),
           '[^a-z0-9]+', '-', 'g'));
$$;

create function approve_registration(p_registration_id uuid) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  r          registrations;
  v_club     uuid;
  v_team     uuid;
  v_player   uuid;
  v_slug     text;
  v_teamname text;
  rp         registration_players;
begin
  if not is_admin() then
    raise exception 'Acces interzis';
  end if;

  select * into r from registrations where id = p_registration_id for update;
  if r.id is null then
    raise exception 'Înscrierea nu există';
  end if;
  if r.status <> 'pending' then
    raise exception 'Înscrierea a fost deja procesată';
  end if;

  -- slug unic pentru club
  v_slug := slugify(r.club_name);
  if v_slug = '' then v_slug := 'club'; end if;
  if exists (select 1 from clubs where slug = v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  insert into clubs (name, slug, city, coach_name)
  values (r.club_name, v_slug, r.city, r.coach_name)
  returning id into v_club;

  insert into club_contacts (club_id, phone, email)
  values (v_club, r.coach_phone, r.coach_email);

  -- nume de echipă unic în competiție
  v_teamname := r.club_name;
  if exists (select 1 from teams where competition_id = r.competition_id and name = v_teamname) then
    v_teamname := v_teamname || ' (' || coalesce(r.city, substr(v_slug, length(v_slug) - 5)) || ')';
  end if;

  insert into teams (competition_id, club_id, name)
  values (r.competition_id, v_club, v_teamname)
  returning id into v_team;

  for rp in select * from registration_players
            where registration_id = r.id order by sort_order loop
    insert into players (first_name, last_name, birth_year, position)
    values (rp.first_name, rp.last_name, extract(year from rp.birth_date)::int, rp.position)
    returning id into v_player;

    insert into roster_entries (team_id, player_id, shirt_number)
    values (v_team, v_player,
            -- numerele duplicate din formular se ignoră (rămân necompletate)
            case when exists (select 1 from roster_entries
                              where team_id = v_team and shirt_number = rp.shirt_number)
                 then null else rp.shirt_number end);
  end loop;

  update registrations
     set status = 'approved', team_id = v_team, reviewed_at = now(), reviewed_by = auth.uid()
   where id = r.id;

  return v_team;
end;
$$;

create function reject_registration(p_registration_id uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Acces interzis';
  end if;
  update registrations
     set status = 'rejected', admin_note = p_note, reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_registration_id and status = 'pending';
  if not found then
    raise exception 'Înscrierea nu există sau a fost deja procesată';
  end if;
end;
$$;

revoke all on function approve_registration(uuid) from public;
revoke all on function reject_registration(uuid, text) from public;
grant execute on function approve_registration(uuid) to authenticated;
grant execute on function reject_registration(uuid, text) to authenticated;

-- ===== supabase/migrations/20261030000004_storage.sql =====
-- Fișiere (logo-uri, poze jucători, bannere, sponsori): citire publică, scriere doar admin.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "media_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "media_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ===== supabase/seed.sql =====
-- Date demo pentru dezvoltare. NU se rulează în producție.
-- U12: campionat (toți cu toți), 4 echipe, 3 etape (2 jucate, 1 programată).
-- U10: 2 grupe a câte 3 echipe + o fază de play-off (încă fără meciuri).

-- Helper temporar: gol după numerele de pe tricou (marcator, pasă decisivă).
create function seed_goal(p_match uuid, p_team uuid, p_scorer int, p_assist int, p_minute int) returns void
language sql
as $$
  insert into match_events (match_id, type, team_id, player_id, assist_player_id, minute)
  select p_match, 'goal', p_team,
         (select player_id from roster_entries where team_id = p_team and shirt_number = p_scorer),
         (select player_id from roster_entries where team_id = p_team and shirt_number = p_assist),
         p_minute;
$$;

do $$
declare
  v_season uuid;
  v_u10 uuid;
  v_u12 uuid;
  v_comp12 uuid;
  v_comp10 uuid;
  v_league uuid;
  v_groups uuid;
  v_ko uuid;
  v_ga uuid;
  v_gb uuid;
  v_club uuid;
  v_team uuid;
  v_player uuid;
  t12 uuid[] := '{}';
  t10 uuid[] := '{}';
  v_match uuid;
  i int;
  j int;
  clubs12 text[] := array['Viitorul Chișinău', 'Sporting Bălți', 'Dinamo Orhei', 'Academia Cahul'];
  clubs10 text[] := array['Real Ungheni', 'Speranța Soroca', 'Olimp Comrat', 'Atletic Hîncești', 'Codru Strășeni', 'Victoria Edineț'];
  first_names text[] := array['Andrei', 'Mihai', 'Ion', 'Daniel', 'Alexandru', 'Cristian', 'Nicolae', 'Vlad', 'Eugen', 'Victor'];
  last_names  text[] := array['Popescu', 'Rusu', 'Ceban', 'Lungu', 'Munteanu', 'Rotari', 'Cojocaru', 'Țurcanu', 'Moraru', 'Botnaru'];
  positions player_position[] := array['portar', 'fundas', 'fundas', 'mijlocas', 'mijlocas', 'atacant', 'atacant', 'mijlocas']::player_position[];
begin
  insert into seasons (name, slug, start_date, end_date, is_current)
  values ('2026/2027', '2026-2027', '2026-09-01', '2027-06-30', true)
  returning id into v_season;

  insert into categories (name, slug, sort_order) values ('U10', 'u10', 10) returning id into v_u10;
  insert into categories (name, slug, sort_order) values ('U12', 'u12', 12) returning id into v_u12;

  insert into competitions (season_id, category_id, name, min_birth_year, max_birth_year, registration_open)
  values (v_season, v_u12, 'U12 – 2026/2027', 2014, 2015, false) returning id into v_comp12;
  insert into competitions (season_id, category_id, name, min_birth_year, max_birth_year, registration_open)
  values (v_season, v_u10, 'U10 – 2026/2027', 2016, 2017, true) returning id into v_comp10;

  insert into stages (competition_id, name, type, sort_order)
  values (v_comp12, 'Sezon regulat', 'league', 1) returning id into v_league;
  insert into stages (competition_id, name, type, sort_order)
  values (v_comp10, 'Faza grupelor', 'group', 1) returning id into v_groups;
  insert into stages (competition_id, name, type, sort_order)
  values (v_comp10, 'Play-off', 'knockout', 2) returning id into v_ko;
  insert into stage_groups (stage_id, name, sort_order) values (v_groups, 'Grupa A', 1) returning id into v_ga;
  insert into stage_groups (stage_id, name, sort_order) values (v_groups, 'Grupa B', 2) returning id into v_gb;

  -- Cluburi + echipe + loturi (8 jucători fiecare)
  for i in 1 .. array_length(clubs12, 1) + array_length(clubs10, 1) loop
    insert into clubs (name, slug, city, coach_name)
    values (
      case when i <= 4 then clubs12[i] else clubs10[i - 4] end,
      slugify(case when i <= 4 then clubs12[i] else clubs10[i - 4] end),
      split_part(case when i <= 4 then clubs12[i] else clubs10[i - 4] end, ' ', 2),
      first_names[1 + (i % 10)] || ' ' || last_names[1 + ((i * 3) % 10)]
    ) returning id into v_club;

    insert into teams (competition_id, club_id, name)
    select case when i <= 4 then v_comp12 else v_comp10 end, v_club, name from clubs where id = v_club
    returning id into v_team;

    if i <= 4 then t12 := t12 || v_team; else t10 := t10 || v_team; end if;

    for j in 1 .. 8 loop
      insert into players (first_name, last_name, birth_year, position)
      values (first_names[1 + ((i + j) % 10)], last_names[1 + ((i * 7 + j) % 10)],
              case when i <= 4 then 2014 else 2016 end + (j % 2), positions[j])
      returning id into v_player;
      insert into roster_entries (team_id, player_id, shirt_number) values (v_team, v_player, j);
    end loop;
  end loop;

  insert into group_teams (group_id, team_id)
  values (v_ga, t10[1]), (v_ga, t10[2]), (v_ga, t10[3]),
         (v_gb, t10[4]), (v_gb, t10[5]), (v_gb, t10[6]);

  -- U12, etapa 1: 2-1 și 0-0
  insert into matches (competition_id, stage_id, round, home_team_id, away_team_id, kickoff_at, venue, status, home_score, away_score)
  values (v_comp12, v_league, 1, t12[1], t12[2], '2026-10-10 10:00+03', 'Stadionul Zimbru (teren 2)', 'finished', 2, 1)
  returning id into v_match;
  perform seed_goal(v_match, t12[1], 6, 4, 12);
  perform seed_goal(v_match, t12[1], 7, 6, 55);
  perform seed_goal(v_match, t12[2], 7, null, 61);

  insert into matches (competition_id, stage_id, round, home_team_id, away_team_id, kickoff_at, venue, status, home_score, away_score)
  values (v_comp12, v_league, 1, t12[3], t12[4], '2026-10-10 12:00+03', 'Stadionul Zimbru (teren 2)', 'finished', 0, 0);

  -- U12, etapa 2: 3-0 și 1-2 (cu un autogol)
  insert into matches (competition_id, stage_id, round, home_team_id, away_team_id, kickoff_at, venue, status, home_score, away_score)
  values (v_comp12, v_league, 2, t12[1], t12[3], '2026-10-17 10:00+03', 'Complexul Sportiv Orhei', 'finished', 3, 0)
  returning id into v_match;
  perform seed_goal(v_match, t12[1], 6, 5, 8);
  perform seed_goal(v_match, t12[1], 6, null, 30);
  perform seed_goal(v_match, t12[1], 7, 6, 70);

  insert into matches (competition_id, stage_id, round, home_team_id, away_team_id, kickoff_at, venue, status, home_score, away_score)
  values (v_comp12, v_league, 2, t12[2], t12[4], '2026-10-17 12:00+03', 'Complexul Sportiv Orhei', 'finished', 1, 2)
  returning id into v_match;
  perform seed_goal(v_match, t12[2], 6, 4, 20);
  perform seed_goal(v_match, t12[4], 7, null, 44);
  insert into match_events (match_id, type, team_id, player_id, minute)
  select v_match, 'own_goal', t12[2], r.player_id, 66
  from roster_entries r where r.team_id = t12[2] and r.shirt_number = 2;

  -- U12, etapa 3: programată
  insert into matches (competition_id, stage_id, round, home_team_id, away_team_id, kickoff_at, venue)
  values (v_comp12, v_league, 3, t12[1], t12[4], '2026-11-07 10:00+02', 'Stadionul Zimbru (teren 2)'),
         (v_comp12, v_league, 3, t12[2], t12[3], '2026-11-07 12:00+02', 'Stadionul Zimbru (teren 2)');

  -- U10, grupe: câte un meci jucat în fiecare grupă, restul programate
  insert into matches (competition_id, stage_id, group_id, round, home_team_id, away_team_id, kickoff_at, venue, status, home_score, away_score)
  values (v_comp10, v_groups, v_ga, 1, t10[1], t10[2], '2026-10-11 10:00+03', 'Baza CSF Ungheni', 'finished', 4, 2)
  returning id into v_match;
  perform seed_goal(v_match, t10[1], 6, 5, 3);
  perform seed_goal(v_match, t10[1], 6, 4, 15);
  perform seed_goal(v_match, t10[1], 7, null, 22);
  perform seed_goal(v_match, t10[1], 6, 7, 38);
  perform seed_goal(v_match, t10[2], 7, 5, 10);
  perform seed_goal(v_match, t10[2], 6, null, 41);

  insert into matches (competition_id, stage_id, group_id, round, home_team_id, away_team_id, kickoff_at, venue, status, home_score, away_score)
  values (v_comp10, v_groups, v_gb, 1, t10[4], t10[5], '2026-10-11 12:00+03', 'Baza CSF Ungheni', 'finished', 1, 1)
  returning id into v_match;
  perform seed_goal(v_match, t10[4], 7, null, 18);
  perform seed_goal(v_match, t10[5], 6, 4, 49);

  insert into matches (competition_id, stage_id, group_id, round, home_team_id, away_team_id, kickoff_at, venue)
  values (v_comp10, v_groups, v_ga, 2, t10[2], t10[3], '2026-11-08 10:00+02', 'Baza CSF Ungheni'),
         (v_comp10, v_groups, v_gb, 2, t10[5], t10[6], '2026-11-08 12:00+02', 'Baza CSF Ungheni'),
         (v_comp10, v_groups, v_ga, 3, t10[3], t10[1], '2026-11-15 10:00+02', 'Baza CSF Ungheni'),
         (v_comp10, v_groups, v_gb, 3, t10[6], t10[4], '2026-11-15 12:00+02', 'Baza CSF Ungheni');

  insert into prizes (competition_id, title, description, sort_order)
  values (v_comp12, 'Locul 1', 'Cupa campionatului și medalii de aur', 1),
         (v_comp12, 'Golgheterul turneului', 'Gheata de aur', 2),
         (v_comp10, 'Locul 1', 'Cupa și medalii de aur', 1);

  insert into sponsors (name, website_url, tier, sort_order)
  values ('Partener Demo 1', 'https://example.com', 'Partener principal', 1),
         ('Partener Demo 2', 'https://example.com', 'Partener', 2);

  insert into announcements (title, body, is_banner, sort_order)
  values ('Bine ați venit la Future Stars Cup 2026/2027!', 'Urmăriți clasamentele, programul și rezultatele tuturor categoriilor.', true, 1),
         ('Înscrierile pentru U10 sunt deschise', 'Completați formularul de înscriere online până la 1 decembrie.', true, 2);
end;
$$;

drop function if exists seed_goal(uuid, uuid, int, int, int);

