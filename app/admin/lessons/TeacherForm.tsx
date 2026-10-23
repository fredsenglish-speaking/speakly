"use client";

import { useActionState, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { LevelChip } from "@/components/LevelChip";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/client";
import type { LevelTeacher } from "@/lib/levelTeachers";
import type { Level } from "@/lib/levels";
import { shrinkImage } from "@/lib/shrinkImage";
import { saveLevelTeacher, type VideoState } from "./actions";

export function TeacherForm({ level, teacher }: { level: Level; teacher: LevelTeacher | null }) {
  const all = useT();
  const t = all.admin;
  const [state, action] = useActionState<VideoState, FormData>(saveLevelTeacher, {});
  const [preview, setPreview] = useState<string | null>(teacher?.photo_url ?? null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    let small = file;
    try {
      small = await shrinkImage(file);
    } catch {
      // The browser couldn't read it; send the original and let the server decide.
    }
    const dt = new DataTransfer();
    dt.items.add(small);
    e.target.files = dt.files;
    setPreview(URL.createObjectURL(small));
  }

  return (
    <details className="panel">
      <summary className="row" style={{ cursor: "pointer", gap: 10 }}>
        <LevelChip level={level} />
        <span className={teacher ? "" : "small muted"}>{teacher ? teacher.name : t.teacherEmpty}</span>
      </summary>
      <form action={action} className="stack" style={{ marginTop: 14 }}>
        <input type="hidden" name="level" value={level} />
        <div className="row" style={{ gap: 14 }}>
          <Avatar name={teacher?.name ?? level} url={preview} size={72} />
          <label className="field">
            {t.teacherPhoto}
            <input type="file" name="photo" accept="image/*" onChange={onPick} />
          </label>
        </div>
        <label className="field">
          {t.teacherName}
          <input type="text" name="name" defaultValue={teacher?.name ?? ""} required maxLength={60} />
        </label>
        <label className="field">
          {t.teacherIntro}
          <textarea name="intro" rows={8} defaultValue={teacher?.intro ?? ""} maxLength={2000} />
        </label>
        <label className="field">
          {t.teacherIntroAz}
          <textarea name="intro_az" rows={3} defaultValue={teacher?.intro_az ?? ""} maxLength={1000} />
        </label>
        <label className="field">
          {t.teacherIntroRu}
          <textarea name="intro_ru" rows={3} defaultValue={teacher?.intro_ru ?? ""} maxLength={1000} />
        </label>
        <label className="field">
          {t.teacherVideo}
          <input type="url" name="video_url" defaultValue={teacher?.video_url ?? ""} placeholder="https://app.heygen.com/share/…" />
        </label>
        <div className="row">
          <SubmitButton className="btn small">{all.common.save}</SubmitButton>
          {state.error && <span className="error small">{state.error}</span>}
          {state.ok && <span className="small" style={{ color: "var(--accent)" }}>{state.ok}</span>}
        </div>
      </form>
    </details>
  );
}
