-- One-step setup: schema + starter content. Paste all of this into Supabase SQL Editor and press Run.

-- Speakly initial schema.
-- Reads go through row level security; every write that involves money or
-- grading runs on the server with the service role key, after the server has
-- checked who is asking.

create type user_role as enum ('student', 'tutor', 'admin');
create type cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1');
create type booking_status as enum ('pending_payment', 'scheduled', 'completed', 'cancelled');
create type payment_kind as enum ('test', 'certificate', 'booking', 'lesson');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');

-- People ---------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  role user_role not null default 'student',
  level cefr_level,
  created_at timestamptz not null default now()
);

create table tutors (
  id uuid primary key references profiles on delete cascade,
  bio text not null default '',
  intro_video_url text,
  meeting_url text,
  languages text not null default '',
  years_experience int not null default 0 check (years_experience >= 0),
  levels cefr_level[] not null default '{}',
  price_15 numeric(8,2) not null default 5 check (price_15 > 0),
  price_30 numeric(8,2) not null default 9 check (price_30 > 0),
  price_60 numeric(8,2) not null default 15 check (price_60 > 0),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- New sign-ups get a profile. Only "student" and "tutor" can be chosen at
-- sign-up; admins are set by hand in the database.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wanted text := coalesce(new.raw_user_meta_data->>'role', 'student');
  r user_role := case when wanted = 'tutor' then 'tutor'::user_role else 'student'::user_role end;
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), r);
  if r = 'tutor' then
    insert into tutors (id) values (new.id);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Tutor availability --------------------------------------------------

create table tutor_slots (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references tutors on delete cascade,
  starts_at timestamptz not null,
  booked boolean not null default false,
  unique (tutor_id, starts_at)
);

-- Level test ----------------------------------------------------------

create table test_questions (
  id serial primary key,
  position int not null,
  question text not null,
  options text[] not null,
  correct int not null
);

create table test_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles on delete cascade,
  paid boolean not null default false,
  answers jsonb,
  score int,
  total int,
  level cefr_level,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table certificates (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references test_attempts on delete cascade,
  student_id uuid not null references profiles on delete cascade,
  code text not null unique,
  full_name text not null,
  level cefr_level not null,
  issued_at timestamptz not null default now()
);

-- Speaking classes ----------------------------------------------------

create table bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles on delete cascade,
  tutor_id uuid not null references tutors on delete cascade,
  slot_id uuid references tutor_slots on delete set null,
  starts_at timestamptz not null,
  duration_min int not null check (duration_min in (15, 30, 60)),
  price numeric(8,2) not null,
  status booking_status not null default 'pending_payment',
  meeting_url text,
  created_at timestamptz not null default now()
);

create table lessons (
  id serial primary key,
  slug text not null unique,
  level cefr_level not null,
  title text not null,
  summary text not null default '',
  explanation_video_url text,
  subtitled_video_url text,
  published boolean not null default true,
  position int not null default 0
);

