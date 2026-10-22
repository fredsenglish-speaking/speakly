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

-- 0004_speaking_club.sql
-- Speaking club: students of the same level practise in pairs on a topic.
-- 20 topics per level, 10 questions each. Run once in Supabase SQL Editor.

alter type payment_kind add value if not exists 'practice';

create table if not exists practice_topics (
  id serial primary key,
  slug text not null unique,
  level cefr_level not null,
  position int not null default 0,
  title text not null,
  title_en text not null,
  title_ru text not null,
  questions text[] not null
);

-- A room is one 2-person speaking session. Only the server reads and writes it.
create table if not exists practice_rooms (
  id uuid primary key default gen_random_uuid(),
  topic_id int not null references practice_topics,
  level cefr_level not null,
  host_id uuid not null references profiles on delete cascade,
  guest_id uuid references profiles on delete set null,
  starts_at timestamptz not null,
  host_paid boolean not null default false,
  guest_paid boolean not null default false,
  cancelled boolean not null default false,
  meeting_url text not null,
  created_at timestamptz not null default now()
);
create index if not exists practice_rooms_level_time on practice_rooms (level, starts_at);

alter table practice_topics enable row level security;
alter table practice_rooms enable row level security;
drop policy if exists "topics are public" on practice_topics;
create policy "topics are public" on practice_topics for select using (true);

insert into practice_topics (slug, level, position, title, title_en, title_ru, questions) values
('a1-about-me', 'A1', 1, 'Özüm haqqında', 'About me', 'О себе',
  array['What is your name?', 'How old are you?', 'Where are you from?', 'Where do you live now?', 'What is your job, or what do you study?', 'Do you have any brothers or sisters?', 'What is your favourite colour?', 'What languages can you speak?', 'What do you like to do at the weekend?', 'Describe yourself in three words.']),
('a1-family', 'A1', 2, 'Ailə', 'My family', 'Моя семья',
  array['How many people are there in your family?', 'What are your parents'' names?', 'Do you have a big or a small family?', 'Who is the oldest person in your family?', 'Who is the youngest person in your family?', 'What does your mother or father do?', 'Do you have any cousins? How many?', 'Who do you live with?', 'What do you do with your family on Sundays?', 'Who in your family are you most similar to?']),
('a1-daily-routine', 'A1', 3, 'Gündəlik iş rejimi', 'My daily routine', 'Мой распорядок дня',
  array['What time do you get up?', 'What do you eat for breakfast?', 'How do you go to work or school?', 'What time do you have lunch?', 'What do you do in the afternoon?', 'What time do you come home?', 'What do you do in the evening?', 'Do you watch TV every day?', 'What time do you go to bed?', 'What is your favourite part of the day? Why?']),
('a1-food', 'A1', 4, 'Yemək və içkilər', 'Food and drinks', 'Еда и напитки',
  array['What is your favourite food?', 'What food don''t you like?', 'Do you like tea or coffee?', 'What do you usually eat for dinner?', 'Can you cook? What can you cook?', 'Do you like fruit? Which fruit?', 'What is a popular food in your country?', 'Do you eat fast food?', 'What do you drink in the morning?', 'Where do you like to eat with friends?']),
('a1-home', 'A1', 5, 'Evim', 'My home', 'Мой дом',
  array['Do you live in a house or a flat?', 'How many rooms are there in your home?', 'What is your favourite room? Why?', 'What is there in your bedroom?', 'Is your home big or small?', 'What colour are the walls in your room?', 'Is there a garden or a balcony?', 'Who cleans your home?', 'What can you see from your window?', 'Describe your dream house.']),
('a1-town', 'A1', 6, 'Şəhərim', 'My town', 'Мой город',
  array['What is the name of your town or city?', 'Is it big or small?', 'What is there in your town?', 'Is there a park near your home?', 'Where do you go shopping?', 'What is your favourite place in your town?', 'Is your town quiet or noisy?', 'How do people travel in your town?', 'What is the weather like there?', 'What can tourists do in your town?']),
('a1-free-time', 'A1', 7, 'Boş vaxt', 'Free time', 'Свободное время',
  array['What do you do in your free time?', 'Do you like sport? Which sport?', 'Do you like music? What kind?', 'Do you play computer games?', 'Do you read books?', 'Do you like going to the cinema?', 'What do you do with your friends?', 'Do you have a hobby?', 'What do you like to do on holiday?', 'What new hobby would you like to try?']),
('a1-weather', 'A1', 8, 'Hava və fəsillər', 'Weather and seasons', 'Погода и времена года',
  array['What is the weather like today?', 'What is your favourite season? Why?', 'Do you like hot or cold weather?', 'What do you wear when it is cold?', 'What do you do when it rains?', 'Does it snow in your country?', 'What is the weather like in summer?', 'Do you like the wind?', 'What do you do in winter?', 'Which month do you like best?']),
('a1-clothes', 'A1', 9, 'Geyim', 'Clothes', 'Одежда',
  array['What are you wearing today?', 'What is your favourite piece of clothing?', 'Do you like shopping for clothes?', 'What colours do you usually wear?', 'Do you prefer jeans or trousers?', 'What do you wear at the weekend?', 'What do you wear to work or school?', 'Do you like hats?', 'Where do you buy your clothes?', 'What clothes do you wear at a party?']),
('a1-animals', 'A1', 10, 'Heyvanlar', 'Animals', 'Животные',
  array['Do you have a pet?', 'What is your favourite animal?', 'Do you like cats or dogs more?', 'What animals live in your country?', 'Are you afraid of any animals?', 'What is a good name for a pet?', 'What animals can you see in a zoo?', 'Which animal is very big?', 'Which animal is very fast?', 'If you were an animal, what would you be?']),
('a1-shopping', 'A1', 11, 'Alış-veriş', 'Shopping', 'Покупки',
  array['Do you like shopping?', 'Where do you buy food?', 'How often do you go shopping?', 'Do you shop online?', 'What did you buy last week?', 'Do you like big shops or small shops?', 'Who does the shopping in your family?', 'What is expensive in your town?', 'What do you want to buy now?', 'What is your favourite shop?']),
('a1-school', 'A1', 12, 'Məktəb və dərslər', 'School and classes', 'Школа и уроки',
  array['Do you study now? Where?', 'What is your favourite subject?', 'What subject don''t you like?', 'Who is your favourite teacher?', 'How many students are in your class?', 'What time do your classes start?', 'Do you have homework every day?', 'What do you do in the break?', 'Why do you learn English?', 'What do you want to learn next?']),
