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
