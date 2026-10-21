"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isDuration } from "@/lib/levels";
import { startPayment } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";

export type BookingState = { error?: string };

export async function createBooking(_: BookingState, form: FormData): Promise<BookingState> {
  const tutorId = String(form.get("tutor_id"));
  const slotId = String(form.get("slot_id") ?? "");
  const duration = Number(form.get("duration"));
  const user = await requireUser(`/tutors/${tutorId}`);
  const t = (await getT()).tutors;

  if (!isDuration(duration)) return { error: t.errDuration };
  if (!slotId) return { error: t.errSlot };
  if (user.id === tutorId) return { error: t.errSelf };

  const db = createAdminClient();
  const { data: tutor } = await db
    .from("tutors")
    .select("id, price_15, price_30, price_60, meeting_url")
    .eq("id", tutorId)
    .eq("approved", true)
    .single();
  if (!tutor) return { error: t.errTutor };

  const { data: slot } = await db
    .from("tutor_slots")
    .select("id, starts_at, booked")
    .eq("id", slotId)
    .eq("tutor_id", tutorId)
    .single();
  if (!slot || slot.booked || new Date(slot.starts_at) <= new Date()) {
    return { error: t.errTaken };
  }

  const price = Number(tutor[`price_${duration}` as const]);
  const { data: booking, error } = await db
    .from("bookings")
    .insert({
      student_id: user.id,
      tutor_id: tutorId,
      slot_id: slot.id,
      starts_at: slot.starts_at,
      duration_min: duration,
      price,
      meeting_url: tutor.meeting_url,
    })
    .select("id")
    .single();
  if (error || !booking) return { error: t.errBooking };

  redirect(
    await startPayment({ userId: user.id, kind: "booking", refId: booking.id, amount: price, successPath: "/dashboard" }),
  );
}
