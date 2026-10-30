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
