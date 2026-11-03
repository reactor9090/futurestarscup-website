-- Statistici de echipă pentru un meci (șuturi, cornere, posesie...), introduse de organizatori.
-- Toate coloanele sunt opționale: pagina meciului arată doar ce a fost completat.

create table match_team_stats (
  match_id        uuid not null references matches (id) on delete cascade,
  team_id         uuid not null references teams (id) on delete cascade,
  shots           int check (shots >= 0),
  shots_on_target int check (shots_on_target >= 0),
  corners         int check (corners >= 0),
  fouls           int check (fouls >= 0),
  offsides        int check (offsides >= 0),
  possession      int check (possession between 0 and 100),   -- procente
  primary key (match_id, team_id),
  check (shots_on_target is null or shots is null or shots_on_target <= shots)
);

alter table match_team_stats enable row level security;
create policy "admin_write" on match_team_stats for all to authenticated using (is_admin()) with check (is_admin());
create policy "public_read" on match_team_stats for select using (true);
