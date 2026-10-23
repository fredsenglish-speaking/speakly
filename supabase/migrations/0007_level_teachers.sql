-- One video teacher (an avatar) per level, shown above that level's lessons.
-- Safe to run twice.

create table if not exists level_teachers (
  level text primary key check (level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  name text not null,
  photo_url text,
  intro text,
  intro_az text,
  intro_ru text,
  video_url text,
  updated_at timestamptz not null default now()
);

alter table level_teachers enable row level security;

drop policy if exists "anyone reads level teachers" on level_teachers;
create policy "anyone reads level teachers" on level_teachers for select using (true);

insert into level_teachers (level, name, intro, intro_az, intro_ru) values (
  'A1',
  'Nicole',
  E'Hi! My name is Nicole, and I am your video teacher for A1 English.\n\nI will teach you 12 lessons. We start with the very first steps: "to be", the Present Simple, "a / an / the", plurals and more. I speak slowly and clearly, and I show every rule on the screen with easy examples.\n\nAfter each video, you do two short tests. You can see your mistakes and the right answers. Step by step, you will understand English and speak with more confidence.\n\nDon''t worry about mistakes. Mistakes help us learn! Let''s start together.\n\nSee you in Lesson 1!',
  'Salam! Mən Nicole, A1 səviyyəsi üzrə video müəllimənizəm. 12 dərsdə sizinlə ingilis dilinin ilk addımlarını keçəcəyik. Hər qaydanı ekranda sadə nümunələrlə göstərirəm, hər videodan sonra isə iki qısa test var.',
  'Привет! Я Николь, ваш видеопреподаватель уровня A1. За 12 уроков мы пройдём первые шаги в английском. Каждое правило я показываю на экране с простыми примерами, а после каждого видео вас ждут два коротких теста.'
) on conflict (level) do nothing;

notify pgrst, 'reload schema';