('a1-friends', 'A1', 13, 'Dostlar', 'Friends', 'Друзья',
  array['Who is your best friend?', 'How old is your best friend?', 'Where does your friend live?', 'What does your friend look like?', 'What do you do together?', 'How often do you see your friends?', 'Do you have friends from other countries?', 'How do you talk to your friends: by phone or online?', 'Why do you like your best friend?', 'What makes a good friend?']),
('a1-body-health', 'A1', 14, 'Bədən və sağlamlıq', 'Body and health', 'Тело и здоровье',
  array['How do you feel today?', 'What do you do when you are ill?', 'Do you do sport to stay healthy?', 'How many hours do you sleep?', 'Do you drink a lot of water?', 'What do you eat to be healthy?', 'Do you walk every day?', 'When do you go to the doctor?', 'What is good for your health?', 'What is bad for your health?']),
('a1-transport', 'A1', 15, 'Nəqliyyat', 'Transport', 'Транспорт',
  array['How do you go to work or school?', 'Do you have a car or a bike?', 'Do you like travelling by bus?', 'Is there a metro in your city?', 'Do you like flying?', 'How long does it take to get to work or school?', 'Do you walk a lot?', 'What is the fastest way to travel in your city?', 'Do you like taxis?', 'What transport do you like most?']),
('a1-jobs', 'A1', 16, 'Peşələr', 'Jobs', 'Профессии',
  array['What is your job, or what job do you want?', 'What does your father or mother do?', 'Is your job easy or difficult?', 'What time do you start work?', 'Do you work at the weekend?', 'What job is very interesting?', 'What job is very difficult?', 'Do you want to be a teacher? Why?', 'What job did you want as a child?', 'What is a good job for you?']),
('a1-birthdays', 'A1', 17, 'Ad günləri və bayramlar', 'Birthdays and holidays', 'Дни рождения и праздники',
  array['When is your birthday?', 'What do you do on your birthday?', 'What was your best birthday present?', 'Do you like parties?', 'What is your favourite holiday?', 'What do you eat on Novruz?', 'Do you give presents to your friends?', 'What do you do on New Year''s Eve?', 'Who comes to your birthday party?', 'What do you want for your next birthday?']),
('a1-my-day-yesterday', 'A1', 18, 'Dünən nə etdim', 'What I did yesterday', 'Что я делал вчера',
  array['What time did you get up yesterday?', 'What did you eat for breakfast?', 'Where did you go?', 'Who did you see?', 'What did you do in the afternoon?', 'Did you watch TV?', 'Did you study English?', 'What did you have for dinner?', 'What time did you go to bed?', 'Was yesterday a good day? Why?']),
('a1-technology', 'A1', 19, 'Telefon və internet', 'Phones and the internet', 'Телефон и интернет',
  array['Do you have a smartphone?', 'How many hours do you use your phone a day?', 'What apps do you use every day?', 'Do you use social media?', 'Do you watch videos online?', 'Do you play games on your phone?', 'Do you send messages or call more?', 'Can you live without your phone?', 'What do you search for on the internet?', 'Do you use the internet to learn English?']),
('a1-plans', 'A1', 20, 'Planlarım', 'My plans', 'Мои планы',
  array['What are you going to do this evening?', 'What are you going to do at the weekend?', 'Where are you going to go on holiday?', 'What are you going to buy soon?', 'Are you going to study more English?', 'Who are you going to see this week?', 'What are you going to cook tomorrow?', 'Are you going to watch a film soon?', 'What are you going to do next year?', 'What is your big dream?']),
('a2-childhood', 'A2', 1, 'Uşaqlıq', 'Childhood', 'Детство',
  array['Where did you grow up?', 'What games did you play as a child?', 'Who was your best friend at school?', 'What was your favourite toy?', 'What food did you like as a child?', 'Were you a good student?', 'What did you want to be when you were a child?', 'Where did you go on holiday as a child?', 'What were you afraid of as a child?', 'What is your happiest childhood memory?']),
('a2-holidays-travel', 'A2', 2, 'Səyahət', 'Holidays and travel', 'Отпуск и путешествия',
  array['Where did you go on your last holiday?', 'Who did you go with?', 'How did you travel there?', 'Where did you stay?', 'What did you do there?', 'What was the food like?', 'Did you buy any souvenirs?', 'Do you prefer the sea or the mountains?', 'Which country would you like to visit? Why?', 'What do you always take on holiday?']),
('a2-films-tv', 'A2', 3, 'Filmlər və seriallar', 'Films and TV series', 'Фильмы и сериалы',
  array['What kind of films do you like?', 'What was the last film you watched?', 'Who is your favourite actor or actress?', 'Do you prefer watching films at home or at the cinema?', 'What TV series do you like?', 'Do you watch films in English?', 'What film can you watch many times?', 'Do you like cartoons?', 'What was a film you didn''t like? Why?', 'What film would you recommend to me?']),
('a2-music', 'A2', 4, 'Musiqi', 'Music', 'Музыка',
  array['What kind of music do you like?', 'Who is your favourite singer or band?', 'When do you listen to music?', 'Can you play a musical instrument?', 'Do you like singing?', 'Have you ever been to a concert?', 'What song do you know by heart?', 'Do you listen to music in English?', 'What music do your parents like?', 'What song makes you happy?']),
('a2-sports', 'A2', 5, 'İdman', 'Sports', 'Спорт',
  array['Do you do any sport?', 'What sport do you like watching?', 'Who is your favourite sportsperson?', 'How often do you exercise?', 'Did you play sports at school?', 'Do you prefer team sports or individual sports?', 'Have you ever been to a football match?', 'What sport would you like to try?', 'Is sport important for you? Why?', 'What is the most popular sport in your country?']),
('a2-cooking', 'A2', 6, 'Yemək bişirmək', 'Cooking', 'Кулинария',
  array['Do you like cooking?', 'Who cooks in your family?', 'What is the best dish you can cook?', 'How do you make your favourite dish?', 'Do you follow recipes?', 'What did you cook last?', 'Do you prefer eating at home or in a restaurant?', 'What food from other countries do you like?', 'What is a traditional dish in your country?', 'What would you cook for a guest?']),
