"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/client";
import { createRoom, type RoomState } from "./actions";

export function CreateRoomForm({ topics, price }: { topics: { id: number; title: string }[]; price: string }) {
  const [state, action] = useActionState<RoomState, FormData>(createRoom, {});
  const t = useT().practice;
  return (
    <form action={action} className="panel stack">
      <h3>{t.newRoom}</h3>
      <label className="field">
        {t.topic}
        <select name="topic_id" required defaultValue="">
          <option value="" disabled>
            {t.chooseTopic}
          </option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.title}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {t.time}
        <input type="datetime-local" name="starts_at" required />
      </label>
      {state.error && <p className="error">{state.error}</p>}
      <SubmitButton className="btn self-start">{t.create(price)}</SubmitButton>
    </form>
  );
}
