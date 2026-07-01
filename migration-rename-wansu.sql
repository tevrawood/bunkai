-- Corrects the kata name Wanshu -> Wansu. The app matches curriculum entries to
-- kata rows by exact name, so the seeded row must be renamed to stay linked.
-- Safe to run once; a no-op if the row was already renamed or never seeded.

update kata set name = 'Wansu' where name = 'Wanshu';