('a2-shopping-money', 'A2', 7, 'Pul və alış-veriş', 'Money and shopping', 'Деньги и покупки',
  array['Do you prefer paying by card or in cash?', 'Do you save money? What for?', 'What did you buy last that was expensive?', 'Do you like shopping online? Why?', 'Do you compare prices before you buy?', 'What do you spend most of your money on?', 'Have you ever bought something you didn''t need?', 'Do you like markets?', 'What is cheaper in your country than in others?', 'If you had $100 now, what would you buy?']),
('a2-work-study', 'A2', 8, 'İş və təhsil', 'Work and study', 'Работа и учёба',
  array['What do you do: work or study?', 'What do you like about your work or studies?', 'What don''t you like about it?', 'How many hours a day do you work or study?', 'Do you work in a team or alone?', 'What did you learn this week?', 'Is it easy to find a job in your city?', 'What job would you like to have in five years?', 'Do you like your colleagues or classmates?', 'What makes a job interesting?']),
('a2-weekend', 'A2', 9, 'Həftə sonu', 'The weekend', 'Выходные',
  array['What did you do last weekend?', 'What do you usually do on Saturdays?', 'Do you get up early at the weekend?', 'Do you prefer a busy or a quiet weekend?', 'Do you meet friends at the weekend?', 'Do you work at the weekend?', 'What is your perfect weekend?', 'Where do people in your city go at the weekend?', 'What are you doing next weekend?', 'Do you feel sad on Sunday evenings? Why?']),
('a2-houses-neighbours', 'A2', 10, 'Ev və qonşular', 'Homes and neighbours', 'Дом и соседи',
  array['How long have you lived in your home?', 'Do you know your neighbours?', 'Are your neighbours friendly?', 'What do you like about your area?', 'What would you change in your area?', 'Have you ever moved house?', 'Do you prefer living in the city centre or outside?', 'Is your home quiet?', 'What is the most important thing in a home?', 'Would you like to live in another city?']),
('a2-health-habits', 'A2', 11, 'Sağlam həyat', 'Healthy habits', 'Здоровые привычки',
  array['Do you have a healthy lifestyle?', 'What do you usually eat in a day?', 'How much water do you drink?', 'How often do you walk or exercise?', 'Do you sleep enough?', 'Do you eat a lot of sweets?', 'What do you do when you feel stressed?', 'Have you ever tried a diet?', 'What unhealthy habit would you like to stop?', 'What advice would you give to be healthy?']),
('a2-festivals', 'A2', 12, 'Bayramlar və adət-ənənələr', 'Festivals and traditions', 'Праздники и традиции',
  array['What is the most important holiday in your country?', 'How do people celebrate Novruz?', 'What food do people eat on holidays?', 'Do you give presents? When?', 'What did you do last New Year?', 'Do you like wedding parties?', 'What traditions does your family have?', 'What festival from another country would you like to see?', 'Do you wear special clothes on holidays?', 'What is your favourite holiday memory?']),
('a2-nature', 'A2', 13, 'Təbiət', 'Nature', 'Природа',
  array['Do you like spending time in nature?', 'Where do you go to see nature?', 'Do you prefer forests, mountains or beaches?', 'Have you ever camped?', 'What is the most beautiful place in your country?', 'Do you like flowers? Which ones?', 'What animals live near your city?', 'Do you recycle?', 'What can people do to help nature?', 'Would you like to live in the countryside?']),
('a2-technology-life', 'A2', 14, 'Texnologiya həyatımızda', 'Technology in our lives', 'Технологии в жизни',
  array['What gadgets do you use every day?', 'What was your first phone?', 'How did people live without the internet?', 'Do you spend too much time online?', 'What is the most useful app for you?', 'Do you buy things online?', 'Do you read news online or on paper?', 'Can technology help people learn languages?', 'What new technology would you like to have?', 'Is technology good or bad for children?']),
('a2-famous-people', 'A2', 15, 'Məşhur insanlar', 'Famous people', 'Знаменитые люди',
  array['Who is a famous person you like?', 'What is he or she famous for?', 'Would you like to be famous? Why?', 'Have you ever met a famous person?', 'Who is a famous person from your country?', 'What famous person would you like to meet?', 'Is it easy to be famous?', 'Who was famous when you were a child?', 'Do you follow famous people on social media?', 'What question would you ask a famous person?']),
('a2-restaurants', 'A2', 16, 'Restoran və kafelər', 'Restaurants and cafés', 'Рестораны и кафе',
  array['How often do you eat out?', 'What is your favourite restaurant or café?', 'What do you usually order?', 'Do you prefer cafés or restaurants?', 'Do you leave a tip?', 'What was the best meal you have had out?', 'Have you ever had a bad experience in a restaurant?', 'Do you like trying new food?', 'What makes a good restaurant?', 'Where would you take a visitor to eat?']),
('a2-past-experiences', 'A2', 17, 'Təcrübələrim', 'Experiences', 'Жизненный опыт',
  array['Have you ever been abroad?', 'Have you ever lost something important?', 'Have you ever met someone famous?', 'Have you ever cooked for many people?', 'Have you ever been on TV or radio?', 'Have you ever won a prize?', 'Have you ever ridden a horse?', 'Have you ever stayed up all night?', 'What new thing did you try this year?', 'What would you like to do for the first time?']),
('a2-rules-advice', 'A2', 18, 'Qaydalar və məsləhətlər', 'Rules and advice', 'Правила и советы',
  array['What rules did you have at school?', 'What rules are there at your work or home?', 'Which rules do you think are not necessary?', 'What should a tourist do in your city?', 'What shouldn''t a tourist do?', 'What advice would you give a new student?', 'What should people do to learn English fast?', 'What did your parents tell you to do as a child?', 'Do you follow rules or break them?', 'What is the best advice you have received?']),
('a2-future-plans', 'A2', 19, 'Gələcək planlar', 'Future plans', 'Планы на будущее',
  array['What are you doing this weekend?', 'Where will you be in five years?', 'What will you do after this course?', 'Will you travel this year?', 'What new skill do you want to learn?', 'Do you think you will live in another country?', 'What will your city be like in 20 years?', 'Will people still use cash in the future?', 'What are you going to do for your next birthday?', 'What do you hope will happen this year?']),
('a2-comparing', 'A2', 20, 'Müqayisə', 'Comparing things', 'Сравнения',
  array['Which is better: summer or winter?', 'Which is more interesting: books or films?', 'Is your city bigger or smaller than Baku?', 'Which is healthier: tea or coffee?', 'Is it easier to learn English or Russian?', 'Who is taller: you or your best friend?', 'Which is more important: money or time?', 'What is the most beautiful city you know?', 'What is the best day of the week? Why?', 'Is life better in the city or the village?']),
