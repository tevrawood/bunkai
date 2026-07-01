-- Adds a JSON payload column to `bunkai` so the stepped wizard can persist its
-- FULL structured state (kata, attack, counter, motion, control concepts,
-- finish detail, transcript) — not just the flattened summary it writes to
-- technique_notes. This is what lets "Edit" reopen the wizard on the
-- Counter / Control / Finish steps with every field rehydrated.
--
-- Safe to run on an existing database. Entries created before this migration
-- simply have a null payload and open in the wizard with only their stored
-- columns (attack / stance / finish / kata) prefilled.

alter table bunkai add column if not exists payload jsonb;
