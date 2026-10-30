# Future Stars Cup

Platforma campionatului de fotbal pentru copii: clasamente, program, rezultate, echipe, jucători, golgheteri, plus un panou de administrare.

**Stack:** Next.js 16 (App Router, Cache Components) · Supabase (Postgres, Auth, Storage) · Tailwind CSS 4

## Pornire locală

```bash
npm install
cp .env.example .env.local   # completează cheile Supabase
npm run dev                  # http://localhost:3000
```

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm run dev` | server de dezvoltare |
| `npm run build` | build de producție |
| `npm test` | teste (logica de clasament + baza de date în memorie, fără Supabase) |
| `npm run lint` | verificare cod |

## Structură

```
supabase/
  migrations/   schema, view-uri de statistici, securitate (RLS), storage
  seed.sql      date demo (sezon, 10 echipe, meciuri cu marcatori)
  tests/        testează migrările într-un Postgres în memorie (PGlite)
src/
  app/(site)/   site-ul public
  app/admin/    login + panou de administrare
  lib/          clienți Supabase, verificare admin, departajarea în clasament
  proxy.ts      protejează /admin
```

## Cum funcționează datele

Adminul introduce doar **fapte**: meciuri, scoruri, marcatori, pase decisive, prezențe.
Clasamentul și statisticile **nu se stochează** — sunt calculate de view-urile din
`supabase/migrations/*_stats_views.sql`. Ordinea finală în clasament (puncte → golaveraj →
goluri marcate → întâlniri directe → alfabetic) se aplică în `src/lib/standings.ts`.

## Conectare Supabase (o singură dată)

1. Creează un proiect pe [supabase.com](https://supabase.com).
2. Rulează migrările din `supabase/migrations/` (în ordine) în SQL Editor sau cu `npx supabase db push`.
3. Opțional, rulează `supabase/seed.sql` pentru date demo.
4. Creează contul de admin în **Authentication → Users**, apoi în SQL Editor:
   ```sql
   insert into admins (user_id) select id from auth.users where email = 'email@tau.md';
   ```
5. Completează `.env.local` cu URL-ul proiectului și cheia publică (anon / publishable).
