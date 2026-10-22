"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { topicTitle } from "@/lib/levels";
import { getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Invite = { roomId: string; from: string; topic: string };

/** Called every half minute by open pages: marks the user online and returns invitations waiting for them. */
export async function heartbeat(): Promise<Invite[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const db = createAdminClient();
  await db.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);

  const { data: rooms } = await db
    .from("practice_rooms")
    .select("id, host_id, topic_id")
    .eq("invited_id", user.id)
    .is("guest_id", null)
    .eq("cancelled", false)
    .gt("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(3);
  if (!rooms?.length) return [];

  const locale = await getLocale();
  const [{ data: hosts }, { data: topics }] = await Promise.all([
    db.from("profiles").select("id, full_name").in("id", rooms.map((r) => r.host_id)),
    db.from("practice_topics").select("id, title, title_en, title_ru").in("id", rooms.map((r) => r.topic_id)),
  ]);
  return rooms.map((r) => ({
    roomId: r.id,
    from: hosts?.find((h) => h.id === r.host_id)?.full_name ?? "",
    topic: (() => {
      const t = topics?.find((tp) => tp.id === r.topic_id);
      return t ? topicTitle(t, locale) : "";
    })(),
  }));
}

export async function answerInvite(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const roomId = String(form.get("room_id"));
  const db = createAdminClient();
  if (form.get("answer") === "accept") {
    const { data } = await db
      .from("practice_rooms")
      .update({ guest_id: user.id, invited_id: null })
      .eq("id", roomId)
      .eq("invited_id", user.id)
      .is("guest_id", null)
      .eq("cancelled", false)
      .select("id");
    redirect(data?.length ? `/practice/${roomId}` : "/practice");
  }
  await db.from("practice_rooms").update({ cancelled: true }).eq("id", roomId).eq("invited_id", user.id).is("guest_id", null);
}
