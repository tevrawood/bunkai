-- Migration: store the full structured payload of the new stepped Bunkai wizard.
--
-- The new wizard (src/pages/BunkaiWizard.jsx) captures a richer model than the
-- original flat columns: attack count/subtype/extra, counter side/force/
-- direction/stance, motion type + bearing/turn, a control combo (array),
-- stance shift, and a finish type + finish detail + can-continue. Rather than
-- add ~18 columns, we keep ONE jsonb column. The wizard still also populates the
-- existing attack / attack_side / stance / finish / technique_notes columns, so
-- the current list / detail / CSV views keep working unchanged.
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Until you run it, the wizard saves fine — it just stores the readable summary
-- in technique_notes and skips the structured payload.

alter table bunkai
  add column if not exists payload jsonb;

-- Force PostgREST to refresh its schema cache so the API sees the new column
-- right away (otherwise inserts can fail with "could not find the 'payload'
-- column ... in the schema cache" until the cache reloads on its own).
notify pgrst, 'reload schema';