('b1-education', 'B1', 1, 'Təhsil', 'Education', 'Образование',
  array['What was your school like?', 'Which subject was the most useful for you?', 'Do you think school prepares people for real life?', 'What would you change in schools today?', 'Is university necessary to be successful?', 'Have you ever studied online? How was it?', 'What makes a good teacher?', 'Should children learn foreign languages from an early age?', 'How do you prefer to learn new things?', 'What would you like to study in the future?']),
('b1-work-life-balance', 'B1', 2, 'İş və şəxsi həyat balansı', 'Work-life balance', 'Баланс работы и жизни',
  array['How many hours a week do you work or study?', 'Do you have enough free time?', 'What do you do to relax after work?', 'Have you ever felt burned out?', 'Would you prefer more money or more free time?', 'Is it a good idea to work from home?', 'Do you check work messages at the weekend?', 'What is your ideal working day?', 'How can companies help their workers be happier?', 'What is more important to you: career or family?']),
('b1-social-media', 'B1', 3, 'Sosial şəbəkələr', 'Social media', 'Социальные сети',
  array['Which social networks do you use?', 'How much time do you spend on social media a day?', 'What do you usually post?', 'Do you think social media makes people happier?', 'Have you ever deleted a post you regretted?', 'Is it safe to share personal information online?', 'Do you follow any influencers? Why?', 'How has social media changed friendships?', 'Should children use social media?', 'Could you live without social media for a month?']),
('b1-travel-experiences', 'B1', 4, 'Səyahət təcrübələri', 'Travel experiences', 'Опыт путешествий',
  array['What is the best trip you have ever been on?', 'Have you ever had a problem while travelling?', 'Do you prefer travelling alone or with others?', 'Do you plan everything or decide on the way?', 'What country has surprised you the most?', 'Have you ever got lost in a new place?', 'What do you need to feel comfortable when travelling?', 'Have you ever tried strange food abroad?', 'Do you prefer hotels or renting a flat?', 'Where would you go if you could travel anywhere?']),
('b1-environment', 'B1', 5, 'Ətraf mühit', 'The environment', 'Окружающая среда',
  array['What are the biggest environmental problems in your country?', 'Do you recycle at home?', 'How do you try to save energy?', 'Is air pollution a problem in your city?', 'Should cars be banned from city centres?', 'Do you use plastic bags?', 'What can one person do to help the planet?', 'Are you worried about climate change?', 'Should governments do more for the environment?', 'Would you buy an electric car? Why or why not?']),
('b1-health-fitness', 'B1', 6, 'Sağlamlıq və fitness', 'Health and fitness', 'Здоровье и фитнес',
  array['What do you do to keep fit?', 'Have you ever been to a gym?', 'Do you think people today are healthier than before?', 'What is your opinion about diets?', 'How important is sleep for you?', 'Have you ever broken a bone?', 'Do you prefer exercising alone or with others?', 'What do you do when you have a cold?', 'Is fast food a big problem today?', 'What healthy habit have you started recently?']),
('b1-friendship', 'B1', 7, 'Dostluq', 'Friendship', 'Дружба',
  array['How did you meet your best friend?', 'What makes a good friend?', 'Have you ever had an argument with a friend?', 'Can men and women be just friends?', 'Is it easy to make friends as an adult?', 'Do you have any online friends you have never met?', 'How often do you see your close friends?', 'Would you lend money to a friend?', 'Have you kept any friends from childhood?', 'What is the nicest thing a friend has done for you?']),
('b1-money', 'B1', 8, 'Pul', 'Money', 'Деньги',
  array['Are you good at saving money?', 'What was the first thing you bought with your own money?', 'Do you think money brings happiness?', 'Should children get pocket money?', 'Do you prefer to spend money on things or experiences?', 'Have you ever lent money and not got it back?', 'What is something you would never spend money on?', 'Is it better to rent or buy a home?', 'What would you do if you won the lottery?', 'Should people talk openly about their salaries?']),
('b1-technology-future', 'B1', 9, 'Gələcəyin texnologiyası', 'Technology and the future', 'Технологии будущего',
  array['What technology could you not live without?', 'How will technology change jobs in the future?', 'Do you use artificial intelligence? How?', 'Would you ride in a car with no driver?', 'Are robots going to replace teachers?', 'What invention has changed your life the most?', 'Do you worry about privacy online?', 'Will people still read paper books in 50 years?', 'What gadget would you like to invent?', 'Is technology making us lazy?']),
('b1-city-countryside', 'B1', 10, 'Şəhər və kənd', 'City or countryside', 'Город или деревня',
  array['Do you live in a city or in the countryside?', 'What are the advantages of city life?', 'What are the disadvantages?', 'Would you like to live in a village? Why?', 'Where did your grandparents live?', 'Is life cheaper in the countryside?', 'What do you miss when you are away from the city?', 'Is your city a good place for children?', 'What would make your city a better place to live?', 'Where would you like to live when you are older?']),
('b1-food-culture', 'B1', 11, 'Mətbəx və mədəniyyət', 'Food and culture', 'Еда и культура',
  array['What dish best represents your country?', 'What food do you eat on special occasions?', 'Have you ever tried food from a very different culture?', 'Is it rude to leave food on your plate in your culture?', 'What is your favourite foreign cuisine?', 'Do young people cook less than before?', 'What food do you remember from your childhood?', 'Is it important to eat together as a family?', 'Would you try insects?', 'What would you serve a foreign guest?']),
('b1-books-reading', 'B1', 12, 'Kitab oxumaq', 'Books and reading', 'Книги и чтение',
  array['Do you enjoy reading? Why or why not?', 'What was the last book you read?', 'What book would you recommend to everyone?', 'Do you prefer paper books or e-books?', 'Have you ever read a book in English?', 'Do you prefer the book or the film?', 'Who is your favourite writer?', 'Did your parents read to you as a child?', 'Do people read less today?', 'What kind of books do you never read?']),
('b1-shopping-habits', 'B1', 13, 'Alış-veriş vərdişləri', 'Shopping habits', 'Привычки в покупках',
  array['Do you enjoy shopping or find it stressful?', 'Do you buy things on impulse?', 'Have you ever returned something you bought?', 'Do brands matter to you?', 'Do you read reviews before buying online?', 'What is the best bargain you have ever found?', 'Do you prefer shopping malls or small shops?', 'Have you ever bought second-hand things?', 'What do you always spend too much on?', 'Will physical shops disappear in the future?']),
