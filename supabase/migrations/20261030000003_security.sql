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
