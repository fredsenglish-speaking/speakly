-- Each student's best result per lesson, for the grade and progress on the Lessons page.
-- Safe to run twice.

create table if not exists lesson_results (
  student_id uuid not null references profiles on delete cascade,
  lesson_id int not null references lessons on delete cascade,
  best_right int not null check (best_right >= 0),
  total int not null check (total > 0 and best_right <= total),
  attempts int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

alter table lesson_results enable row level security;

drop policy if exists "own lesson results" on lesson_results;
create policy "own lesson results" on lesson_results for select using (student_id = auth.uid());

notify pgrst, 'reload schema';