('b1-memories', 'B1', 14, 'Xatirələr', 'Memories', 'Воспоминания',
  array['What is your earliest memory?', 'What is a day you will never forget?', 'Do you keep photos or diaries?', 'What smell or song brings back memories for you?', 'What was your first day at school like?', 'Who was an important person in your childhood?', 'What is the best present you have ever received?', 'Have you ever gone back to a place from your childhood?', 'Is it good to think about the past a lot?', 'What memory would you like to relive?']),
('b1-languages', 'B1', 15, 'Dil öyrənmək', 'Learning languages', 'Изучение языков',
  array['Why are you learning English?', 'What is the most difficult part of English for you?', 'How many languages can you speak?', 'What is the best way to learn new words?', 'Have you ever been misunderstood in English?', 'Do you watch films with subtitles?', 'What language would you like to learn next?', 'Is it important to have a good accent?', 'Have you ever had a conversation with a native speaker?', 'What advice would you give a beginner?']),
('b1-jobs-careers', 'B1', 16, 'Karyera', 'Jobs and careers', 'Карьера',
  array['What was your first job?', 'What is your dream job?', 'Would you prefer to work for a big company or for yourself?', 'What skills are most important at work today?', 'Have you ever had a job interview? How did it go?', 'Is it better to change jobs often or stay in one place?', 'What job would you never do?', 'Should people retire at 60?', 'Is a high salary the most important thing in a job?', 'What advice would you give someone looking for a job?']),
('b1-transport-cities', 'B1', 17, 'Şəhər nəqliyyatı', 'Getting around the city', 'Городской транспорт',
  array['How do you usually get around your city?', 'Is public transport good where you live?', 'How long is your daily journey?', 'Have you ever been stuck in a traffic jam for hours?', 'Do you think cycling is safe in your city?', 'Would you use a shared electric scooter?', 'What would improve transport in your city?', 'Do you prefer driving or being a passenger?', 'Is it expensive to have a car?', 'What is the strangest transport you have used?']),
('b1-celebrations', 'B1', 18, 'Bayram və mərasimlər', 'Celebrations', 'Праздники и торжества',
  array['How do you usually celebrate your birthday?', 'What is the best party you have ever been to?', 'How are weddings celebrated in your country?', 'Do you prefer big parties or small dinners?', 'What do you think about giving money as a present?', 'What holiday do you look forward to the most?', 'Have you ever organised a surprise party?', 'How has New Year changed since you were a child?', 'Do you celebrate holidays from other cultures?', 'What would be your perfect celebration?']),
('b1-habits', 'B1', 19, 'Vərdişlər', 'Habits', 'Привычки',
  array['What good habits do you have?', 'What bad habit would you like to break?', 'How long does it take to make a new habit?', 'Do you have a morning routine?', 'Do you check your phone as soon as you wake up?', 'Have you ever stopped a bad habit? How?', 'Did you use to have any strange habits as a child?', 'What habit do you admire in other people?', 'Are habits more important than motivation?', 'What new habit will you start this month?']),
('b1-problems-solutions', 'B1', 20, 'Problem və həllər', 'Problems and solutions', 'Проблемы и решения',
  array['What do you do when you have a problem?', 'Who do you ask for advice?', 'What was a difficult decision you made?', 'Do you make decisions quickly or slowly?', 'Have you ever helped a friend with a big problem?', 'What is a common problem for young people today?', 'What is a common problem in your city?', 'If you could solve one world problem, what would it be?', 'Do you learn from your mistakes?', 'What would you do if you lost your wallet abroad?']),
('b2-success', 'B2', 1, 'Uğur', 'Success', 'Успех',
  array['How would you define success?', 'Who is the most successful person you know personally?', 'Is success more about talent or hard work?', 'Does success always bring happiness?', 'What has been your biggest achievement so far?', 'Can failure be a good thing?', 'Is it possible to be successful without a university degree?', 'How do social media change our idea of success?', 'What sacrifices are you willing to make to succeed?', 'Where do you see yourself in ten years?']),
('b2-ethics-ai', 'B2', 2, 'Süni intellekt və etika', 'Artificial intelligence', 'Искусственный интеллект',
  array['How do you use AI in your daily life?', 'Which jobs do you think AI will change the most?', 'Should students be allowed to use AI for homework?', 'Can AI ever be truly creative?', 'Who is responsible if an AI makes a mistake?', 'Would you trust an AI doctor?', 'How can we tell if information online is real or fake?', 'Should there be laws to control AI?', 'What are the biggest risks of AI?', 'How might AI change the way we learn languages?']),
('b2-work-future', 'B2', 3, 'Gələcəyin işləri', 'The future of work', 'Будущее работы',
  array['Will most people work from home in the future?', 'Is a four-day working week a good idea?', 'Which jobs might disappear in the next 20 years?', 'What skills will be most valuable in the future?', 'Is it better to be a specialist or a generalist?', 'Should companies care about employees'' mental health?', 'Would you like to work abroad?', 'How important is loyalty to an employer?', 'Is freelancing a good long-term career choice?', 'How will young people''s careers differ from their parents''?']),
('b2-media-news', 'B2', 4, 'Media və xəbərlər', 'Media and news', 'СМИ и новости',
  array['Where do you get your news from?', 'Do you trust the news you read?', 'How can you recognise fake news?', 'Is there too much negative news?', 'Should journalists ever reveal their sources?', 'Has social media made us better or worse informed?', 'Do you pay for any news or content online?', 'How does advertising influence us?', 'Should celebrities have a right to privacy?', 'What news story has had the biggest impact on you?']),
('b2-relationships', 'B2', 5, 'Münasibətlər', 'Relationships', 'Отношения',
  array['What makes a relationship last?', 'Is it better to marry young or later in life?', 'How has dating changed with technology?', 'Can long-distance relationships work?', 'What role should families play in choosing a partner?', 'How important is it to have shared interests?', 'Is it ever acceptable to lie to a partner?', 'How do you deal with disagreements?', 'Are friendships more important than romantic relationships?', 'What is the best relationship advice you have heard?']),
