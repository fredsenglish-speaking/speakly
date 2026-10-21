"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PRACTICE_PRICE, bakuLocalToIso } from "@/lib/levels";
import { cancelPayment, startPayment } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";

export type RoomState = { error?: string };

export async function createRoom(_: RoomState, form: FormData): Promise<RoomState> {
  const user = await requireUser("/practice");
  const t = (await getT()).practice;
  if (!user.level) redirect("/test");

  const topicId = Number(form.get("topic_id"));
  const iso = bakuLocalToIso(String(form.get("starts_at") ?? ""));
  if (!Number.isInteger(topicId) || topicId <= 0) return { error: t.errTopic };
  if (!iso) return { error: t.errTime };
  if (new Date(iso) <= new Date()) return { error: t.errPast };

  const db = createAdminClient();
  const { data: topic } = await db.from("practice_topics").select("id").eq("id", topicId).eq("level", user.level).single();
  if (!topic) return { error: t.errTopic };

  const { data: room } = await db
    .from("practice_rooms")
    .insert({
      topic_id: topic.id,
      level: user.level,
      host_id: user.id,
      starts_at: iso,
      meeting_url: `https://meet.jit.si/FredsEnglish-${randomBytes(6).toString("hex")}`,
    })
    .select("id")
    .single();
  if (!room) return { error: t.errRoom };

  redirect(await payForRoom(user.id, room.id));
}

export async function joinRoom(form: FormData) {
  const user = await requireUser("/practice");
  const roomId = String(form.get("room_id"));
  if (!user.level) redirect("/test");

  // Claim the free seat in one step, so two students can't both get it.
  const { data } = await createAdminClient()
    .from("practice_rooms")
    .update({ guest_id: user.id })
    .eq("id", roomId)
    .is("guest_id", null)
    .neq("host_id", user.id)
    .eq("level", user.level)
    .eq("cancelled", false)
    .gt("starts_at", new Date().toISOString())
    .select("id");
  if (!data?.length) redirect("/practice?taken=1");

  redirect(await payForRoom(user.id, roomId));
}

export async function payRoom(form: FormData) {
  const roomId = String(form.get("room_id"));
  const user = await requireUser(`/practice/${roomId}`);
  redirect(await payForRoom(user.id, roomId));
}

async function payForRoom(userId: string, roomId: string) {
  return startPayment({
    userId,
    kind: "practice",
    refId: roomId,
    amount: PRACTICE_PRICE,
    successPath: `/practice/${roomId}`,
  });
}

/** The host cancels the room, or the guest gives up the seat. Paid money is refunded by hand. */
export async function leaveRoom(form: FormData) {
  const roomId = String(form.get("room_id"));
  const user = await requireUser(`/practice/${roomId}`);
  const db = createAdminClient();
  const { data: room } = await db
    .from("practice_rooms")
    .select("id, host_id, guest_id")
    .eq("id", roomId)
    .single();
  if (!room) redirect("/practice");

  if (room.host_id === user.id) {
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
