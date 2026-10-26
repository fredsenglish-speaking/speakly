-- Students also say what they do: pupil (grade + school), university student
-- (year + university), working (job title + workplace) or other (in words).

alter table student_details add column if not exists occupation text not null default '';
alter table student_details add column if not exists occupation_level text not null default '';
alter table student_details add column if not exists occupation_place text not null default '';

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
    insert into student_details (
      id, phone, birth_date, city, english_level, goal, heard_from, teacher_name, study_place,
      occupation, occupation_level, occupation_place
    )
    values (
      new.id,
      meta->>'phone',
      case when meta->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$' then (meta->>'birth_date')::date end,
      coalesce(meta->>'city', ''),
      coalesce(meta->>'english_level', ''),
      coalesce(meta->>'goal', ''),
      coalesce(meta->>'heard_from', ''),
      coalesce(meta->>'teacher_name', ''),
      coalesce(meta->>'study_place', ''),
      coalesce(meta->>'occupation', ''),
      coalesce(meta->>'occupation_level', ''),
      coalesce(meta->>'occupation_place', '')
    );
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';
