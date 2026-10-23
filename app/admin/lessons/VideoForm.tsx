"use client";

import { useActionState, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/url";
import { VIDEO_BUCKET } from "@/lib/video";
import { saveLessonVideos, startVideoUpload, type VideoState } from "./actions";

export function VideoForm({
  lessonId,
  title,
  main,
}: {
  lessonId: number;
  title: string;
  main: string | null;
}) {
  const t = useT();
  const [state, action] = useActionState<VideoState, FormData>(saveLessonVideos, {});
  const form = useRef<HTMLFormElement>(null);
  const link = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Uploads the file straight to storage, puts its address in the link field and saves.
  async function upload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const start = await startVideoUpload(lessonId, file.type, file.size);
      if (start.error || !start.path || !start.token || !start.url) return setUploadError(start.error ?? t.admin.errVideoUpload);
      const storage = createClient(SUPABASE_URL, SUPABASE_ANON_KEY).storage.from(VIDEO_BUCKET);
      const { error } = await storage.uploadToSignedUrl(start.path, start.token, file, { contentType: file.type });
      if (error) return setUploadError(t.admin.errVideoUpload);
      link.current!.value = start.url;
      form.current!.requestSubmit();
    } catch {
      setUploadError(t.admin.errVideoUpload);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form ref={form} action={action} className="stack" style={{ gap: 8, borderBottom: "1px solid var(--line)", paddingBottom: 14 }}>
      <input type="hidden" name="lesson_id" value={lessonId} />
      <strong>
        {main ? "✅ " : "⚪️ "}
        {title}
      </strong>
      <label className="field">
        {t.admin.videoFile}
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
      </label>
      {uploading && <span className="small muted">{t.admin.uploading}</span>}
      <label className="field">
        {t.admin.videoMain}
        <input ref={link} type="url" name="explanation_video_url" defaultValue={main ?? ""} placeholder="https://youtu.be/…" />
      </label>
      <div className="row">
        <SubmitButton className="btn small">{t.common.save}</SubmitButton>
        {(uploadError ?? state.error) && <span className="error small">{uploadError ?? state.error}</span>}
        {!uploadError && state.ok && <span className="small" style={{ color: "var(--accent)" }}>{state.ok}</span>}
      </div>
    </form>
  );
}
