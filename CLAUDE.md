# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Future Stars Cup: a youth football championship platform. It has a public site (standings, fixtures, teams, players, top scorers, prizes, team registration) and an admin dashboard where organizers enter all data. All UI text is in **Romanian**, and the user communicates in Romanian.

@AGENTS.md — Next.js 16 differs from older versions. Read `node_modules/next/dist/docs/` before using unfamiliar Next APIs.

## Commands

```bash
npm run dev                                   # dev server, http://localhost:3000
npm run build                                 # production build (also type-checks)
npm run lint                                  # eslint
npm test                                      # all tests (vitest)
npx vitest run src/lib/standings.test.ts      # single file
npx vitest run -t "întâlniri directe"         # single test by name
npx tsc --noEmit                              # type-check only (run `npx next typegen` first if PageProps/LayoutProps types are missing)
```

The tests need no Supabase. `supabase/tests/db.test.ts` loads every migration (except storage) and `seed.sql` into an in-memory Postgres (PGlite), with a minimal stub of Supabase's `auth` schema and the `anon`/`authenticated` roles. Every SQL change must keep these tests passing.

## Architecture

### Data principle: store facts, compute stats
Admins enter only facts: matches, scores, `match_events` (goals, own goals, cards) and `match_appearances`. Standings and statistics are **never stored**. They are SQL views in `supabase/migrations/*_stats_views.sql`:
- `team_match_rows`: each finished match expanded to 2 rows, one per team.
- `stage_participants`: which teams belong in a stage's table. A `league` stage includes every team in the competition; a `group` stage uses `group_teams`.
- `standings`, `team_stats`, `player_stats`.

Final standings order is **not** done in SQL. `src/lib/standings.ts` (`rankStandings`) applies the tiebreakers: points → goal difference → goals for → head-to-head among still-tied teams → alphabetical (`ro` locale). Points are 3/1/0.

Goal events: `team_id` is the scorer's own team. An `own_goal` counts for the opponent. An assist is `assist_player_id` on a `goal` event, not a separate event. The match score is authoritative and independent of events, since scorers may be incomplete.

### Domain model
`seasons` × `categories` (age groups) → `competitions` → `stages` (`league | group | knockout`) → `stage_groups`.
`clubs` are permanent identities. `teams` are a club's participation in one competition, which keeps history across seasons. `players` belong to teams through `roster_entries`. Only the birth **year** of a player is public. Full birth dates exist only in `registration_players`, which is admin-only. Coach contact details live in the admin-only `club_contacts` table.

### Security
RLS is enabled on every table (`*_security.sql`). Anyone can read public data, and only `is_admin()` users (those listed in the `admins` table) can write. Anonymous visitors have no direct write access to anything. Registrations go through the `security definer` RPC `submit_registration(jsonb)`. Admins use `approve_registration(id)`, which atomically creates the club, team, players and roster, and `reject_registration(id, note)`. All views use `security_invoker = true`.

### Next.js app (Cache Components enabled)
- Supabase clients live in `src/lib/supabase/`:
  - `public.ts` has no session. Use it for public reads inside `"use cache"` functions, tagged with `cacheTag`.
  - `server.ts` (`createSessionClient`) reads the cookie session. Use it for admin pages and Server Actions.
