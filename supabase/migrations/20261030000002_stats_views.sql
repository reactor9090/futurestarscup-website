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
