-- Cod de acces pentru înscrierea online. Doar cine primește codul de la organizatori poate trimite formularul.
-- Dacă nu e setat niciun cod, înscrierea rămâne deschisă oricui.

create table registration_settings (
  id          boolean primary key default true check (id),  -- un singur rând
  access_code text,
  updated_at  timestamptz not null default now()
);
alter table registration_settings enable row level security;
create policy "admin_all" on registration_settings for all to authenticated using (is_admin()) with check (is_admin());

-- Compară fără să țină cont de majuscule sau spații.
create function registration_code_ok(p_code text) returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select nullif(trim(access_code), '') is null
            or lower(trim(access_code)) = lower(trim(coalesce(p_code, '')))
     from registration_settings where id),
    true);
$$;
revoke all on function registration_code_ok(text) from public;
grant execute on function registration_code_ok(text) to anon, authenticated;

-- submit_registration verifică acum codul din payload (cheia `access_code`).
create or replace function submit_registration(payload jsonb) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_competition uuid := (payload ->> 'competition_id')::uuid;
  v_players     jsonb := coalesce(payload -> 'players', '[]'::jsonb);
  v_id          uuid;
  v_player      jsonb;
  v_i           int := 0;
begin
  if not registration_code_ok(payload ->> 'access_code') then
    raise exception 'Cod de înscriere invalid';
  end if;
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
