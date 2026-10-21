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
