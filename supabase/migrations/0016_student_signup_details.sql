-- Extra sign-up answers from students (phone, birth date, city, level, goal,
-- where they heard about us, their teacher, where they want to study).
-- Kept out of profiles because some profiles are readable by other users;
-- only the student and the admin (service role) can read these.

create table student_details (
  id uuid primary key references profiles on delete cascade,
  phone text not null,
  birth_date date,
  city text not null default '',
  english_level text not null default '',
  goal text not null default '',
  heard_from text not null default '',
  teacher_name text not null default '',
  study_place text not null default '',
  created_at timestamptz not null default now()
);

alter table student_details enable row level security;
create policy "own details" on student_details for select using (id = auth.uid());

-- Same as before, plus: a student's sign-up answers go into student_details.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted text := coalesce(meta->>'role', 'student');
  r user_role := case when wanted = 'tutor' then 'tutor'::user_role else 'student'::user_role end;
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(meta->>'full_name', ''), r);
  if r = 'tutor' then
    insert into tutors (id) values (new.id);
  elsif coalesce(meta->>'phone', '') <> '' then
    insert into student_details (id, phone, birth_date, city, english_level, goal, heard_from, teacher_name, study_place)
    values (
      new.id,
      meta->>'phone',
      case when meta->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$' then (meta->>'birth_date')::date end,
      coalesce(meta->>'city', ''),
      coalesce(meta->>'english_level', ''),
      coalesce(meta->>'goal', ''),
      coalesce(meta->>'heard_from', ''),
      coalesce(meta->>'teacher_name', ''),
      coalesce(meta->>'study_place', '')
    );
  end if;
  return new;
end $$;

-- Free access the admin gives a person, per paid section (payment kinds:
-- test, certificate, lesson, practice, booking, ai_chat). Users cannot change
-- it themselves: they may only update full_name.
alter table profiles add column if not exists free_access text[] not null default '{}';

notify pgrst, 'reload schema';
