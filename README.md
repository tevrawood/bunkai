# Shorinkan Bunkai

> **Kata to Application** — a mobile-first training tool for Okinawan karate
> practitioners to extract and record *bunkai* (practical applications) from kata.

Built with **Vite + React**, **Clerk** (auth), and **Supabase** (storage).
Designed to be used on a phone, on the dojo floor.

## Features

- 15 Shorinkan kata, seeded and shared
- Slice each kata into **segments** (your study chunks) with instructor/lineage notes
- Log detailed **bunkai** per segment: attack, stance, up to 3 moves
  (technique, level, hikite action + target, tuite, kyusho), finish, kiai, notes
- Collapsible move blocks — only expand what you're using
- Every dropdown defaults to `—`, so partial entries are fine
  (only the attack type is required)
- **Log view** across all kata with kata filter + **CSV export**
- Dark, minimal, large tap targets

---

## Local development

```bash
npm install
cp .env.example .env   # then fill in the three values
npm run dev
```

### Environment variables

| Variable | Where to get it |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys (anon/public) |

---

## 1. Supabase setup

Create a new Supabase project, then open the **SQL Editor** and run the
following. It creates the tables, seeds the kata, and enables row-level security.

### Schema + seed

```sql
-- ───────────────────────── KATA (shared, fixed, seeded) ─────────────────────────
create table if not exists kata (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lineage text default 'Shorinkan'
);

-- ───────────────────────── SEGMENTS (user-defined) ─────────────────────────
create table if not exists segments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kata_id uuid references kata(id) on delete cascade,
  name text not null,
  move_range text,
  notes text,
  created_at timestamptz default now()
);

-- ───────────────────────── BUNKAI ENTRIES ─────────────────────────
create table if not exists bunkai (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  segment_id uuid references segments(id) on delete cascade,

  -- ATTACK
  attack text,
  attack_side text,

  -- STANCE
  stance text,

  -- MOVE 1
  m1_side text,
  m1_technique text,
  m1_level text,
  m1_hikite_action text,
  m1_hikite_target text,
  m1_tuite text,
  m1_kyusho text,

  -- MOVE 2
  m2_side text,
  m2_technique text,
  m2_level text,
  m2_hikite_action text,
  m2_hikite_target text,
  m2_tuite text,
  m2_kyusho text,

  -- MOVE 3
  m3_side text,
  m3_technique text,
  m3_level text,
  m3_hikite_action text,
  m3_hikite_target text,
  m3_tuite text,
  m3_kyusho text,

  -- FINISH
  finish text,

  -- KIAI
  kiai boolean default false,

  -- NOTES
  technique_notes text,

  created_at timestamptz default now()
);

create index if not exists segments_user_kata_idx on segments (user_id, kata_id);
create index if not exists bunkai_user_segment_idx on bunkai (user_id, segment_id);

-- ───────────────────────── SEED KATA ─────────────────────────
insert into kata (name, lineage) values
  ('Wanshu', 'Shorinkan'),
  ('Naihanchi Shodan', 'Shorinkan'),
  ('Naihanchi Nidan', 'Shorinkan'),
  ('Naihanchi Sandan', 'Shorinkan'),
  ('Pinan Shodan', 'Shorinkan'),
  ('Pinan Nidan', 'Shorinkan'),
  ('Pinan Sandan', 'Shorinkan'),
  ('Pinan Yondan', 'Shorinkan'),
  ('Pinan Godan', 'Shorinkan'),
  ('Passai Sho', 'Shorinkan'),
  ('Passai Dai', 'Shorinkan'),
  ('Kusanku Sho', 'Shorinkan'),
  ('Kusanku Dai', 'Shorinkan'),
  ('Chinto', 'Shorinkan'),
  ('Gojushiho', 'Shorinkan')
on conflict do nothing;
```

### Row-level security (RLS)

This app uses Clerk for auth and Supabase's **native third-party auth**
integration. Clerk session tokens are sent to Supabase on every request, and the
Clerk user id is available inside policies as `auth.jwt()->>'sub'`.

```sql
-- Enable RLS on every table
alter table kata     enable row level security;
alter table segments enable row level security;
alter table bunkai   enable row level security;

-- KATA: public read, no writes from clients
create policy "kata public read"
  on kata for select
  to authenticated, anon
  using (true);

-- SEGMENTS: users only see / change their own rows
create policy "segments select own"
  on segments for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "segments insert own"
  on segments for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "segments update own"
  on segments for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "segments delete own"
  on segments for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- BUNKAI: users only see / change their own rows
create policy "bunkai select own"
  on bunkai for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "bunkai insert own"
  on bunkai for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "bunkai update own"
  on bunkai for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "bunkai delete own"
  on bunkai for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
```

### Connect Clerk to Supabase (one-time)

1. In **Clerk** → **Configure** → **Supabase**: enable the integration (or use
   **JWT Templates**) and copy the **Clerk domain** it gives you.
2. In **Supabase** → **Authentication** → **Sign In / Providers** →
   **Third-Party Auth**, add **Clerk** and paste the Clerk domain.

That's it — the app's Supabase client (`src/lib/useSupabase.js`) already forwards
the Clerk token via the `accessToken` callback.

---

## 2. Clerk setup

1. Create a new application at [clerk.com](https://clerk.com).
2. Under **User & Authentication → Email, Phone, Username**, enable **Email**
   (simplest to start).
3. Copy the **Publishable key** from **API Keys** into
   `VITE_CLERK_PUBLISHABLE_KEY`.
4. Complete the Supabase connection step above.

---

## 3. Vercel deploy

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
   Vercel auto-detects Vite (build: `npm run build`, output: `dist`).
   `vercel.json` already rewrites all routes to `index.html` for the SPA router.
3. **Add the three environment variables** in
   **Project → Settings → Environment Variables**
   (set them for **Production**, **Preview**, and **Development**):
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy.** After the first deploy, add your Vercel domain to Clerk's
   allowed origins (**Clerk → Domains**) if prompted.

---

## Project structure

```
src/
  main.jsx              ClerkProvider + Router bootstrap
  App.jsx               Auth gate + routes
  index.css             Theme + all styling
  lib/
    lexicons.js         Single source of truth for every dropdown
    useSupabase.js      Clerk-authed Supabase client hook
    csv.js              Log → CSV export
  components/
    Layout.jsx          Top bar + bottom nav shell
    Field.jsx           Input / Select / Textarea / SegControl
    Modal.jsx           Bottom-sheet modal
    MoveBlock.jsx       Collapsible Move 1/2/3 block
  pages/
    KataList.jsx        Home — grid of kata
    Segments.jsx        Segments for a kata + add modal
    BunkaiList.jsx      Bunkai entries for a segment
    BunkaiForm.jsx      The core capture form
    BunkaiDetail.jsx    Full read-only entry + delete
    Log.jsx             All entries, filter, CSV export
```

## Future phases

Components are kept small and modular to grow into: stick-figure diagrams,
video clips, and AI interpretation of sequences.