('b2-tourism', 'B2', 6, 'Turizm', 'Tourism', 'Туризм',
  array['What are the benefits of tourism for a country?', 'What problems can mass tourism cause?', 'What should tourists know before visiting your country?', 'Do you prefer touristy places or hidden gems?', 'Is travelling abroad necessary to understand other cultures?', 'How has tourism changed your city?', 'What is responsible tourism?', 'Would you take a holiday with no internet?', 'Should famous sites limit the number of visitors?', 'What makes a holiday truly memorable?']),
('b2-consumerism', 'B2', 7, 'İstehlak cəmiyyəti', 'Consumer society', 'Общество потребления',
  array['Do we buy more than we need?', 'How does advertising make us want things?', 'Have you ever regretted an expensive purchase?', 'What do you think about fast fashion?', 'Would you pay more for ethical products?', 'Is minimalism a realistic lifestyle?', 'Why do people care so much about brands?', 'Should there be more repair shops instead of buying new things?', 'How do your shopping habits differ from your parents''?', 'What could you easily live without?']),
('b2-education-systems', 'B2', 8, 'Təhsil sistemləri', 'Education systems', 'Системы образования',
  array['What are the strengths of the education system in your country?', 'What are its weaknesses?', 'Should exams be the main way to assess students?', 'Is homework useful?', 'Should university be free for everyone?', 'How has online learning changed education?', 'Should schools teach practical life skills like managing money?', 'Is it better to study in your own country or abroad?', 'What role should parents play in education?', 'If you were Minister of Education, what would you change?']),
('b2-health-medicine', 'B2', 9, 'Sağlamlıq və tibb', 'Health and medicine', 'Здоровье и медицина',
  array['Is healthcare free in your country?', 'Do you prefer traditional or modern medicine?', 'How has the pandemic changed our attitude to health?', 'Should unhealthy food be taxed?', 'Is mental health taken seriously enough?', 'How much should we trust health information online?', 'Would you take part in a medical experiment?', 'Should sport be compulsory at school?', 'How can cities encourage people to be more active?', 'What is the biggest health challenge for your generation?']),
('b2-cities-future', 'B2', 10, 'Gələcəyin şəhərləri', 'Cities of the future', 'Города будущего',
  array['What will cities look like in 50 years?', 'How can cities become greener?', 'Should cars be banned in city centres?', 'Is it better to live in a small town or a big city?', 'What makes a city attractive to young people?', 'How can cities deal with traffic problems?', 'Should old buildings be protected or replaced?', 'What are the advantages of smart cities?', 'How has your city changed in your lifetime?', 'What would your ideal city be like?']),
('b2-culture-identity', 'B2', 11, 'Mədəniyyət və kimlik', 'Culture and identity', 'Культура и идентичность',
  array['What does your culture mean to you?', 'Which traditions are most important to keep?', 'Is globalisation making cultures more similar?', 'How do you feel when you hear your language abroad?', 'Can you feel at home in more than one country?', 'What stereotypes exist about people from your country?', 'Are any of these stereotypes true?', 'What can we learn from other cultures?', 'How important is it to speak your parents'' language?', 'What aspect of your culture would you like foreigners to know?']),
('b2-crime-justice', 'B2', 12, 'Cinayət və ədalət', 'Crime and justice', 'Преступление и правосудие',
  array['What are the most common crimes in big cities?', 'Do you feel safe in your city?', 'What is the best way to reduce crime?', 'Should prisons punish or rehabilitate?', 'Are CCTV cameras an invasion of privacy?', 'Is cybercrime more dangerous than street crime?', 'Should young offenders be treated differently?', 'Have you ever witnessed a crime?', 'What would you do if you found a lost wallet with money?', 'Are punishments in your country too strict or too soft?']),
('b2-science-space', 'B2', 13, 'Elm və kosmos', 'Science and space', 'Наука и космос',
  array['Are you interested in space exploration?', 'Is it worth spending money on space programmes?', 'Would you travel to space if you had the chance?', 'Do you think there is life on other planets?', 'Which scientific discovery has changed the world the most?', 'Should scientists be allowed to clone animals?', 'How can we make young people more interested in science?', 'Do you trust scientists?', 'What scientific question would you like answered?', 'Will humans live on Mars one day?']),
('b2-generations', 'B2', 14, 'Nəsillər', 'Generations', 'Поколения',
  array['How is your generation different from your parents''?', 'What can older people learn from younger people?', 'What can younger people learn from older people?', 'Is it harder to be young today than in the past?', 'Should elderly parents live with their children?', 'What do people of your generation worry about?', 'How do different generations use technology?', 'At what age is someone really an adult?', 'What is the best age to be? Why?', 'What will your generation be remembered for?']),
('b2-art-creativity', 'B2', 15, 'İncəsənət və yaradıcılıq', 'Art and creativity', 'Искусство и творчество',
  array['Do you consider yourself a creative person?', 'What kind of art do you enjoy?', 'Should art be taught at school?', 'Is street art real art?', 'Have you ever visited a famous museum?', 'Should museums be free?', 'Can creativity be learned?', 'Who is an artist you admire?', 'Is it worth paying millions for a painting?', 'How does art make our lives better?']),
('b2-risk-adventure', 'B2', 16, 'Risk və macəra', 'Risk and adventure', 'Риск и приключения',
  array['Are you a risk-taker?', 'What is the most adventurous thing you have done?', 'Would you try an extreme sport?', 'Is it better to take risks or play it safe?', 'Have you ever made a decision you were afraid of?', 'Do young people take more risks than older people?', 'What risks are worth taking?', 'Would you move to another country alone?', 'How do you deal with fear?', 'What adventure would you like to have before you are 50?']),
('b2-advertising', 'B2', 17, 'Reklam', 'Advertising', 'Реклама',
  array['What advert do you remember well?', 'Do adverts influence what you buy?', 'Should advertising aimed at children be banned?', 'What do you think about influencer marketing?', 'Are there too many adverts online?', 'What makes an advert successful?', 'Do you use ad blockers?', 'Should advertising for unhealthy food be limited?', 'Is it ethical to use famous people in adverts?', 'If you created an advert for your city, what would it show?']),
('b2-volunteering', 'B2', 18, 'Könüllülük', 'Volunteering and helping others', 'Волонтёрство',
  array['Have you ever done volunteer work?', 'Why do people volunteer?', 'Should volunteering be part of school programmes?', 'Which charities do you think are the most important?', 'Do you donate money to good causes?', 'Is it better to give money or time?', 'How can young people help their community?', 'Should companies give employees time to volunteer?', 'What problem in your community would you like to solve?', 'Can one person really make a difference?']),
