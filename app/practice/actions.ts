"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PRACTICE_PRICE } from "@/lib/levels";
import { isOpenSlot, topicForSlot } from "@/lib/schedule";
import { cancelPayment, startPayment } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRooms } from "./rooms";

function meetingUrl() {
  return `https://meet.jit.si/FredsEnglish-${randomBytes(6).toString("hex")}`;
}

/**
 * Books a seat in a timetable slot. The student joins a room of that slot that
 * is waiting for a partner, or takes the first seat of a new one. Booking is
 * free; each student pays when entering the conversation.
 */
export async function bookSlot(form: FormData) {
  const user = await requireUser("/practice");
  if (!user.level) redirect("/test");
  const startsAt = String(form.get("starts_at") ?? "");
  const back = `/practice?day=${Number(form.get("day")) || 0}`;
  if (!isOpenSlot(startsAt)) redirect(`${back}&past=1`);
  const db = createAdminClient();

  const mine = await loadRooms((q) =>
    q.eq("starts_at", startsAt).eq("cancelled", false).or(`host_id.eq.${user.id},guest_id.eq.${user.id}`),
  );
  if (mine.length) redirect(`/practice/${mine[0].id}`);

  // Claim a free seat in one step, so two students can't both get it.
  const { data: waiting } = await db
    .from("practice_rooms")
    .select("id")
    .eq("level", user.level)
    .eq("starts_at", startsAt)
    .eq("cancelled", false)
    .is("guest_id", null)
    .is("invited_id", null)
    .neq("host_id", user.id)
    .order("created_at");
  for (const room of waiting ?? []) {
    const { data } = await db
      .from("practice_rooms")
      .update({ guest_id: user.id })
      .eq("id", room.id)
      .is("guest_id", null)
      .eq("cancelled", false)
      .select("id");
    if (data?.length) redirect(`/practice/${room.id}`);
  }

  const { data: topics } = await db.from("practice_topics").select("id").eq("level", user.level).order("position");
  const topic = topicForSlot(startsAt, topics ?? []);
  if (!topic) redirect(back);
  const { data: room, error } = await db
    .from("practice_rooms")
    .insert({ topic_id: topic.id, level: user.level, host_id: user.id, starts_at: startsAt, meeting_url: meetingUrl() })
    .select("id")
    .single();
  if (error || !room) {
    console.error("bookSlot failed", error);
    redirect(back);
  }
  revalidatePath("/practice");
  redirect(`/practice/${room.id}`);
}

export async function payRoom(form: FormData) {
  const roomId = String(form.get("room_id"));
  const user = await requireUser(`/practice/${roomId}`);
  redirect(
    await startPayment({
      userId: user.id,
      kind: "practice",
      refId: roomId,
      amount: PRACTICE_PRICE,
      successPath: `/practice/${roomId}`,
    }),
  );
}

/** A student gives up their seat; an empty room is cancelled. Paid money is refunded by hand. */
export async function leaveRoom(form: FormData) {
  const roomId = String(form.get("room_id"));
  const user = await requireUser(`/practice/${roomId}`);
  const db = createAdminClient();
  const { data: room } = await db
    .from("practice_rooms")
    .select("id, host_id, guest_id, guest_paid")
    .eq("id", roomId)
    .single();
  if (!room) redirect("/practice");

  if (room.host_id === user.id && room.guest_id) {
    // The partner keeps the slot and takes the first seat.
    await db
      .from("practice_rooms")
      .update({ host_id: room.guest_id, host_paid: room.guest_paid, guest_id: null, guest_paid: false })
      .eq("id", roomId);
    await cancelPendingPayments(roomId, user.id);
  } else if (room.host_id === user.id) {
    await db.from("practice_rooms").update({ cancelled: true }).eq("id", roomId);
    await cancelPendingPayments(roomId);
  } else if (room.guest_id === user.id) {
    await db.from("practice_rooms").update({ guest_id: null, guest_paid: false }).eq("id", roomId);
    await cancelPendingPayments(roomId, user.id);
  }
  revalidatePath("/practice");
  redirect("/practice");
}

async function cancelPendingPayments(roomId: string, userId?: string) {
  let query = createAdminClient()
    .from("payments")
    .select("id")
    .eq("kind", "practice")
    .eq("ref_id", roomId)
    .eq("status", "pending");
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;
  for (const p of data ?? []) await cancelPayment(p.id);
}
