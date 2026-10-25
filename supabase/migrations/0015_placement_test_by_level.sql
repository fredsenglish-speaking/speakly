-- Placement test: 5 questions for every level (A1–C2), 30 in total.
-- Each question now knows its level, so the result is worked out level by level:
-- a level counts as passed with at least 3 of its 5 answers right, and the
-- student's level is the highest one reached without failing a level below it.
-- Run after 0013_c2_content.sql. Safe to run twice.

alter table test_questions add column if not exists level cefr_level;

-- The 24 existing questions are 4 per level in position order (A1 = 1–4 … C2 = 21–24).
-- Tag them and leave a gap after each level for its new fifth question.
update test_questions
set level = (array['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])[(position - 1) / 4 + 1]::cefr_level,
    position = position + (position - 1) / 4
where level is null and position between 1 and 24;

insert into test_questions (position, level, question, options, correct)
select v.position, v.level::cefr_level, v.question, v.options, v.correct
from (values
(5,  'A1', 'This is ___ umbrella.', array['a', 'an', 'the', 'some'], 1),
(10, 'A2', 'He isn''t tall ___ to reach the top shelf.', array['enough', 'too', 'very', 'so'], 0),
(15, 'B1', 'He ___ smoke, but he gave up last year.', array['used to', 'use to', 'is used to', 'was used'], 0),
(20, 'B2', 'By this time next year, I ___ my degree.', array['will finish', 'will have finished', 'finish', 'am finishing'], 1),
(25, 'C1', 'It''s high time we ___ home.', array['go', 'went', 'will go', 'are going'], 1),
(30, 'C2', 'She is, ___, the most gifted pianist of her generation.', array['arguably', 'arguable', 'argue', 'argued'], 0)
) as v(position, level, question, options, correct)
where not exists (select 1 from test_questions x where x.question = v.question);

notify pgrst, 'reload schema';
