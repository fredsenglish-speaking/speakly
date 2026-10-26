-- The teachers a student can pick at sign-up. The admin keeps the list in
-- /admin/students; everyone can read it because the sign-up form shows it.

create table if not exists school_teachers (
  id serial primary key,
  name text not null unique check (length(trim(name)) >= 2),
  created_at timestamptz not null default now()
);

alter table school_teachers enable row level security;
drop policy if exists "teacher list is public" on school_teachers;
create policy "teacher list is public" on school_teachers for select using (true);

insert into school_teachers (name) values
  ('Mr Fred'), ('Ms Kamilla'), ('Ms Arzu'), ('Ms Asmar'), ('Ms Olga'), ('Ms Gulnar'), ('Ms Nigar')
on conflict (name) do nothing;

notify pgrst, 'reload schema';
