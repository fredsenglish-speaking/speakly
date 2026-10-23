-- Storage for lesson videos shown with the site's own player (no YouTube buttons).
-- The admin uploads from İdarə → Lesson videoları; uploads go through a signed URL
-- made by the server, so no storage policies are needed. Safe to run twice.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-videos', 'lesson-videos', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
