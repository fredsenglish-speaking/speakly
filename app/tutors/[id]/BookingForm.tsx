"use client";

import { useActionState, useState } from "react";
import { createBooking, type BookingState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { durationLabel, formatDateTime, money } from "@/lib/levels";
import { useLocale, useT } from "@/lib/i18n/client";

type Slot = { id: string; starts_at: string };

export function BookingForm({
  tutorId,
  prices,
  slots,
  signedIn,
}: {
  tutorId: string;
  prices: Record<15 | 30 | 60, number>;
  slots: Slot[];
  signedIn: boolean;
}) {
  const [state, action] = useActionState<BookingState, FormData>(createBooking, {});
  const t = useT();
  const locale = useLocale();
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [slot, setSlot] = useState("");

  return (
    <form action={action} className="panel stack">
      <input type="hidden" name="tutor_id" value={tutorId} />
      <h3>{t.tutors.duration}</h3>
      <div className="choices" role="radiogroup" aria-label={t.tutors.duration}>
        {([15, 30, 60] as const).map((d) => (
          <label key={d} className="choice">
            <input type="radio" name="duration" value={d} checked={duration === d} onChange={() => setDuration(d)} />
            <span>{durationLabel(d, t)}</span>
            <span className="price">{money(prices[d])}</span>
          </label>
        ))}
      </div>
      <h3>{t.tutors.time}</h3>
      {slots.length === 0 ? (
        <p className="muted small">{t.tutors.noSlots}</p>
      ) : (
        <div className="filters" role="radiogroup" aria-label={t.tutors.time}>
          {slots.map((s) => (
            <label key={s.id} className="chip">
              <input type="radio" name="slot_id" value={s.id} checked={slot === s.id} onChange={() => setSlot(s.id)} />
              {formatDateTime(s.starts_at, locale)}
            </label>
          ))}
        </div>
      )}
      <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <span>{t.common.total}</span>
        <span className="price total">{money(prices[duration])}</span>
      </div>
      {state.error && <p className="error">{state.error}</p>}
      <SubmitButton className="btn self-start" disabled={!slot}>
        {signedIn ? t.tutors.payBook : t.tutors.loginBook}
      </SubmitButton>
    </form>
  );
}
