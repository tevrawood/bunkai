-- Migration: let a bunkai attach directly to a kata + specific kata moves,
-- and stand on its own with no kata at all.
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
--
--   * kata_id      — optional kata this application comes from (null = standalone)
--   * move_numbers — which kata moves it covers (multi-select), e.g. {3,4}
--
-- segment_id was already nullable, so segment-less entries already worked at the
-- DB level; these two columns add the standalone "kata + moves" path.

alter table bunkai
  add column if not exists kata_id uuid references kata(id) on delete set null;

alter table bunkai
  add column if not exists move_numbers int[];

create index if not exists bunkai_user_kata_idx on bunkai (user_id, kata_id);
