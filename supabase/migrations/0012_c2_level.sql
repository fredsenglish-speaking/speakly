-- Adds the C2 (Proficiency) level. Run this first, then 0013_c2_content.sql:
-- Postgres can only use a new enum value after the statement that adds it has finished.
-- Safe to run twice.

alter type cefr_level add value if not exists 'C2';

alter table level_teachers drop constraint if exists level_teachers_level_check;
alter table level_teachers add constraint level_teachers_level_check
  check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

notify pgrst, 'reload schema';
