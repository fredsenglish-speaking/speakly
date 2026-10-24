"use server";

import { redirect } from "next/navigation";
import { usedSeconds } from "@/lib/aiChat";
import { requireUser } from "@/lib/auth";
import { AI_CHAT_PRICE, LEVEL_NAME, isDuration, isLevel } from "@/lib/levels";
import { aiTeacherEnabled, createChatSession, stopChatSession } from "@/lib/liveavatar";
import { startPayment } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";

export type BuyState = { error?: string };
export type StartResult = { token: string; seconds: number } | { error: string };

const CHAT_COLUMNS = "id, student_id, topic_id, level, minutes, paid, used_seconds, started_at, liveavatar_session_id, ended_at";

type Chat = {
  id: string;
  student_id: string;
  topic_id: number;
  level: string;
  minutes: number;
  paid: boolean;
  used_seconds: number;
  started_at: string | null;
  liveavatar_session_id: string | null;
  ended_at: string | null;
};

async function myChat(chatId: string, userId: string): Promise<Chat | null> {
  const { data } = await createAdminClient()
    .from("ai_chats")
    .select(CHAT_COLUMNS)
    .eq("id", chatId)
    .eq("student_id", userId)
    .maybeSingle();
  return data as Chat | null;
}

export async function buyAiChat(_: BuyState, form: FormData): Promise<BuyState> {
  const user = await requireUser("/practice/ai");
  const t = (await getT()).aiChat;
  if (!aiTeacherEnabled()) return { error: t.comingSoon };
  if (!user.level) redirect("/test");

  const minutes = Number(form.get("minutes"));
  if (!isDuration(minutes)) return { error: t.errDuration };
  const db = createAdminClient();
  const { data: topic } = await db
    .from("practice_topics")
    .select("id")
    .eq("id", Number(form.get("topic_id")) || 0)
    .eq("level", user.level)
    .maybeSingle();
  if (!topic) return { error: t.errTopic };

  const { data: chat, error } = await db
    .from("ai_chats")
    .insert({ student_id: user.id, topic_id: topic.id, level: user.level, minutes })
    .select("id")
    .single();
  if (error || !chat) {
    console.error("buyAiChat failed", error);
    return { error: t.errStart };
  }
  redirect(
    await startPayment({
      userId: user.id,
      kind: "ai_chat",
      refId: chat.id,
      amount: AI_CHAT_PRICE[minutes],
      successPath: `/practice/ai/${chat.id}`,
    }),
  );
}

/**
 * Opens the video conversation, or reopens it after a dropped connection with
 * the minutes that are left. The teacher's session ends by itself when the
 * paid time is over.
 */
export async function startAiChat(chatId: string): Promise<StartResult> {
  const user = await requireUser(`/practice/ai/${chatId}`);
  const t = (await getT()).aiChat;
  const chat = await myChat(chatId, user.id);
  if (!chat?.paid || chat.ended_at || !aiTeacherEnabled()) return { error: t.errStart };

  const used = usedSeconds(chat);
  const seconds = chat.minutes * 60 - used;
  if (seconds < 30) {
    await finish(chat);
    return { error: t.timeUp };
  }
  if (chat.liveavatar_session_id) await stopChatSession(chat.liveavatar_session_id);

  const db = createAdminClient();
  const { data: topic } = await db
    .from("practice_topics")
    .select("title_en, questions")
    .eq("id", chat.topic_id)
    .single();
  try {
    const session = await createChatSession(
      {
        student_name: user.full_name.trim().split(/\s+/)[0] || "there",
        level: chat.level,
        level_name: isLevel(chat.level) ? LEVEL_NAME[chat.level] : "",
        topic: topic?.title_en ?? "",
        questions: (topic?.questions ?? []).map((q: string) => `- ${q}`).join("\n").slice(0, 1000),
        minutes: String(chat.minutes),
      },
      seconds,
    );
    await db
      .from("ai_chats")
      .update({ used_seconds: used, started_at: new Date().toISOString(), liveavatar_session_id: session.sessionId })
      .eq("id", chat.id);
    return { token: session.token, seconds };
  } catch (e) {
    console.error(e);
    return { error: t.errStart };
  }
}

/** The student ends the conversation, or the time ran out. */
export async function endAiChat(chatId: string): Promise<void> {
  const user = await requireUser(`/practice/ai/${chatId}`);
  const chat = await myChat(chatId, user.id);
  if (chat && !chat.ended_at) await finish(chat);
}

async function finish(chat: Chat) {
  if (chat.liveavatar_session_id) await stopChatSession(chat.liveavatar_session_id);
  await createAdminClient()
    .from("ai_chats")
    .update({ used_seconds: usedSeconds(chat), started_at: null, ended_at: new Date().toISOString() })
    .eq("id", chat.id);
}

/** Pays for a conversation that was chosen but not paid yet. */
export async function payAiChat(form: FormData) {
  const chatId = String(form.get("chat_id"));
  const user = await requireUser(`/practice/ai/${chatId}`);
  const chat = await myChat(chatId, user.id);
  if (!chat || chat.paid || !isDuration(chat.minutes) || !aiTeacherEnabled()) redirect(`/practice/ai/${chatId}`);
  redirect(
    await startPayment({
      userId: user.id,
      kind: "ai_chat",
      refId: chat.id,
      amount: AI_CHAT_PRICE[chat.minutes],
      successPath: `/practice/ai/${chat.id}`,
    }),
  );
}
