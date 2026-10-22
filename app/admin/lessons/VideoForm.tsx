"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/client";
import { saveLessonVideos, type VideoState } from "./actions";

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
  return (
    <form action={action} className="stack" style={{ gap: 8, borderBottom: "1px solid var(--line)", paddingBottom: 14 }}>
      <input type="hidden" name="lesson_id" value={lessonId} />
      <strong>
        {main ? "✅ " : "⚪️ "}
        {title}
      </strong>
      <label className="field">
        {t.admin.videoMain}
        <input type="url" name="explanation_video_url" defaultValue={main ?? ""} placeholder="https://youtu.be/…" />
      </label>
      <div className="row">
        <SubmitButton className="btn small">{t.common.save}</SubmitButton>
        {state.error && <span className="error small">{state.error}</span>}
        {state.ok && <span className="small" style={{ color: "var(--accent)" }}>{state.ok}</span>}
      </div>
    </form>
  );
}