- **Freshness model:** updates appear on refresh, with no realtime. Public data is cached. Every admin mutation (Server Action) must call `requireAdmin()` from `src/lib/auth.ts`, then `updateTag(...)` or `revalidatePath(...)` so the public pages refresh.
- Anything that reads cookies or `searchParams` must sit inside `<Suspense>`, which Cache Components requires. See `AdminGate` in `src/app/admin/(panel)/layout.tsx`.
- `src/proxy.ts` (Next 16's name for middleware) refreshes the session on `/admin/*` and redirects anonymous users to `/admin/login`. The real admin check is `requireAdmin()` plus RLS.
- Route groups:
  - `app/(site)/` is the public site, with header and footer.
  - `app/admin/(auth)/login` is the login page, without the panel layout.
  - `app/admin/(panel)/` is the admin dashboard. Sections that aren't built yet are flagged `soon` in `admin-nav.tsx`.
- Design tokens are in `src/app/globals.css` (`@theme`): `pitch-*` greens, `gold-*` accent, `ink`/`muted`/`line`/`canvas`/`surface`. The display font is `font-display` (Barlow Condensed, uppercase headings) and the body font is Inter.

### Admin section pattern
Each admin section is `app/admin/(panel)/<section>/{page.tsx,actions.ts}`; `sezoane/` is the reference implementation.
- `page.tsx` is a Server Component that reads with `createSessionClient()` and renders inline edit forms.
- `actions.ts` Server Actions share one shape: `requireAdmin()` → zod validation → write → `updateTag("catalog")` + `revalidatePath(...)` → return `FormState` (`{error}` or `{ok}`). Map Postgres errors (`23505` duplicate, `23503` foreign key) to Romanian messages.
- Shared action helpers (`idSchema`, `optionalInt`, `firstError`, `dbError`, `refresh`) are in `src/lib/admin-actions.ts`.
- Stage `type` is immutable after creation. Groups exist only on `group` stages, and a team sits in at most one group per stage; the actions enforce both.
- Cache tags the public site should use with `cacheTag`: `catalog` (seasons, categories, competitions, stages, groups; every `refresh()` invalidates it), `teams` (clubs, teams, players, rosters) `matches` (matches, events, appearances) and `content` (announcements, sponsors, prizes; images go through `src/lib/media.ts`). Standings and stats depend on both `teams` and `matches`.
- Logos are uploaded by Server Actions into the public Supabase bucket `media` (png/jpg/webp, max 1 MB; `next.config.ts` allows 2 MB bodies and whitelists the bucket in `images.remotePatterns`). Each upload gets a new filename and the old object is deleted, so the CDN never serves a stale logo.
- Client components that call `usePathname()` must sit inside `<Suspense>` once a dynamic route exists (`/admin/echipe/[teamId]`), or `next build` fails. `AdminNav` is already wrapped; `SiteNav` is wrapped in the site layout since the public team page `/echipe/[teamId]` exists.
- Removing a team or player is blocked in the action when matches, events or appearances reference it. When a team is deleted, players left in no roster are deleted too.
- Forms use `ActionForm` + `SubmitButton` (`src/components/admin/action-form.tsx`), not a plain `<form action>`. React resets plain action forms after every submit, which would wipe the user's input on a validation error. Layout helpers are in `components/admin/fields.tsx`.
- Deletes that would cascade through matches and results are blocked in the action (for example a season that still has competitions), not only in the UI.

### Database workflow
Migrations are in `supabase/migrations/`, applied in filename order. The Supabase project is applied manually through the SQL Editor; there is no CLI link. `setup-complet.sql` in the repo root is a generated concatenation of all migrations plus the seed, used for that one-time paste, and is not a source file. `supabase/seed.sql` is demo data only.

Environment variables (`.env.local`, see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No service-role key is used anywhere.

## Project plan
The approved plan has 6 phases (feature list F1–F28). Phase 1 (foundation: schema, RLS, auth, layouts, tests) is done. Phase 2 (admin core) is in progress: **Sezoane și categorii, Competiții și faze, Cluburi/echipe/jucători and Meciuri are done** (clubs with logo upload, teams per competition, rosters; `/admin/meciuri?competitie=<id>` creates/edits/deletes matches with status, final score and penalties; kickoff times are Europe/Bucharest via `src/lib/datetime.ts`; a score is kept only for `finished` matches; matches with events/appearances can't change teams or be deleted; `/admin/meciuri/[matchId]` adds goals/own goals/cards with assist and minute, and saves who played; the event's player must be in a roster of the match's teams and the assist from the scorer's team). Phase 2 admin core is complete. Phase 3 (public pages) in progress: /clasament, /meciuri and /golgheteri read real data through `src/lib/public-data.ts` (cached, `?competitie=<id>` picker via `CompetitionPicker`); /echipe, /echipe/[teamId] and /jucatori are done too (SiteNav is now in Suspense); `/admin/continut` (announcements with optional banner flag, sponsors, prizes per competition, image uploads) feeds `/premii` and the home page (news + sponsors). The public registration form (`/inscriere`, calls `submit_registration` through a Server Action with the anon client, honeypot field, no captcha or rate limit yet) and `/admin/inscrieri` (approve/reject via the RPCs; players outside the competition birth-year range are flagged but can still be approved) are done. All planned features are built; the only plan step left is the Vercel deploy, which the user wants to delay (see the deploy notes before doing it: env vars, Supabase auth redirect URLs, first admin in `admins`). The user chose to stay flexible on order, so ask or follow their lead. Then public pages with real data, the registration form, and content (sponsors, prizes, banners) plus deploy to Vercel.

### Public design and Golazo-inspired features
The plan is in `~/.claude/plans/uite-acum-as-kind-rivest.md`. The user compared the site with golazo.md, a competitor, and chose to keep our own light style rather than Golazo's dark theme, and to skip break rows between matches.
- **Style:** the public site uses `forest`, `forest-soft`, `lime` and `paper` (in `globals.css`). Since the real logo (`public/logo.png`, gold trophy + black text; original in `public/FutureStarsCupLogo(transparent).png`) the tokens are remapped: `forest` is warm near-black, `lime` is gold. The site header is white; `Logo` has `tone="dark"` for light backgrounds and a white (CSS-inverted) version for dark ones. The tab icon is `src/app/icon.png`. The `(site)` layout sets the `bg-paper` background; admin keeps `pitch`/`gold`. Headings are large `font-display`, not uppercase.
- **Shared components:** `components/ui.tsx` (`SectionHeader`, `Segmented`, `Stat`, `EmptyState`, `PositionBadge`, `signed`), `match-row.tsx` (`MatchRow` inside a dark `MatchPanel`), `leader-card.tsx`, `filter-bar.tsx` (GET form), `player-avatar.tsx`, and `TeamBadge` with initials in `club-logo.tsx`. `CompetitionPicker` is a `Segmented` that keeps other params via `params`.
- **Home:** a "Jucătorul etapei" carousel (`home-hero.tsx`, falls back to `DefaultHero`); the current round plus a top-scorer card; top-6 standings; top-5 scorers; recent results from all competitions.
- **Pages:**
  - `/clasament`: podium, form (`lib/form.ts`), a "Campioană" badge when `StageStandings.complete`, and `?vedere=marcatori`.
  - `/meciuri`: round tabs `?etapa=<key>` from `lib/rounds.ts` (`groupRounds`/`currentRound`).
  - `/echipe` and `/jucatori`: card grids with `?q`, `?sort` and `?echipa`.
  - `/jucatori/[playerId]`: player profile from `getPlayerProfile`.
- **Match page** `/meciuri/[matchId]` (`getMatchDetail` in `public-data.ts`): scoreboard with status (Programat/LIVE/Finalizat), events timeline, team stats bars, lineups (from `match_appearances` plus anyone in an event, with shirt numbers and contributions), each team's standings row and last results, and the other matches of the same round. Every match card on the site links to it (overlay `<Link>` with `relative z-10` team links). Team stats (shots, shots on target, corners, fouls, offsides, possession) live in `match_team_stats` (migration `20261101000003`, optional per field), entered in `/admin/meciuri/[matchId]`; away possession is computed as 100 − home. The migration must be applied manually in the Supabase SQL Editor; `setup-complet.sql` does not include it yet.
- **Player photos:** a photo is public only when `players.photo_consent` is set. `getPlayerStats`, `getPlayerProfile` and `getRoundAwards` null it otherwise. Admin uploads it per player in `/admin/echipe/[teamId]`, which requires the consent checkbox, and removing it clears consent.
- **Live matches:** `match_status` has a `live` value (migration `20261101000002`). The admin starts it manually with "▶ Începe meciul" on `/admin/meciuri/[matchId]`; there is no automatic start by time because kickoffs run late, but a late scheduled match shows a reminder. While a match is live:
  - adding or deleting a goal or own goal moves the stored score by ±1 (`adjustLiveScore`);
  - "■ Termină meciul" sets the match to `finished`.
  Stats and standings count only finished matches. The public `MatchRow` shows a red LIVE score, and `currentRound` treats live like scheduled.
- **Round awards:** the `round_awards` table (migration `20261101000001`) is managed in `/admin/jucatorul-etapei`. The player is picked as `team:player` and must be in that team's roster. The sponsor comes from `sponsors`.

### Registration access code
`/inscriere` can be restricted with a single access code (migration `20261101000004`, applied manually in the SQL Editor; `setup-complet.sql` does not include it). The admin sets it in `/admin/inscrieri` (table `registration_settings`, admin-only RLS; stored in plain text so the admin can read it back). The page shows a code step first (`RegistrationGate`, `registration_code_ok` RPC); `submit_registration` re-checks `payload.access_code` itself, so calling the RPC directly can't bypass it. Comparison ignores case and surrounding spaces. **No code set = the form is open to everyone.** There is no rate limit on guesses yet. The home hero also shows a "Echipe participante" logo panel (`getHeroTeams`, `TeamsPanel` in `home-hero.tsx`).