('b2-stress-wellbeing', 'B2', 19, 'Stress və rifah', 'Stress and well-being', 'Стресс и благополучие',
  array['What makes you feel stressed?', 'How do you deal with stress?', 'Is modern life more stressful than in the past?', 'How important is it to switch off from technology?', 'Do you think meditation works?', 'How do you know when you need a break?', 'What makes you truly happy?', 'Should schools teach students how to manage stress?', 'How does your environment affect your mood?', 'What is your best tip for a happy life?']),
('b2-decisions-regrets', 'B2', 20, 'Qərarlar və peşmançılıq', 'Decisions and regrets', 'Решения и сожаления',
  array['What is the best decision you have ever made?', 'Do you have any regrets?', 'If you could change one thing about your past, what would it be?', 'Do you trust your instincts when making decisions?', 'Who do you ask for advice on big decisions?', 'Is it better to regret something you did or didn''t do?', 'How do you make difficult choices?', 'Have you ever changed your mind about something important?', 'What would you tell your younger self?', 'What decision are you facing now?']),
('c1-happiness', 'C1', 1, 'Xoşbəxtlik', 'The nature of happiness', 'Природа счастья',
  array['Is happiness a choice or a result of circumstances?', 'To what extent does money contribute to happiness?', 'Why are some countries consistently rated happier than others?', 'Is the pursuit of happiness itself a cause of unhappiness?', 'How do cultural values shape our idea of a good life?', 'Can social media give an accurate picture of someone''s happiness?', 'Is contentment more valuable than excitement?', 'What role do relationships play in long-term well-being?', 'Should governments measure national happiness instead of GDP?', 'What has brought you the most lasting satisfaction in life?']),
('c1-globalisation', 'C1', 2, 'Qloballaşma', 'Globalisation', 'Глобализация',
  array['Has globalisation done more good than harm?', 'Which industries in your country have benefited from globalisation?', 'Is cultural diversity under threat from global brands?', 'How has globalisation affected the job market for young people?', 'Should countries protect local industries from foreign competition?', 'Is English becoming too dominant as a global language?', 'How did the pandemic expose the weaknesses of global supply chains?', 'Can global problems be solved without global governance?', 'Do you see yourself as a citizen of your country or of the world?', 'What would a fairer global economy look like?']),
('c1-leadership', 'C1', 3, 'Liderlik', 'Leadership', 'Лидерство',
  array['Are leaders born or made?', 'What qualities do the best leaders share?', 'Is it possible to be a good leader and be liked by everyone?', 'How has the idea of leadership changed in the workplace?', 'Should leaders show vulnerability?', 'Who is a leader you admire, and why?', 'Is there a difference between leadership and management?', 'Do women and men lead differently, or is that a stereotype?', 'How much should leaders listen to public opinion?', 'Have you ever had to lead a group? What did you learn?']),
('c1-privacy', 'C1', 4, 'Şəxsi məlumat və məxfilik', 'Privacy in the digital age', 'Конфиденциальность в цифровую эпоху',
  array['Is privacy still possible in the digital age?', 'Would you trade some privacy for more security?', 'How much do tech companies know about you?', 'Should employers be allowed to monitor staff online?', 'Is it acceptable for parents to track their children''s phones?', 'Should there be a right to be forgotten online?', 'How careful are you about what you share online?', 'Is facial recognition in public places justified?', 'Who should own personal data: the user or the company?', 'How might attitudes to privacy change in the next generation?']),
('c1-ethics-science', 'C1', 5, 'Elm və etika', 'Ethics in science', 'Этика в науке',
  array['Should there be limits on scientific research?', 'Is genetic editing of humans ever acceptable?', 'How should we balance animal welfare and medical research?', 'Who should decide what is ethical in science?', 'Is it right to extend human life indefinitely?', 'Should scientists be held responsible for how their discoveries are used?', 'How can the public be better informed about scientific debates?', 'Is there a risk that science moves faster than the law?', 'Should rich countries share medical technology freely?', 'Which ethical question in science concerns you the most?']),
('c1-language-thought', 'C1', 6, 'Dil və təfəkkür', 'Language and thought', 'Язык и мышление',
  array['Does the language we speak shape how we think?', 'Do you feel like a different person when you speak English?', 'Are some ideas impossible to translate?', 'Should minority languages be protected, and how?', 'Will translation technology make language learning unnecessary?', 'What is lost when a language dies?', 'How does slang reflect social change?', 'Is it important to correct other people''s grammar?', 'What makes a speaker persuasive?', 'Which word in your language would you like to export to English?']),
('c1-inequality', 'C1', 7, 'Bərabərsizlik', 'Inequality', 'Неравенство',
  array['Is inequality inevitable in any society?', 'What are the main causes of inequality in your country?', 'Does education reduce or reinforce inequality?', 'Should the very rich pay much higher taxes?', 'Is equal opportunity more important than equal outcome?', 'How does where you are born affect your life chances?', 'Has technology increased or reduced inequality?', 'Is a universal basic income a realistic solution?', 'What responsibility do businesses have towards society?', 'What one change would most reduce inequality?']),
('c1-arts-funding', 'C1', 8, 'İncəsənətin maliyyələşdirilməsi', 'Funding the arts', 'Финансирование искусства',
  array['Should governments fund the arts?', 'Is art a luxury or a necessity?', 'Should museums return objects to their countries of origin?', 'Can art created by AI be considered real art?', 'Why do some artworks sell for millions?', 'Is popular culture as valuable as so-called high culture?', 'Should artists be expected to make political statements?', 'How does art reflect the society it comes from?', 'Has streaming been good or bad for musicians?', 'Which work of art has had the deepest effect on you?']),
('c1-urbanisation', 'C1', 9, 'Urbanizasiya', 'Urbanisation', 'Урбанизация',
  array['Why are so many people moving to big cities?', 'What happens to villages when young people leave?', 'How can cities stay liveable as they grow?', 'Is high-rise living good for communities?', 'Should governments encourage people to move to rural areas?', 'How does city design affect our mental health?', 'Is gentrification positive or negative?', 'What can be done about rising housing costs?', 'Will remote work reverse urbanisation?', 'Describe your vision of a perfectly designed neighbourhood.']),
('c1-education-purpose', 'C1', 10, 'Təhsilin məqsədi', 'The purpose of education', 'Цель образования',
  array['What is the main purpose of education?', 'Should education focus on knowledge or skills?', 'Is critical thinking taught well in schools?', 'Are standardised tests a fair measure of ability?', 'What role should creativity play in education?', 'Is lifelong learning a necessity today?', 'Should universities be more closely connected to employers?', 'How has technology changed the teacher''s role?', 'What did school fail to teach you?', 'Design the ideal school: what would it include?']),
