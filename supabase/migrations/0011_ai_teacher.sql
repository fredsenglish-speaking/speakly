-- Speaking club: a student talks one-on-one with an AI video teacher on a topic of their level.
-- Run once in Supabase SQL Editor. Safe to run twice.

alter type payment_kind add value if not exists 'ai_chat';

-- One paid AI conversation. Only the server reads and writes it.
create table if not exists ai_chats (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles on delete cascade,
  topic_id int not null references practice_topics,
  level cefr_level not null,
  minutes int not null check (minutes in (15, 30, 60)),
  paid boolean not null default false,
  -- Seconds of conversation already used; the rest can be used after a dropped connection.
  used_seconds int not null default 0,
  started_at timestamptz,
  liveavatar_session_id text,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ai_chats_student on ai_chats (student_id, created_at desc);

alter table ai_chats enable row level security;

notify pgrst, 'reload schema';
