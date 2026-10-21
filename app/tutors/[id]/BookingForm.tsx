"use client";

import { useActionState, useState } from "react";
import { createBooking, type BookingState } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { durationLabel, formatDateTime, money } from "@/lib/levels";

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
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [slot, setSlot] = useState("");

  return (
    <form action={action} className="panel stack">
      <input type="hidden" name="tutor_id" value={tutorId} />
      <h3>Dərsin müddəti</h3>
      <div className="choices" role="radiogroup" aria-label="Müddət">
        {([15, 30, 60] as const).map((d) => (
          <label key={d} className="choice">
            <input type="radio" name="duration" value={d} checked={duration === d} onChange={() => setDuration(d)} />
            <span>{durationLabel(d)}</span>
            <span className="price">{money(prices[d])}</span>
          </label>
        ))}
      </div>
      <h3>Vaxt (Bakı vaxtı)</h3>
      {slots.length === 0 ? (
        <p className="muted small">Müəllimin hələ boş vaxtı yoxdur. Bir az sonra yenidən baxın.</p>
      ) : (
        <div className="filters" role="radiogroup" aria-label="Vaxt">
          {slots.map((s) => (
            <label key={s.id} className="chip">
              <input type="radio" name="slot_id" value={s.id} checked={slot === s.id} onChange={() => setSlot(s.id)} />
              {formatDateTime(s.starts_at)}
            </label>
          ))}
        </div>
      )}
      <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <span>Cəmi</span>
        <span className="price total">{money(prices[duration])}</span>
      </div>
      {state.error && <p className="error">{state.error}</p>}
      <SubmitButton className="btn self-start" disabled={!slot}>
        {signedIn ? "Ödə və dərsə yazıl" : "Daxil ol və yazıl"}
      </SubmitButton>
    </form>
  );
}