('c1-media-influence', 'C1', 11, 'Medianın təsiri', 'The influence of the media', 'Влияние СМИ',
  array['How much power does the media have over public opinion?', 'Is objective journalism possible?', 'How do algorithms shape what news we see?', 'Should social media platforms be responsible for content posted on them?', 'Is clickbait damaging journalism?', 'How do you check whether a story is reliable?', 'Does the media focus too much on celebrities?', 'Should there be limits on freedom of speech?', 'How has the role of the journalist changed?', 'Which media source do you trust most, and why?']),
('c1-climate-action', 'C1', 12, 'İqlim siyasəti', 'Climate action', 'Климатическая политика',
  array['Who should bear the greatest responsibility for climate change?', 'Are individual actions meaningful compared with government policy?', 'Should flying be more expensive to reduce emissions?', 'Is nuclear energy part of the solution?', 'How can developing countries grow without damaging the environment?', 'Is eating less meat a realistic solution?', 'Do protests by climate activists help or harm their cause?', 'Should companies be forced to report their carbon footprint?', 'How optimistic are you about the future of the planet?', 'What would you be willing to give up for the environment?']),
('c1-work-meaning', 'C1', 13, 'İşin mənası', 'Work and meaning', 'Смысл работы',
  array['Should work be a source of meaning or just income?', 'Is it realistic to do what you love for a living?', 'How do you define a meaningful career?', 'Are some jobs more valuable to society than they are paid?', 'How has the idea of a job for life changed?', 'Is ambition always positive?', 'Should people be judged by their job?', 'Would you accept a lower salary for more meaningful work?', 'What would you do if you didn''t need to work?', 'What advice would you give someone choosing a career?']),
('c1-tradition-modernity', 'C1', 14, 'Ənənə və müasirlik', 'Tradition and modernity', 'Традиции и современность',
  array['Which traditions in your country are disappearing?', 'Should traditions be preserved even if they seem outdated?', 'How do young people in your country view traditions?', 'Can tradition and progress coexist?', 'How has the role of the family changed over the last 50 years?', 'Are modern weddings losing their meaning?', 'How do traditions help build identity?', 'Is there a tradition you would like to change?', 'What modern habits might become traditions in the future?', 'How do you balance tradition and modern life personally?']),
('c1-health-society', 'C1', 15, 'Səhiyyə və cəmiyyət', 'Public health', 'Общественное здоровье',
  array['Should healthcare be a right or a service?', 'Is the state responsible for people''s lifestyle choices?', 'Should vaccinations be compulsory?', 'How should mental health care be funded?', 'Is the rise in obesity a personal or social problem?', 'Should doctors be allowed to strike?', 'How can rural areas get better access to healthcare?', 'Are we becoming too dependent on medication?', 'What role should technology play in healthcare?', 'What would you change in your country''s health system?']),
('c1-migration', 'C1', 16, 'Miqrasiya', 'Migration', 'Миграция',
  array['Why do people leave their home countries?', 'What are the benefits of migration for the host country?', 'What challenges do migrants face?', 'How has emigration affected your country?', 'Should skilled workers be encouraged to stay in their country?', 'Is it possible to fully integrate into a new culture?', 'How should countries manage migration fairly?', 'What do people miss most when they move abroad?', 'Would you consider emigrating? Why or why not?', 'How might climate change affect migration in the future?']),
('c1-persuasion', 'C1', 17, 'İnandırmaq sənəti', 'The art of persuasion', 'Искусство убеждения',
  array['What makes an argument convincing?', 'Are emotions or facts more persuasive?', 'Who is the most persuasive speaker you know?', 'How do politicians use language to persuade?', 'Is it ethical to persuade people using their fears?', 'Have you ever changed your mind after a debate?', 'How do you persuade someone who strongly disagrees with you?', 'What is the role of body language in persuasion?', 'Is negotiating a skill everyone needs?', 'Try to persuade your partner to visit your favourite place.']),
('c1-future-society', 'C1', 18, 'Gələcəyin cəmiyyəti', 'Society in 2050', 'Общество в 2050 году',
  array['What will be the biggest change in society by 2050?', 'Will people work fewer hours in the future?', 'How will family life change?', 'Will cities or nature win the battle for space?', 'What role will AI play in everyday decisions?', 'Will education still happen in classrooms?', 'Which current problem will be solved by 2050?', 'Which new problem might appear?', 'Are you optimistic or pessimistic about the future?', 'What message would you send to people in 2050?']),
('c1-ethics-everyday', 'C1', 19, 'Gündəlik etik dilemmalar', 'Everyday ethical dilemmas', 'Этические дилеммы',
  array['Is it ever acceptable to tell a white lie?', 'Would you report a friend who cheated in an exam?', 'Should you give money to people begging in the street?', 'Is it wrong to download films without paying?', 'Would you return extra change a shop assistant gave you by mistake?', 'Is it acceptable to break a rule if it seems unfair?', 'Should you tell a friend that their partner is unfaithful?', 'Is buying cheap products made in poor conditions unethical?', 'How do you decide what is right when there is no clear answer?', 'Describe a moral dilemma you have faced.']),
('c1-personal-growth', 'C1', 20, 'Şəxsi inkişaf', 'Personal growth', 'Личностный рост',
  array['How have you changed in the last five years?', 'What experience has shaped you the most?', 'Is it possible to change your personality?', 'How do you step out of your comfort zone?', 'What role does failure play in personal growth?', 'Who has influenced you the most as a person?', 'Are self-help books useful?', 'How do you set and achieve long-term goals?', 'What skill are you currently trying to develop?', 'What does living a fulfilling life mean to you?'])
on conflict (slug) do nothing;

-- 0005_profiles_presence.sql
-- Profile photos, "online" presence and direct invitations in the speaking club.
-- Run once in Supabase SQL Editor.

alter table profiles
  add column if not exists avatar_url text,
  add column if not exists last_seen_at timestamptz;

-- A room can be a direct invitation to one student, who accepts or declines it.
alter table practice_rooms
  add column if not exists invited_id uuid references profiles on delete set null;

-- Public bucket for profile photos. Uploads go through the server only.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Make the API see the new columns straight away.
notify pgrst, 'reload schema';