create table tutor_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings on delete cascade,
  tutor_id uuid not null references tutors on delete cascade,
  student_id uuid not null references profiles on delete cascade,
  note text not null,
  lesson_ids int[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Lessons -------------------------------------------------------------

-- part 2 = first practice test, part 4 = second practice test
create table lesson_questions (
  id serial primary key,
  lesson_id int not null references lessons on delete cascade,
  part int not null check (part in (2, 4)),
  position int not null default 0,
  question text not null,
  options text[] not null,
  correct int not null
);

create table lesson_purchases (
  student_id uuid not null references profiles on delete cascade,
  lesson_id int not null references lessons on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

-- Payments ------------------------------------------------------------

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  kind payment_kind not null,
  ref_id text not null,
  amount numeric(8,2) not null,
  currency text not null default 'USD',
  status payment_status not null default 'pending',
  provider text not null,
  provider_ref text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Row level security --------------------------------------------------

alter table profiles enable row level security;
alter table tutors enable row level security;
alter table tutor_slots enable row level security;
alter table test_questions enable row level security;
alter table test_attempts enable row level security;
alter table certificates enable row level security;
alter table bookings enable row level security;
alter table lessons enable row level security;
alter table tutor_notes enable row level security;
alter table lesson_questions enable row level security;
alter table lesson_purchases enable row level security;
alter table payments enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid());
create policy "tutor profiles are public" on profiles for select
  using (role = 'tutor' and exists (select 1 from tutors t where t.id = profiles.id and t.approved));
-- people involved in a class can see each other's names
create policy "class partners" on profiles for select using (
  exists (select 1 from bookings b where
    (b.student_id = profiles.id and b.tutor_id = auth.uid()) or
    (b.tutor_id = profiles.id and b.student_id = auth.uid()))
);
revoke update on profiles from authenticated;
grant update (full_name) on profiles to authenticated;
create policy "edit own name" on profiles for update using (id = auth.uid());

create policy "approved tutors are public" on tutors for select using (approved or id = auth.uid());
revoke update on tutors from authenticated;
grant update (bio, intro_video_url, meeting_url, languages, years_experience, levels, price_15, price_30, price_60)
  on tutors to authenticated;
create policy "edit own tutor profile" on tutors for update using (id = auth.uid());

create policy "slots are public" on tutor_slots for select using (true);
create policy "tutor adds slots" on tutor_slots for insert with check (tutor_id = auth.uid() and not booked);
create policy "tutor removes free slots" on tutor_slots for delete using (tutor_id = auth.uid() and not booked);

-- test_questions: no policies, so only the server (service role) can read the answers

create policy "own attempts" on test_attempts for select using (student_id = auth.uid());
create policy "own certificates" on certificates for select using (student_id = auth.uid());

create policy "own classes" on bookings for select using (student_id = auth.uid() or tutor_id = auth.uid());

create policy "published lessons are public" on lessons for select using (published);

create policy "notes for the class" on tutor_notes for select using (student_id = auth.uid() or tutor_id = auth.uid());

create policy "questions after purchase" on lesson_questions for select using (
  exists (select 1 from lesson_purchases p where p.lesson_id = lesson_questions.lesson_id and p.student_id = auth.uid())
);

create policy "own purchases" on lesson_purchases for select using (student_id = auth.uid());
create policy "own payments" on payments for select using (user_id = auth.uid());

create index on tutor_slots (tutor_id, starts_at);
create index on bookings (student_id);
create index on bookings (tutor_id, starts_at);
create index on tutor_notes (student_id);
create index on payments (user_id);

-- Starter content. Ms Jane can edit or replace all of this from the
-- Supabase table editor.

insert into test_questions (position, question, options, correct) values
-- A1
(1,  'She ___ a teacher.', '{am,is,are,be}', 1),
(2,  'I ___ to school every day.', '{goes,going,go,gone}', 2),
(3,  'There ___ two cats in the garden.', '{is,am,are,be}', 2),
(4,  '___ you like coffee?', '{Does,Do,Are,Is}', 1),
-- A2
(5,  'Yesterday we ___ a great film.', '{watch,watched,"have watched",watching}', 1),
(6,  'This book is ___ than that one.', '{interesting,"more interesting","most interesting",interestinger}', 1),
(7,  'Look at the clouds! It ___ rain.', '{"is going to",will,rains,"is raining"}', 0),
(8,  'How ___ water do you drink a day?', '{many,much,lot,few}', 1),
-- B1
(9,  'I ___ in Baku since 2015.', '{live,lived,"have lived","am living"}', 2),
(10, 'If it rains tomorrow, we ___ at home.', '{stay,"will stay","would stay",stayed}', 1),
(11, 'When you called, I ___ dinner.', '{cooked,"was cooking","have cooked",cook}', 1),
(12, 'You ___ wear a seatbelt. It''s the law.', '{must,might,could,would}', 0),
-- B2
(13, 'The letter ___ by my grandmother in 1960.', '{wrote,"was written","has written","is writing"}', 1),
(14, 'If I ___ harder, I would have passed the exam.', '{studied,"had studied","have studied","would study"}', 1),
(15, 'She said that she ___ tired.', '{is,was,"has been",be}', 1),
(16, 'The man ___ car was stolen called the police.', '{who,which,whose,whom}', 2),
-- C1
(17, 'Never ___ such a beautiful view.', '{"I have seen","I saw","have I seen","I had see"}', 2),
(18, 'Not until the meeting ended ___ the truth.', '{"we learned","did we learn","we did learn","learned we"}', 1),
(19, 'If she had taken the job, she ___ in London now.', '{"would live","would be living","will live","had lived"}', 1),
(20, 'It was the manager ___ made the final decision.', '{which,what,who,whom}', 2);

insert into lessons (slug, level, title, summary, position) values
('a1-to-be',            'A1', 'To be (am / is / are)',           'Özümüz və başqaları haqqında sadə cümlələr.', 1),
('a1-present-simple',   'A1', 'Present Simple',                   'Gündəlik vərdişlər və faktlar.', 2),
('a1-articles',         'A1', 'Artikllar: a / an / the',          'Nə vaxt a, an və the işlədilir.', 3),
('a1-plurals',          'A1', 'Cəm isimlər',                      'Düzgün və qeyri-düzgün cəm formaları.', 4),
('a2-past-simple',      'A2', 'Past Simple',                      'Keçmişdə bitmiş hərəkətlər.', 1),
('a2-comparatives',     'A2', 'Müqayisə dərəcəsi',                'Bigger, more interesting, the best.', 2),
('a2-going-to',         'A2', 'Going to',                         'Planlar və proqnozlar.', 3),
('a2-countable',        'A2', 'Sayılan və sayılmayan isimlər',    'Much, many, some, any.', 4),
('b1-present-perfect',  'B1', 'Present Perfect',                  'Keçmişlə indiki an arasında əlaqə.', 1),
('b1-past-continuous',  'B1', 'Past Continuous',                  'Keçmişdə davam edən hərəkətlər.', 2),
('b1-first-conditional','B1', 'First Conditional',                'Real gələcək şərtlər.', 3),
('b1-must-have-to',     'B1', 'Must / have to',                   'Məcburiyyət və qaydalar.', 4),
('b2-passive',          'B2', 'Passive Voice',                    'Hərəkətin icraçısı vacib olmayanda.', 1),
('b2-conditionals',     'B2', 'Second və Third Conditional',      'Xəyali və keçmişdə baş verməmiş şərtlər.', 2),
('b2-reported-speech',  'B2', 'Reported Speech',                  'Başqasının sözlərini ötürmək.', 3),
('b2-relative-clauses', 'B2', 'Relative Clauses',                 'Who, which, whose, that.', 4),
('c1-inversion',        'C1', 'Inversion',                        'Never have I… vurğulu quruluşlar.', 1),
('c1-mixed-conditionals','C1','Mixed Conditionals',               'Keçmiş və indiki şərtlərin qarışığı.', 2),
('c1-cleft-sentences',  'C1', 'Cleft Sentences',                  'It was… that / What I need is…', 3),
('c1-advanced-modals',  'C1', 'Advanced Modals',                  'Must have, might have, should have.', 4);

insert into lesson_questions (lesson_id, part, position, question, options, correct)
select l.id, q.part, q.position, q.question, q.options::text[], q.correct
from (values
('a1-to-be',2,1,'They ___ my friends.','{is,am,are}',2),
('a1-to-be',2,2,'I ___ from Azerbaijan.','{am,is,are}',0),
('a1-to-be',4,1,'___ he a doctor?','{Am,Is,Are}',1),
('a1-to-be',4,2,'We ___ not tired.','{is,am,are}',2),
('a1-present-simple',2,1,'He ___ football on Sundays.','{play,plays,playing}',1),
('a1-present-simple',2,2,'She ___ like tea.','{don''t,doesn''t,not}',1),
('a1-present-simple',4,1,'___ they live in Ganja?','{Do,Does,Are}',0),
('a1-present-simple',4,2,'My father ___ at 7 every day.','{get up,gets up,getting up}',1),
('a1-articles',2,1,'I have ___ apple.','{a,an,the}',1),
('a1-articles',2,2,'She is ___ teacher.','{a,an,the}',0),
('a1-articles',4,1,'___ sun is very hot today.','{A,An,The}',2),
('a1-articles',4,2,'He bought ___ umbrella.','{a,an,the}',1),
('a1-plurals',2,1,'One child, two ___.','{childs,children,childrens}',1),
('a1-plurals',2,2,'One box, three ___.','{boxs,boxes,boxies}',1),
('a1-plurals',4,1,'One woman, two ___.','{womans,women,womens}',1),
('a1-plurals',4,2,'One city, many ___.','{citys,cities,cityes}',1),
('a2-past-simple',2,1,'We ___ to Sheki last summer.','{go,went,gone}',1),
('a2-past-simple',2,2,'She ___ the film.','{didn''t like,didn''t liked,not liked}',0),
('a2-past-simple',4,1,'___ you see Ali yesterday?','{Do,Did,Were}',1),
('a2-past-simple',4,2,'I ___ a letter last night.','{write,wrote,written}',1),
('a2-comparatives',2,1,'Baku is ___ than Ganja.','{big,bigger,biggest}',1),
('a2-comparatives',2,2,'This is the ___ day of my life.','{good,better,best}',2),
('a2-comparatives',4,1,'English is ___ than Chinese.','{easyer,easier,more easy}',1),
('a2-comparatives',4,2,'He is the ___ student in the class.','{most clever,cleverest,cleverer}',1),
('a2-going-to',2,1,'I ___ visit my grandmother tomorrow.','{am going to,going to,go to}',0),
('a2-going-to',2,2,'Look! The glass ___ fall.','{is going to,will going,goes to}',0),
('a2-going-to',4,1,'___ you going to study tonight?','{Do,Are,Will}',1),
('a2-going-to',4,2,'They ___ going to buy a car.','{isn''t,aren''t,don''t}',1),
('a2-countable',2,1,'How ___ apples do you want?','{much,many,lot}',1),
('a2-countable',2,2,'There isn''t ___ milk in the fridge.','{many,any,some}',1),
('a2-countable',4,1,'I need ___ information.','{an,some,many}',1),
('a2-countable',4,2,'How ___ money do you have?','{many,much,few}',1),
('b1-present-perfect',2,1,'I ___ never been to London.','{have,has,had}',0),
('b1-present-perfect',2,2,'She ___ her keys. She can''t open the door.','{lost,has lost,have lost}',1),
('b1-present-perfect',4,1,'Have you ___ finished your homework?','{yet,already,since}',1),
('b1-present-perfect',4,2,'We have lived here ___ ten years.','{since,for,ago}',1),
('b1-past-continuous',2,1,'I ___ TV when you called.','{watched,was watching,were watching}',1),
('b1-past-continuous',2,2,'They ___ playing football at 5 pm.','{was,were,are}',1),
('b1-past-continuous',4,1,'While she ___, the phone rang.','{cooked,was cooking,cooks}',1),
('b1-past-continuous',4,2,'What ___ you doing at 8 last night?','{was,were,did}',1),
('b1-first-conditional',2,1,'If you study, you ___ pass.','{will,would,are}',0),
('b1-first-conditional',2,2,'If it ___ tomorrow, we will stay home.','{will rain,rains,rained}',1),
('b1-first-conditional',4,1,'I''ll call you if I ___ time.','{have,will have,had}',0),
('b1-first-conditional',4,2,'If you don''t hurry, you ___ the bus.','{miss,will miss,missed}',1),
('b1-must-have-to',2,1,'You ___ smoke here. It''s forbidden.','{mustn''t,don''t have to,haven''t}',0),
('b1-must-have-to',2,2,'I ___ wear a uniform at work.','{have to,has to,must to}',0),
('b1-must-have-to',4,1,'You ___ come if you don''t want to.','{mustn''t,don''t have to,must}',1),
('b1-must-have-to',4,2,'She ___ get up early tomorrow.','{have to,has to,must to}',1),
('b2-passive',2,1,'English ___ all over the world.','{speaks,is spoken,is speaking}',1),
('b2-passive',2,2,'The bridge ___ in 1990.','{was built,built,has built}',0),
('b2-passive',4,1,'The results ___ next week.','{will announce,will be announced,are announcing}',1),
('b2-passive',4,2,'My car ___ right now.','{is repaired,is being repaired,repairs}',1),
('b2-conditionals',2,1,'If I ___ rich, I would travel the world.','{am,were,will be}',1),
('b2-conditionals',2,2,'If she had called, I ___ helped.','{would,would have,will have}',1),
('b2-conditionals',4,1,'What would you do if you ___ the lottery?','{win,won,had won}',1),
('b2-conditionals',4,2,'If we ___ earlier, we wouldn''t have missed the train.','{left,had left,would leave}',1),
('b2-reported-speech',2,1,'"I am busy." → He said he ___ busy.','{is,was,has been}',1),
('b2-reported-speech',2,2,'"I will help." → She said she ___ help.','{will,would,can}',1),
('b2-reported-speech',4,1,'"Where do you live?" → He asked me where I ___.','{live,lived,do live}',1),
('b2-reported-speech',4,2,'"Don''t be late." → She told me ___ late.','{not be,not to be,don''t be}',1),
('b2-relative-clauses',2,1,'The woman ___ lives next door is a doctor.','{which,who,whose}',1),
('b2-relative-clauses',2,2,'This is the book ___ I told you about.','{who,which,whose}',1),
('b2-relative-clauses',4,1,'That''s the boy ___ father is a pilot.','{who,whose,which}',1),
('b2-relative-clauses',4,2,'The city ___ I was born is small.','{which,where,who}',1),
('c1-inversion',2,1,'Rarely ___ such talent.','{we see,do we see,we do see}',1),
('c1-inversion',2,2,'No sooner ___ arrived than it started to rain.','{we had,had we,did we}',1),
('c1-inversion',4,1,'Only then ___ the truth.','{I realised,did I realise,I did realise}',1),
('c1-inversion',4,2,'Under no circumstances ___ open this door.','{you should,should you,you must}',1),
('c1-mixed-conditionals',2,1,'If I had studied medicine, I ___ a doctor now.','{would be,would have been,will be}',0),
('c1-mixed-conditionals',2,2,'If she weren''t so shy, she ___ to the party yesterday.','{would go,would have gone,went}',1),
('c1-mixed-conditionals',4,1,'If we ___ the map, we wouldn''t be lost now.','{took,had taken,take}',1),
('c1-mixed-conditionals',4,2,'If he were more careful, he ___ the accident last week.','{wouldn''t have had,wouldn''t have,won''t have}',0),
('c1-cleft-sentences',2,1,'___ I need is a long holiday.','{That,What,Which}',1),
('c1-cleft-sentences',2,2,'It was Leyla ___ found the keys.','{who,what,which}',0),
('c1-cleft-sentences',4,1,'What surprised me ___ his answer.','{were,was,is being}',1),
('c1-cleft-sentences',4,2,'It was in 2010 ___ we met.','{when,that,which}',1),
('c1-advanced-modals',2,1,'He''s late. He ___ missed the bus.','{must have,should have,can have}',0),
('c1-advanced-modals',2,2,'You ___ told me! I would have helped.','{must have,should have,might}',1),
('c1-advanced-modals',4,1,'She ___ have seen us; it was very dark.','{can''t,mustn''t,shouldn''t}',0),
('c1-advanced-modals',4,2,'They ___ have gone home already, I''m not sure.','{might,must,should}',0)
) as q(slug, part, position, question, options, correct)
join lessons l on l.slug = q.slug;

-- English and Russian titles and summaries for lessons.
-- The Azerbaijani text stays in title / summary.

alter table lessons
  add column if not exists title_en text,
  add column if not exists title_ru text,
  add column if not exists summary_en text,
  add column if not exists summary_ru text;

update lessons set title_en = v.title_en, title_ru = v.title_ru, summary_en = v.summary_en, summary_ru = v.summary_ru
from (values
('a1-to-be',              'To be (am / is / are)',       'To be (am / is / are)',               'Simple sentences about yourself and others.',     'Простые предложения о себе и других.'),
('a1-present-simple',     'Present Simple',              'Present Simple',                      'Daily habits and facts.',                         'Ежедневные привычки и факты.'),
('a1-articles',           'Articles: a / an / the',      'Артикли: a / an / the',               'When to use a, an and the.',                      'Когда употреблять a, an и the.'),
('a1-plurals',            'Plural nouns',                'Множественное число',                 'Regular and irregular plurals.',                  'Правильные и неправильные формы.'),
('a2-past-simple',        'Past Simple',                 'Past Simple',                         'Finished actions in the past.',                   'Завершённые действия в прошлом.'),
('a2-comparatives',       'Comparatives and superlatives','Степени сравнения',                  'Bigger, more interesting, the best.',             'Bigger, more interesting, the best.'),
('a2-going-to',           'Going to',                    'Going to',                            'Plans and predictions.',                          'Планы и прогнозы.'),
('a2-countable',          'Countable and uncountable nouns','Исчисляемые и неисчисляемые',     'Much, many, some, any.',                          'Much, many, some, any.'),
('b1-present-perfect',    'Present Perfect',             'Present Perfect',                     'Linking the past and the present.',               'Связь прошлого с настоящим.'),
('b1-past-continuous',    'Past Continuous',             'Past Continuous',                     'Actions in progress in the past.',                'Длительные действия в прошлом.'),
('b1-first-conditional',  'First Conditional',           'First Conditional',                   'Real future conditions.',                         'Реальные условия в будущем.'),
('b1-must-have-to',       'Must / have to',              'Must / have to',                      'Obligation and rules.',                           'Обязанность и правила.'),
('b2-passive',            'Passive Voice',               'Passive Voice',                       'When the doer of the action doesn''t matter.',    'Когда исполнитель действия не важен.'),
('b2-conditionals',       'Second and Third Conditional','Second и Third Conditional',          'Imaginary and unreal past conditions.',           'Воображаемые и нереальные условия в прошлом.'),
('b2-reported-speech',    'Reported Speech',             'Reported Speech',                     'Passing on what someone said.',                   'Передача чужих слов.'),
('b2-relative-clauses',   'Relative Clauses',            'Relative Clauses',                    'Who, which, whose, that.',                        'Who, which, whose, that.'),
('c1-inversion',          'Inversion',                   'Inversion',                           'Emphatic structures like Never have I…',          'Эмфатические конструкции: Never have I…'),
('c1-mixed-conditionals', 'Mixed Conditionals',          'Mixed Conditionals',                  'Mixing past and present conditions.',             'Смешение прошлых и настоящих условий.'),
('c1-cleft-sentences',    'Cleft Sentences',             'Cleft Sentences',                     'It was… that / What I need is…',                  'It was… that / What I need is…'),
('c1-advanced-modals',    'Advanced Modals',             'Advanced Modals',                     'Must have, might have, should have.',             'Must have, might have, should have.')
) as v(slug, title_en, title_ru, summary_en, summary_ru)
where lessons.slug = v.slug;

-- 0003_more_lessons.sql
-- 40 more grammar lessons (8 per level, so 12 per level in total), in 3 languages,
-- each with 4 practice questions (2 for part 2, 2 for part 4).
-- Safe to run twice: existing slugs are skipped.

insert into lessons (slug, level, title, title_en, title_ru, summary, summary_en, summary_ru, position) values
('a1-possessives', 'A1', 'Sahiblik əvəzlikləri: my / your / his / her', 'Possessive adjectives: my / your / his / her', 'Притяжательные: my / your / his / her', 'Kimin nəyi olduğunu demək.', 'Saying who something belongs to.', 'Как сказать, кому что принадлежит.', 5),
('a1-there-is-are', 'A1', 'There is / there are', 'There is / there are', 'There is / there are', 'Bir yerdə nəyin olduğunu demək.', 'Saying what is in a place.', 'Как сказать, что где находится.', 6),
('a1-can', 'A1', 'Can / can''t', 'Can / can''t', 'Can / can''t', 'Bacarıq və icazə haqqında danışmaq.', 'Talking about ability and permission.', 'Умения и разрешение.', 7),
('a1-present-continuous', 'A1', 'Present Continuous', 'Present Continuous', 'Present Continuous', 'İndi baş verən hərəkətlər.', 'Actions happening now.', 'Действия, происходящие сейчас.', 8),
('a1-prepositions-place', 'A1', 'Yer sözönləri: in / on / under / next to', 'Prepositions of place: in / on / under / next to', 'Предлоги места: in / on / under / next to', 'Əşyanın harada olduğunu demək.', 'Saying where things are.', 'Как сказать, где находится предмет.', 9),
('a1-prepositions-time', 'A1', 'Zaman sözönləri: in / on / at', 'Prepositions of time: in / on / at', 'Предлоги времени: in / on / at', 'Günlər, aylar və saatlarla düzgün sözön.', 'The right word for days, months and times.', 'Правильный предлог для дней, месяцев и часов.', 10),
('a1-question-words', 'A1', 'Sual sözləri: what / where / when / who', 'Question words: what / where / when / who', 'Вопросительные слова: what / where / when / who', 'Sadə suallar qurmaq.', 'Making simple questions.', 'Как задавать простые вопросы.', 11),
('a1-this-that', 'A1', 'This / that / these / those', 'This / that / these / those', 'This / that / these / those', 'Yaxın və uzaq əşyaları göstərmək.', 'Pointing to things near and far.', 'Указание на близкие и далёкие предметы.', 12),
('a2-simple-vs-continuous', 'A2', 'Present Simple və Present Continuous', 'Present Simple vs Present Continuous', 'Present Simple и Present Continuous', 'Vərdiş və indi baş verən hərəkət fərqi.', 'Habits versus actions happening now.', 'Привычки и действия в данный момент.', 5),
('a2-will', 'A2', 'Will ilə gələcək', 'Future with will', 'Будущее время с will', 'Qərarlar, vədlər və proqnozlar.', 'Decisions, promises and predictions.', 'Решения, обещания и прогнозы.', 6),
('a2-should', 'A2', 'Should / shouldn''t', 'Should / shouldn''t', 'Should / shouldn''t', 'Məsləhət vermək.', 'Giving advice.', 'Как давать советы.', 7),
('a2-adverbs-frequency', 'A2', 'Tezlik zərfləri: always / often / never', 'Adverbs of frequency: always / often / never', 'Наречия частоты: always / often / never', 'Bir işi nə qədər tez-tez etdiyini demək.', 'Saying how often you do things.', 'Как часто вы что-то делаете.', 8),
('a2-object-pronouns', 'A2', 'Obyekt əvəzlikləri: me / him / her / them', 'Object pronouns: me / him / her / them', 'Объектные местоимения: me / him / her / them', 'Cümlədə obyekt kimi əvəzliklər.', 'Pronouns after verbs and prepositions.', 'Местоимения после глаголов и предлогов.', 9),
('a2-possessive-pronouns', 'A2', 'Sahiblik əvəzlikləri: mine / yours / hers', 'Possessive pronouns: mine / yours / hers', 'Притяжательные местоимения: mine / yours / hers', 'İsim olmadan sahibliyi göstərmək.', 'Showing possession without a noun.', 'Принадлежность без существительного.', 10),
('a2-too-enough', 'A2', 'Too və enough', 'Too and enough', 'Too и enough', 'Çox və ya kifayət qədər olduğunu demək.', 'Saying something is too much or enough.', 'Слишком много или достаточно.', 11),
('a2-adverbs-manner', 'A2', 'Tərz zərfləri: quickly / well', 'Adverbs of manner: quickly / well', 'Наречия образа действия: quickly / well', 'Hərəkətin necə edildiyini demək.', 'Saying how something is done.', 'Как выполняется действие.', 12),
('b1-used-to', 'B1', 'Used to', 'Used to', 'Used to', 'Keçmişdəki vərdişlər və artıq olmayan hallar.', 'Past habits and states that are no longer true.', 'Прошлые привычки, которых больше нет.', 5),
('b1-zero-conditional', 'B1', 'Zero Conditional', 'Zero Conditional', 'Zero Conditional', 'Həmişə doğru olan faktlar və nəticələr.', 'Facts and results that are always true.', 'Факты, которые всегда верны.', 6),
('b1-gerund-infinitive', 'B1', 'Gerund və Infinitive', 'Gerunds and infinitives', 'Герундий и инфинитив', 'Enjoy doing yoxsa want to do?', 'Enjoy doing or want to do?', 'Enjoy doing или want to do?', 7),
('b1-present-perfect-continuous', 'B1', 'Present Perfect Continuous', 'Present Perfect Continuous', 'Present Perfect Continuous', 'Keçmişdə başlayıb hələ də davam edən hərəkətlər.', 'Actions that started in the past and are still going on.', 'Действия, начавшиеся в прошлом и продолжающиеся сейчас.', 8),
('b1-past-perfect', 'B1', 'Past Perfect', 'Past Perfect', 'Past Perfect', 'Keçmişdə başqa hərəkətdən əvvəl olan hərəkət.', 'An action before another past action.', 'Действие до другого действия в прошлом.', 9),
('b1-may-might-could', 'B1', 'Ehtimal: may / might / could', 'Possibility: may / might / could', 'Вероятность: may / might / could', 'Əmin olmadığımız şeylər haqqında danışmaq.', 'Talking about things we are not sure about.', 'Когда мы не уверены.', 10),
('b1-so-such', 'B1', 'So və such', 'So and such', 'So и such', 'Vurğu üçün so və such.', 'Using so and such for emphasis.', 'So и such для усиления.', 11),
('b1-question-tags', 'B1', 'Question tags', 'Question tags', 'Разделительные вопросы', '…, isn''t it? kimi qısa suallar.', 'Short questions like …, isn''t it?', 'Короткие вопросы вроде …, isn''t it?', 12),
('b2-future-continuous-perfect', 'B2', 'Future Continuous və Future Perfect', 'Future Continuous and Future Perfect', 'Future Continuous и Future Perfect', 'Gələcəkdə davam edəcək və bitmiş olacaq hərəkətlər.', 'Actions in progress or completed in the future.', 'Действия в процессе или завершённые в будущем.', 5),
('b2-wish', 'B2', 'Wish / If only', 'Wish / If only', 'Wish / If only', 'Təəssüf və arzuları ifadə etmək.', 'Expressing regrets and wishes.', 'Сожаления и желания.', 6),
('b2-deduction', 'B2', 'Nəticə çıxarma: must be / can''t be', 'Deduction: must be / can''t be', 'Логический вывод: must be / can''t be', 'Dəlillərə əsasən əminliklə nəticə çıxarmaq.', 'Making confident guesses from evidence.', 'Уверенные выводы на основе фактов.', 7),
('b2-causative', 'B2', 'Causative: have / get something done', 'Causative: have / get something done', 'Каузатив: have / get something done', 'Bir işi başqasına etdirmək.', 'Getting someone else to do something for you.', 'Когда кто-то делает что-то для вас.', 8),
('b2-contrast', 'B2', 'Ziddiyyət: although / despite / however', 'Contrast: although / despite / however', 'Противопоставление: although / despite / however', 'Fikirləri ziddiyyətlə bağlamaq.', 'Linking contrasting ideas.', 'Как связывать противоположные мысли.', 9),
('b2-past-perfect-continuous', 'B2', 'Past Perfect Continuous', 'Past Perfect Continuous', 'Past Perfect Continuous', 'Keçmişdəki bir anadək davam edən hərəkət.', 'An action that continued up to a point in the past.', 'Действие, длившееся до момента в прошлом.', 10),
('b2-used-to-be-used-to', 'B2', 'Used to / be used to / get used to', 'Used to / be used to / get used to', 'Used to / be used to / get used to', 'Keçmiş vərdiş və bir şeyə öyrəşmək fərqi.', 'Past habits versus being accustomed to something.', 'Прошлые привычки и привыкание.', 11),
('b2-phrasal-verbs', 'B2', 'Phrasal Verbs', 'Phrasal verbs', 'Фразовые глаголы', 'Gündəlik danışıqda ən çox işlənən phrasal verb-lər.', 'The most common phrasal verbs in everyday speech.', 'Самые частые фразовые глаголы в речи.', 12),
('c1-participle-clauses', 'C1', 'Participle Clauses', 'Participle clauses', 'Причастные обороты', 'Cümləni qısaltmaq üçün -ing və -ed qurğuları.', 'Shortening sentences with -ing and -ed clauses.', 'Сокращение предложений с -ing и -ed.', 5),
('c1-subjunctive', 'C1', 'Subjunctive', 'The subjunctive', 'Сослагательное наклонение', 'Rəsmi tələb və təkliflərdə: I suggest that he be…', 'Formal demands and suggestions: I suggest that he be…', 'Формальные требования: I suggest that he be…', 6),
('c1-emphatic-do', 'C1', 'Vurğu üçün do / does / did', 'Emphasis with do / does / did', 'Усиление с do / does / did', 'Fikri gücləndirmək: I do like it!', 'Adding emphasis: I do like it!', 'Усиление: I do like it!', 7),
('c1-ellipsis-substitution', 'C1', 'Ellipsis və substitution', 'Ellipsis and substitution', 'Эллипсис и замена', 'Təkrardan qaçmaq: so, not, one, do so.', 'Avoiding repetition: so, not, one, do so.', 'Как избегать повторов: so, not, one, do so.', 8),
('c1-impersonal-passive', 'C1', 'Impersonal Passive: It is said that…', 'Impersonal passive: It is said that…', 'Безличный пассив: It is said that…', 'Rəsmi dildə ümumi fikirləri ötürmək.', 'Reporting general opinions in formal English.', 'Передача общих мнений в формальном стиле.', 9),
('c1-future-in-past', 'C1', 'Future in the Past', 'Future in the past', 'Будущее в прошлом', 'Keçmişdəki planlar: was going to, would.', 'Past plans: was going to, would.', 'Планы в прошлом: was going to, would.', 10),
('c1-would-rather', 'C1', 'Would rather / It''s time', 'Would rather / It''s time', 'Would rather / It''s time', 'Üstünlük və vaxtı çatmış hərəkətlər.', 'Preferences and things that should happen now.', 'Предпочтения и то, что пора сделать.', 11),
('c1-nominalisation', 'C1', 'Nominalisation', 'Nominalisation', 'Номинализация', 'Akademik üslub: feli isimlə əvəz etmək.', 'Academic style: turning verbs into nouns.', 'Академический стиль: глаголы в существительные.', 12)
on conflict (slug) do nothing;

insert into lesson_questions (lesson_id, part, position, question, options, correct)
select l.id, v.part, v.position, v.question, v.options, v.correct
from (values
('a1-possessives', 2, 1, 'This is ___ book. (I)', array['me', 'my', 'mine'], 1),
('a1-possessives', 2, 2, 'She loves ___ cat.', array['his', 'her', 'she'], 1),
('a1-possessives', 4, 1, 'They live with ___ parents.', array['their', 'them', 'they'], 0),
('a1-possessives', 4, 2, 'What is ___ name? (you)', array['you', 'yours', 'your'], 2),
('a1-there-is-are', 2, 1, 'There ___ a park near my house.', array['is', 'are', 'be'], 0),
('a1-there-is-are', 2, 2, 'There ___ three chairs in the room.', array['is', 'are', 'am'], 1),
('a1-there-is-are', 4, 1, '___ there any milk in the fridge?', array['Are', 'Is', 'Do'], 1),
('a1-there-is-are', 4, 2, 'There ___ any students in the class today.', array['isn''t', 'aren''t', 'not'], 1),
('a1-can', 2, 1, 'I can ___ English.', array['speak', 'speaks', 'speaking'], 0),
('a1-can', 2, 2, 'She ___ swim. She is afraid of water.', array['can', 'can''t', 'doesn''t'], 1),
('a1-can', 4, 1, '___ you play the guitar?', array['Do', 'Are', 'Can'], 2),
('a1-can', 4, 2, 'He can ___ very fast.', array['runs', 'run', 'running'], 1),
('a1-present-continuous', 2, 1, 'Look! It ___ raining.', array['is', 'are', 'am'], 0),
('a1-present-continuous', 2, 2, 'They are ___ TV now.', array['watch', 'watching', 'watches'], 1),
('a1-present-continuous', 4, 1, 'I ___ reading a book at the moment.', array['is', 'are', 'am'], 2),
('a1-present-continuous', 4, 2, 'What ___ you doing?', array['is', 'are', 'do'], 1),
('a1-prepositions-place', 2, 1, 'The keys are ___ the table.', array['on', 'at', 'to'], 0),
('a1-prepositions-place', 2, 2, 'The cat is ___ the box.', array['in', 'at', 'of'], 0),
('a1-prepositions-place', 4, 1, 'The shoes are ___ the bed.', array['under', 'in', 'at'], 0),
('a1-prepositions-place', 4, 2, 'The bank is ___ the supermarket.', array['next', 'next to', 'near of'], 1),
('a1-prepositions-time', 2, 1, 'My birthday is ___ May.', array['in', 'on', 'at'], 0),
('a1-prepositions-time', 2, 2, 'The class starts ___ 9 o''clock.', array['in', 'on', 'at'], 2),
('a1-prepositions-time', 4, 1, 'We have English ___ Monday.', array['in', 'on', 'at'], 1),
('a1-prepositions-time', 4, 2, 'I sleep ___ night.', array['in', 'on', 'at'], 2),
('a1-question-words', 2, 1, '___ do you live? – In Baku.', array['What', 'Where', 'Who'], 1),
('a1-question-words', 2, 2, '___ is your teacher? – Ms Jane.', array['Who', 'When', 'Where'], 0),
('a1-question-words', 4, 1, '___ is the lesson? – At 5 pm.', array['Who', 'What', 'When'], 2),
('a1-question-words', 4, 2, '___ is your favourite colour?', array['What', 'Where', 'Who'], 0),
('a1-this-that', 2, 1, '___ is my phone. (here, one)', array['This', 'These', 'Those'], 0),
('a1-this-that', 2, 2, '___ are my shoes. (here, many)', array['This', 'That', 'These'], 2),
('a1-this-that', 4, 1, 'Look at ___ birds in the sky!', array['this', 'that', 'those'], 2),
('a1-this-that', 4, 2, 'Is ___ your car over there?', array['these', 'that', 'those'], 1),
('a2-simple-vs-continuous', 2, 1, 'I usually ___ to work by bus.', array['go', 'am going', 'goes'], 0),
('a2-simple-vs-continuous', 2, 2, 'Be quiet! The baby ___.', array['sleeps', 'is sleeping', 'sleep'], 1),
('a2-simple-vs-continuous', 4, 1, 'She ___ coffee every morning.', array['drinks', 'is drinking', 'drink'], 0),
('a2-simple-vs-continuous', 4, 2, 'Why ___ you wearing a coat today?', array['do', 'are', 'is'], 1),
('a2-will', 2, 1, 'I think it ___ rain tomorrow.', array['will', 'is', 'does'], 0),
('a2-will', 2, 2, 'I''m tired. I ___ go to bed early.', array['will', 'am', 'do'], 0),
('a2-will', 4, 1, 'Don''t worry, I ___ tell anyone.', array['don''t', 'won''t', 'not'], 1),
('a2-will', 4, 2, '___ you help me, please?', array['Will', 'Are', 'Do'], 0),
('a2-should', 2, 1, 'You look ill. You ___ see a doctor.', array['should', 'shouldn''t', 'must not'], 0),
('a2-should', 2, 2, 'You ___ eat so much sugar.', array['should', 'shouldn''t', 'can'], 1),
('a2-should', 4, 1, 'What ___ I wear to the party?', array['should', 'shall to', 'do'], 0),
('a2-should', 4, 2, 'He should ___ more water.', array['drinks', 'drink', 'to drink'], 1),
('a2-adverbs-frequency', 2, 1, 'Which is correct?', array['I always am late.', 'I am always late.', 'Always I am late.'], 1),
('a2-adverbs-frequency', 2, 2, 'She ___ eats meat. She is vegetarian.', array['always', 'often', 'never'], 2),
('a2-adverbs-frequency', 4, 1, 'Which is correct?', array['He goes often to the gym.', 'He often goes to the gym.', 'He goes to often the gym.'], 1),
('a2-adverbs-frequency', 4, 2, 'How ___ do you visit your grandparents?', array['often', 'much', 'many'], 0),
('a2-object-pronouns', 2, 1, 'Can you help ___? (I)', array['I', 'me', 'my'], 1),
('a2-object-pronouns', 2, 2, 'I like Anna. I often talk to ___.', array['she', 'her', 'hers'], 1),
('a2-object-pronouns', 4, 1, 'Where are my keys? I can''t find ___.', array['it', 'them', 'they'], 1),
('a2-object-pronouns', 4, 2, 'Tom is my friend. I play football with ___.', array['he', 'his', 'him'], 2),
('a2-possessive-pronouns', 2, 1, 'This pen isn''t mine. Is it ___?', array['your', 'yours', 'you'], 1),
('a2-possessive-pronouns', 2, 2, 'That bag is ___. (she)', array['her', 'hers', 'she'], 1),
('a2-possessive-pronouns', 4, 1, 'Our house is big, but ___ is bigger. (they)', array['their', 'theirs', 'them'], 1),
('a2-possessive-pronouns', 4, 2, 'Whose phone is this? – It''s ___. (I)', array['my', 'me', 'mine'], 2),
('a2-too-enough', 2, 1, 'The coffee is ___ hot to drink.', array['too', 'enough', 'very much'], 0),
('a2-too-enough', 2, 2, 'He isn''t old ___ to drive.', array['too', 'enough', 'so'], 1),
('a2-too-enough', 4, 1, 'Is the room ___ for ten people?', array['big enough', 'enough big', 'too big enough'], 0),
('a2-too-enough', 4, 2, 'I can''t buy it. It''s ___ expensive.', array['enough', 'too', 'so much'], 1),
('a2-adverbs-manner', 2, 1, 'She speaks English very ___.', array['good', 'well', 'goodly'], 1),
('a2-adverbs-manner', 2, 2, 'Please drive ___.', array['careful', 'carefully', 'care'], 1),
('a2-adverbs-manner', 4, 1, 'He ran ___ to catch the bus.', array['quick', 'quickly', 'quicker'], 1),
('a2-adverbs-manner', 4, 2, 'The children played ___ in the garden.', array['happy', 'happily', 'happiness'], 1),
('b1-used-to', 2, 1, 'I ___ play tennis when I was a child.', array['use to', 'used to', 'was used'], 1),
('b1-used-to', 2, 2, 'Did you ___ live in Ganja?', array['use to', 'used to', 'using to'], 0),
('b1-used-to', 4, 1, 'She ___ like vegetables, but now she loves them.', array['didn''t use to', 'usedn''t', 'not used to'], 0),
('b1-used-to', 4, 2, 'There ___ be a cinema here.', array['use to', 'used to', 'was used to'], 1),
('b1-zero-conditional', 2, 1, 'If you heat ice, it ___.', array['melts', 'will melt', 'melted'], 0),
('b1-zero-conditional', 2, 2, 'If it rains, the grass ___ wet.', array['gets', 'got', 'would get'], 0),
('b1-zero-conditional', 4, 1, 'Plants die if they ___ water.', array['don''t get', 'won''t get', 'didn''t get'], 0),
('b1-zero-conditional', 4, 2, 'If I drink coffee at night, I ___ sleep.', array['can''t', 'couldn''t', 'won''t to'], 0),
('b1-gerund-infinitive', 2, 1, 'I enjoy ___ books.', array['read', 'to read', 'reading'], 2),
('b1-gerund-infinitive', 2, 2, 'She wants ___ a doctor.', array['become', 'to become', 'becoming'], 1),
('b1-gerund-infinitive', 4, 1, 'They decided ___ a new car.', array['buying', 'to buy', 'buy'], 1),
('b1-gerund-infinitive', 4, 2, 'He is good at ___ problems.', array['solve', 'to solve', 'solving'], 2),
('b1-present-perfect-continuous', 2, 1, 'I ___ English for three years.', array['have been learning', 'am learning', 'learned'], 0),
('b1-present-perfect-continuous', 2, 2, 'How long ___ you been waiting?', array['are', 'have', 'did'], 1),
('b1-present-perfect-continuous', 4, 1, 'She''s tired because she ___ all day.', array['has been working', 'worked', 'is work'], 0),
('b1-present-perfect-continuous', 4, 2, 'It ___ raining since morning.', array['is', 'has been', 'was been'], 1),
('b1-past-perfect', 2, 1, 'When I arrived, the film ___.', array['already started', 'had already started', 'has already started'], 1),
('b1-past-perfect', 2, 2, 'She ___ never seen snow before she went to Moscow.', array['has', 'had', 'was'], 1),
('b1-past-perfect', 4, 1, 'After he ___ dinner, he went out.', array['had eaten', 'has eaten', 'eats'], 0),
('b1-past-perfect', 4, 2, 'I didn''t know her because we ___ met before.', array['hadn''t', 'haven''t', 'didn''t'], 0),
('b1-may-might-could', 2, 1, 'Take an umbrella. It ___ rain later.', array['might', 'must', 'should'], 0),
('b1-may-might-could', 2, 2, 'I''m not sure. She ___ be at home.', array['may', 'must', 'has to'], 0),
('b1-may-might-could', 4, 1, 'We ___ go to the beach if it''s sunny.', array['could', 'must', 'have to'], 0),
('b1-may-might-could', 4, 2, 'He might ___ late tonight.', array['is', 'be', 'being'], 1),
('b1-so-such', 2, 1, 'It was ___ a good film!', array['so', 'such', 'very'], 1),
('b1-so-such', 2, 2, 'The test was ___ difficult.', array['so', 'such', 'such a'], 0),
('b1-so-such', 4, 1, 'They are ___ nice people.', array['so', 'such', 'such a'], 1),
('b1-so-such', 4, 2, 'I was ___ tired that I fell asleep.', array['such', 'so', 'such a'], 1),
('b1-question-tags', 2, 1, 'You are a teacher, ___?', array['are you', 'aren''t you', 'don''t you'], 1),
('b1-question-tags', 2, 2, 'She doesn''t like fish, ___?', array['does she', 'doesn''t she', 'is she'], 0),
('b1-question-tags', 4, 1, 'They went home, ___?', array['didn''t they', 'don''t they', 'weren''t they'], 0),
('b1-question-tags', 4, 2, 'Let''s go, ___?', array['will we', 'shall we', 'don''t we'], 1),
('b2-future-continuous-perfect', 2, 1, 'This time tomorrow I ___ on a beach.', array['will lie', 'will be lying', 'will have lain'], 1),
('b2-future-continuous-perfect', 2, 2, 'By 2030 they ___ the new bridge.', array['will build', 'will be building', 'will have built'], 2),
('b2-future-continuous-perfect', 4, 1, 'Don''t call at 8 – we ___ dinner.', array['will be having', 'will have had', 'have'], 0),
('b2-future-continuous-perfect', 4, 2, 'By next June I ___ here for ten years.', array['will work', 'will have worked', 'am working'], 1),
('b2-wish', 2, 1, 'I wish I ___ more free time.', array['have', 'had', 'will have'], 1),
('b2-wish', 2, 2, 'If only I ___ to her yesterday!', array['listened', 'had listened', 'listen'], 1),
('b2-wish', 4, 1, 'I wish you ___ stop making that noise.', array['would', 'will', 'did'], 0),
('b2-wish', 4, 2, 'She wishes she ___ speak French.', array['can', 'could', 'would'], 1),
('b2-deduction', 2, 1, 'He''s been working all day. He ___ be tired.', array['must', 'can''t', 'mustn''t'], 0),
('b2-deduction', 2, 2, 'That ___ be Anna – she''s in London.', array['must', 'can''t', 'might not to'], 1),
('b2-deduction', 4, 1, 'The lights are off. They ___ have gone out.', array['must', 'can''t', 'should'], 0),
('b2-deduction', 4, 2, 'She ___ have seen us, or she would have said hello.', array['must', 'can''t', 'needn''t'], 1),
('b2-causative', 2, 1, 'I ___ my hair cut yesterday.', array['had', 'made', 'did'], 0),
('b2-causative', 2, 2, 'We''re getting our house ___.', array['paint', 'painted', 'painting'], 1),
('b2-causative', 4, 1, 'You should have your eyes ___.', array['test', 'tested', 'testing'], 1),
('b2-causative', 4, 2, 'She got her car ___ last week.', array['repaired', 'repair', 'to repair'], 0),
('b2-contrast', 2, 1, '___ it was raining, we went out.', array['Despite', 'Although', 'However'], 1),
('b2-contrast', 2, 2, '___ the rain, we went out.', array['Although', 'Despite', 'Even'], 1),
('b2-contrast', 4, 1, 'It was expensive. ___, we bought it.', array['However', 'Although', 'Despite'], 0),
('b2-contrast', 4, 2, 'In spite ___ his age, he runs every day.', array['that', 'of', 'to'], 1),
('b2-past-perfect-continuous', 2, 1, 'She was tired because she ___ all night.', array['had been studying', 'has been studying', 'was studied'], 0),
('b2-past-perfect-continuous', 2, 2, 'How long ___ they been waiting when the bus came?', array['have', 'had', 'did'], 1),
('b2-past-perfect-continuous', 4, 1, 'His eyes were red. He ___ crying.', array['had been', 'has been', 'was been'], 0),
('b2-past-perfect-continuous', 4, 2, 'We ___ for two hours before we found the hotel.', array['had been walking', 'have been walking', 'walked been'], 0),
('b2-used-to-be-used-to', 2, 1, 'I''m used to ___ up early.', array['get', 'getting', 'got'], 1),
('b2-used-to-be-used-to', 2, 2, 'It took me months to ___ used to the cold.', array['get', 'be', 'use'], 0),
('b2-used-to-be-used-to', 4, 1, 'He ___ smoke, but he stopped.', array['used to', 'is used to', 'gets used to'], 0),
('b2-used-to-be-used-to', 4, 2, 'She isn''t used to ___ on the left.', array['drive', 'driving', 'drove'], 1),
('b2-phrasal-verbs', 2, 1, 'Please ___ the form before you leave. (complete)', array['fill in', 'fill on', 'fill at'], 0),
('b2-phrasal-verbs', 2, 2, 'I ___ my old friend at the market. (met by chance)', array['ran into', 'ran out', 'ran over'], 0),
('b2-phrasal-verbs', 4, 1, 'We''ve ___ milk. Can you buy some? (have none left)', array['run out of', 'run into', 'run off'], 0),
('b2-phrasal-verbs', 4, 2, 'She ___ smoking last year. (stopped)', array['gave up', 'gave in', 'gave out'], 0),
('c1-participle-clauses', 2, 1, '___ the door, she saw a stranger.', array['Opening', 'Opened', 'To open'], 0),
('c1-participle-clauses', 2, 2, '___ in 1990, the building is now a museum.', array['Building', 'Built', 'Having building'], 1),
('c1-participle-clauses', 4, 1, '___ finished the report, he went home.', array['Having', 'Had', 'Being'], 0),
('c1-participle-clauses', 4, 2, 'Not ___ what to say, I kept quiet.', array['knowing', 'known', 'to know'], 0),
('c1-subjunctive', 2, 1, 'The doctor recommended that she ___ more.', array['rests', 'rest', 'rested'], 1),
('c1-subjunctive', 2, 2, 'It is essential that every student ___ on time.', array['is', 'be', 'was'], 1),
('c1-subjunctive', 4, 1, 'I insist that he ___ the truth.', array['tells', 'tell', 'told'], 1),
('c1-subjunctive', 4, 2, 'If I ___ you, I would accept the offer.', array['was', 'were', 'am'], 1),
('c1-emphatic-do', 2, 1, 'I ___ understand your point, but I disagree.', array['do', 'am', 'have'], 0),
('c1-emphatic-do', 2, 2, 'She ___ call you – she just forgot to leave a message.', array['does', 'did', 'do'], 1),
('c1-emphatic-do', 4, 1, 'He ___ look tired today.', array['does', 'do', 'is'], 0),
('c1-emphatic-do', 4, 2, 'We ___ hope you''ll join us.', array['do', 'does', 'did to'], 0),
('c1-ellipsis-substitution', 2, 1, 'Will it rain? – I hope ___.', array['not', 'no', 'don''t'], 0),
('c1-ellipsis-substitution', 2, 2, 'Is she coming? – I think ___.', array['so', 'it', 'that'], 0),
('c1-ellipsis-substitution', 4, 1, 'I wanted the red dress, but they only had a blue ___.', array['one', 'it', 'ones'], 0),
('c1-ellipsis-substitution', 4, 2, 'He said he would call, and he ___.', array['did', 'made', 'was'], 0),
('c1-impersonal-passive', 2, 1, 'It ___ that the company will close.', array['says', 'is said', 'said'], 1),
('c1-impersonal-passive', 2, 2, 'He is believed ___ abroad.', array['live', 'to live', 'living'], 1),
('c1-impersonal-passive', 4, 1, 'The thief is thought ___ the country.', array['to have left', 'leaving', 'to leave out'], 0),
('c1-impersonal-passive', 4, 2, 'It ___ reported that prices will rise.', array['has been', 'has', 'have'], 0),
('c1-future-in-past', 2, 1, 'I ___ call you, but I forgot.', array['was going to', 'am going to', 'will'], 0),
('c1-future-in-past', 2, 2, 'She knew she ___ be late.', array['will', 'would', 'is going'], 1),
('c1-future-in-past', 4, 1, 'They were ___ leave when it started to rain.', array['about to', 'about', 'going'], 0),
('c1-future-in-past', 4, 2, 'He promised he ___ help us.', array['will', 'would', 'is'], 1),
('c1-would-rather', 2, 1, 'I''d rather you ___ smoke here.', array['don''t', 'didn''t', 'won''t'], 1),
('c1-would-rather', 2, 2, 'It''s time we ___ home.', array['go', 'went', 'will go'], 1),
('c1-would-rather', 4, 1, 'I''d rather ___ at home tonight.', array['stay', 'to stay', 'staying'], 0),
('c1-would-rather', 4, 2, 'It''s high time you ___ a job.', array['find', 'found', 'will find'], 1),
('c1-nominalisation', 2, 1, 'They decided quickly. → Their ___ was quick.', array['deciding', 'decision', 'decide'], 1),
('c1-nominalisation', 2, 2, 'Prices increased. → There was an ___ in prices.', array['increase', 'increasing', 'increased'], 0),
('c1-nominalisation', 4, 1, 'The company failed. → The ___ of the company surprised everyone.', array['fail', 'failure', 'failing'], 1),
('c1-nominalisation', 4, 2, 'They analysed the data. → Their ___ of the data was careful.', array['analyse', 'analysis', 'analysing'], 1)
) as v(slug, part, position, question, options, correct)
join lessons l on l.slug = v.slug
where not exists (select 1 from lesson_questions x where x.lesson_id = l.id);
