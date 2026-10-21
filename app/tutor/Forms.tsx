"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { LevelChip } from "@/components/LevelChip";
import { addSlot, saveNote, type FormState } from "./actions";
import { lessonText } from "@/lib/levels";
import { useLocale, useT } from "@/lib/i18n/client";

function Status({ state }: { state: FormState }) {
  if (state.error) return <p className="error small">{state.error}</p>;
  if (state.ok) return <p className="small" style={{ color: "var(--accent)" }}>{state.ok}</p>;
  return null;
}

export function AddSlotForm() {
  const [state, action] = useActionState(addSlot, {});
  const t = useT();
  return (
    <form action={action} className="row" style={{ alignItems: "end" }}>
      <label className="field" style={{ flex: 1, minWidth: 200 }}>
        {t.tutorPanel.newSlot}
        <input type="datetime-local" name="starts_at" id="starts_at" required />
      </label>
      <SubmitButton>{t.tutorPanel.add}</SubmitButton>
      <Status state={state} />
    </form>
  );
}

type Lesson = { id: number; level: string; title: string; title_en: string | null; title_ru: string | null };

export function NoteForm({
  bookingId,
  lessons,
  studentLevel,
  existing,
}: {
  bookingId: string;
  lessons: Lesson[];
  studentLevel: string | null;
  existing?: { note: string; lesson_ids: number[] } | null;
}) {
  const [state, action] = useActionState(saveNote, {});
  const t = useT();
  const locale = useLocale();
  const suggested = studentLevel ? lessons.filter((l) => l.level <= studentLevel) : lessons;
  return (
    <form action={action} className="stack">
      <input type="hidden" name="booking_id" value={bookingId} />
      <label className="field">
        {t.tutorPanel.noteLabel}
        <textarea
          name="note"
          id={`note-${bookingId}`}
          rows={3}
          defaultValue={existing?.note ?? ""}
          placeholder={t.tutorPanel.notePlaceholder}
          required
        />
      </label>
      <details>
        <summary className="small muted">{t.tutorPanel.recommended(suggested.length)}</summary>
        <div className="topics" style={{ marginTop: 8 }}>
          {suggested.map((l) => (
            <label key={l.id} className="check">
              <input
                type="checkbox"
                name="lesson_ids"
                value={l.id}
                id={`l-${bookingId}-${l.id}`}
                defaultChecked={existing?.lesson_ids.includes(l.id)}
              />
              <LevelChip level={l.level} /> {lessonText(l, locale).title}
            </label>
          ))}
        </div>
      </details>
      <div className="row">
        <SubmitButton className="btn self-start">{existing ? t.tutorPanel.updateNote : t.tutorPanel.sendNote}</SubmitButton>
        <Status state={state} />
      </div>
    </form>
  );
}
