# Shorinkan Bunkai

> **Kata to Application** — a mobile-first training tool for Okinawan karate
> practitioners to extract and record *bunkai* (practical applications) from kata.

Built with **Vite + React**, **Clerk** (auth), and **Supabase** (storage).
Designed to be used on a phone, on the dojo floor.

## Features

- **15 Shorinkan kata**, seeded and shared, grouped by curriculum series
  (Wanshu, Naihanchi, Pinan, Passai, Kusanku, Chinto, Gojushiho)
- **Record-first Add Bunkai wizard** (`/bunkai/new`): talk through the whole
  application in one take, then save it as a note or **revise** through a
  stepped form — Kata → Attack → Counter → Motion → Control → Finish, with a
  compass rose for direction and a tap-to-build combination list
- **Voice capture** everywhere it helps: mic recording is transcribed by
  **Whisper** through a server-side proxy, primed with Okinawan/Japanese
  vocabulary so terms like *neko-ashi-dachi* and *gyaku-zuki* come through clean
- **Kata Move Builder** (`/kata/:id/build`): speak or type each move of a kata
  in order to build the move list that later attributes each bunkai
- Slice each kata into **segments** (your study chunks) with instructor/lineage notes
- Log detailed **bunkai** per segment: attack, stance, up to 3 moves
  (technique, level, hikite action + target, tuite, kyusho), finish, kiai, notes
- Collapsible move blocks — only expand what you're using
- Every dropdown defaults to `—`, so partial entries are fine
  (only the attack type is required)
- **Bunkai view** across all kata with kata filter + **CSV export**
- Dated, searchable training **notes** (jot or dictate)
- **Rename, edit, and delete** across kata moves, segments, bunkai, and notes
- Dark, minimal, large tap targets

---

## Local development

```bash
npm install
cp .env.example .env   # then fill in the three values
npm run dev
```

### Environment variables

**Client (`VITE_`-prefixed, bundled into the app):**

| Variable | Where to get it |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys (anon/public) |

**Server (used only by the `/api` proxies — never exposed to the client):**

| Variable | Where to get it | Powers |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI dashboard → API Keys | `/api/transcribe` (Whisper) |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys | `/api/parse` (Claude field parsing) |

> The two server keys are read by the Vercel serverless functions in `api/` and
> stay on the server. Voice recording works locally only when these routes are
> reachable (`vercel dev`), or in any deployed/preview environment.

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

  -- Standalone path: a bunkai can attach straight to a kata (and the specific
  -- kata moves it comes from) instead of a segment — or to nothing at all.
  kata_id uuid references kata(id) on delete set null,
  move_numbers int[],

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
create index if not exists bunkai_user_kata_idx on bunkai (user_id, kata_id);

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

> **Already have an older database?** Run
> [`migration-bunkai-kata-link.sql`](migration-bunkai-kata-link.sql) in the SQL
> editor to add the `kata_id` + `move_numbers` columns the standalone Bunkai tab
> needs, and [`migration-notes.sql`](migration-notes.sql) to add the `notes`
> table for the Notes tab. (A fresh run of the schema above already includes the
> bunkai columns.)

### Row-level security (RLS)

This app uses Clerk for auth and Supabase's **native third-party auth**
integration. Clerk session tokens are sent to Supabase on every request, and the
Clerk user id is available inside policies as `auth.jwt()->>'sub'`.

```sql
-- Enable RLS on every table
alter table kata     enable row level security;
alter table segments enable row level security;
alter table bunkai   enable row level security;

-- Table privileges. RLS decides WHICH rows a role sees; these GRANTs decide
-- whether the role can touch the table at all. Supabase usually applies these
-- by default, but grant them explicitly so a fresh project never 401s with
-- "permission denied for table".
grant usage on schema public to anon, authenticated;
grant select on kata to anon, authenticated;
grant select, insert, update, delete on segments to authenticated;
grant select, insert, update, delete on bunkai to authenticated;

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
api/
  transcribe.js         Whisper proxy (OpenAI) — transcribes recorded audio
  parse.js              Claude proxy (Anthropic) — transcript → structured fields
src/
  main.jsx              ClerkProvider + Router bootstrap
  App.jsx               Auth gate + routes
  index.css             Theme + all styling
  lib/
    lexicons.js         Single source of truth for every dropdown
    curriculum.js       Shorinkan curriculum order (drives the grouped kata view)
    useSupabase.js      Clerk-authed Supabase client hook
    voice.js            Browser helpers: transcribeAudio + parseBunkai + extFor
    csv.js              Log → CSV export
  components/
    Layout.jsx          Top bar + bottom nav shell
    Field.jsx           Input / Select / Textarea / SegControl
    Modal.jsx           Bottom-sheet modal
    MoveBlock.jsx       Collapsible Move 1/2/3 block
    VoiceRecorder.jsx   Mic capture → Whisper transcription (reusable)
  pages/
    KataList.jsx        Home — kata grouped by curriculum series
    Segments.jsx        Segments for a kata + add modal
    KataMoveBuilder.jsx Speak/type each move of a kata to build its move list
    BunkaiHome.jsx      Bunkai tab — all entries, kata filter, CSV export, add
    BunkaiList.jsx      Bunkai entries for a segment
    BunkaiForm.jsx      The core capture form (typed or voice-parsed)
    BunkaiWizard.jsx    Record-first stepped wizard (/bunkai/new)
    BunkaiDetail.jsx    Full read-only entry + delete
    Notes.jsx           Dated, searchable training notes
```

## Future phases

Next up: wire **Claude parsing** into the record-first wizard so a spoken
bunkai auto-fills the structured fields (Kata → Attack → Counter → Motion →
Control → Finish) instead of only being kept as a note. `api/parse.js` already
scaffolds the Claude proxy — its schema still reflects the older lexicon fields
and needs updating to the new wizard shape.

Components are kept small and modular to grow further into: stick-figure
diagrams, video clips, and AI interpretation of full sequences.
