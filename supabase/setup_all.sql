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
