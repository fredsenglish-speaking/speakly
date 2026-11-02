-- Placement test: 10 questions for every level (A1–C2), 60 in total (Ms Jane, 2026-11-02:
-- 30 questions were too few). Scoring is unchanged: a level is passed with at least 60%
-- of its answers right (6 of 10), and the result is the highest level reached without
-- failing a level below it.
-- Run after 0015_placement_test_by_level.sql. Safe to run twice.

-- Make room: the 5 questions of each level move to positions 1–5, 11–15, 21–25 …,
-- so each level's 5 new questions can follow them (6–10, 16–20 …).
update test_questions
set position = ((position - 1) / 5) * 10 + ((position - 1) % 5) + 1
where (select count(*) from test_questions) = 30
  and (select max(position) from test_questions) = 30;

insert into test_questions (position, level, question, options, correct)
select v.position, v.level::cefr_level, v.question, v.options, v.correct
from (values
-- A1
(6,  'A1', 'My brother ___ two children.', array['have', 'has', 'having', 'is'], 1),
(7,  'A1', 'We ___ from Azerbaijan.', array['is', 'am', 'are', 'be'], 2),
(8,  'A1', 'I get up ___ 7 o''clock every morning.', array['in', 'on', 'at', 'to'], 2),
(9,  'A1', 'Where ___ your parents live?', array['does', 'do', 'is', 'are'], 1),
(10, 'A1', 'The opposite of "hot" is ___.', array['warm', 'tall', 'old', 'cold'], 3),
-- A2
(16, 'A2', 'I ___ never been to London.', array['has', 'have', 'am', 'did'], 1),
(17, 'A2', 'She can''t come to the phone. She ___ a shower.', array['has', 'have', 'is having', 'had'], 2),
(18, 'A2', 'You ___ smoke here. It''s not allowed.', array['mustn''t', 'don''t have to', 'needn''t', 'can'], 0),
(19, 'A2', 'This is the ___ day of my life!', array['good', 'better', 'most good', 'best'], 3),
(20, 'A2', 'We arrived ___ the airport two hours late.', array['to', 'at', 'on', 'into'], 1),
-- B1
(26, 'B1', 'If I ___ you, I would talk to her.', array['am', 'was being', 'were', 'be'], 2),
(27, 'B1', 'I''m looking forward ___ you again.', array['to see', 'to seeing', 'seeing', 'see'], 1),
(28, 'B1', 'She asked me where ___.', array['I lived', 'did I live', 'do I live', 'I am live'], 0),
(29, 'B1', 'The film was so ___ that I fell asleep.', array['bored', 'bore', 'boredom', 'boring'], 3),
(30, 'B1', 'He ___ for two hours when she finally arrived.', array['has waited', 'had been waiting', 'was waited', 'waits'], 1),
-- B2
(36, 'B2', 'I wish I ___ more time to travel.', array['have', 'had', 'will have', 'am having'], 1),
(37, 'B2', 'She is used to ___ up early.', array['get', 'got', 'getting', 'gets'], 2),
(38, 'B2', 'You should have ___ me earlier!', array['tell', 'telling', 'to tell', 'told'], 3),
(39, 'B2', 'The concert was ___ because of the storm.', array['called off', 'called up', 'called on', 'called in'], 0),
(40, 'B2', 'Hardly anyone came to the party, ___?', array['didn''t they', 'did they', 'did he', 'didn''t he'], 1),
-- C1
(46, 'C1', 'Had I known about the problem, I ___ something.', array['would do', 'had done', 'would have done', 'will do'], 2),
(47, 'C1', 'She insisted that he ___ present at the meeting.', array['is', 'be', 'was', 'will be'], 1),
(48, 'C1', 'No sooner had we sat down ___ the phone rang.', array['when', 'then', 'that', 'than'], 3),
(49, 'C1', 'The report ___ to have been written in a hurry.', array['seems', 'looks', 'sounds', 'shows'], 0),
(50, 'C1', 'His explanation was so ___ that nobody could follow it.', array['concise', 'convoluted', 'coherent', 'candid'], 1),
-- C2
(56, 'C2', 'Little ___ that his life was about to change.', array['he knew', 'he did know', 'did he know', 'knew he'], 2),
(57, 'C2', 'The minister''s remarks were seen as a ___ attempt to deflect criticism.', array['thinly veiled', 'thin veiled', 'thinly veil', 'thin veil'], 0),
(58, 'C2', 'Be that as it ___, we still have to finish on time.', array['might', 'may', 'can', 'will'], 1),
(59, 'C2', 'The new evidence ___ doubt on his version of events.', array['puts', 'brings', 'throws out', 'casts'], 3),
(60, 'C2', 'So ___ was the storm that the ferry had to turn back.', array['violently', 'violent', 'violence', 'violented'], 1)
) as v(position, level, question, options, correct)
where not exists (select 1 from test_questions x where x.question = v.question);

notify pgrst, 'reload schema';
