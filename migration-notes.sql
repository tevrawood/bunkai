-- Migration: free-form dated training notes (the Notes tab).
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Each note is a body of text stamped with its creation time; users only ever
-- see and edit their own. The last line refreshes PostgREST's schema cache so
-- the API sees the new table right away.

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists notes_user_created_idx on notes (user_id, created_at desc);

alter table notes enable row level security;

grant select, insert, update, delete on notes to authenticated;

create policy "notes select own"
  on notes for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "notes insert own"
  on notes for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "notes update own"
  on notes for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "notes delete own"
  on notes for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

notify pgrst, 'reload schema';
