import Link from "next/link";
import { notFound } from "next/navigation";
import { LevelChip } from "@/components/LevelChip";
import { SubmitButton } from "@/components/SubmitButton";
import { usedSeconds } from "@/lib/aiChat";
import { requireUser } from "@/lib/auth";
import { AI_CHAT_PRICE, durationLabel, isDuration, money, topicTitle } from "@/lib/levels";
import { aiTeacherEnabled } from "@/lib/liveavatar";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { payAiChat } from "../actions";
import { AiChatRoom } from "./AiChatRoom";

export default async function AiChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/practice/ai/${id}`);
  const locale = await getLocale();
  const tr = DICTIONARIES[locale];
  const t = tr.aiChat;
  const db = createAdminClient();
  const { data: chat } = await db
    .from("ai_chats")
    .select("id, student_id, topic_id, level, minutes, paid, used_seconds, started_at, ended_at")
    .eq("id", id)
    .maybeSingle();
  if (!chat || chat.student_id !== user.id) notFound();
  const { data: topic } = await db
    .from("practice_topics")
    .select("title, title_en, title_ru, questions")
    .eq("id", chat.topic_id)
    .single();

  const secondsLeft = chat.minutes * 60 - usedSeconds(chat);
  const price = isDuration(chat.minutes) ? money(AI_CHAT_PRICE[chat.minutes]) : "";

  return (
    <section className="stack">
      <Link href="/practice/ai" className="small">← {t.title}</Link>
      <div className="panel stack">
        <div className="row between">
          <h2>{topic ? topicTitle(topic, locale) : "—"}</h2>
          <LevelChip level={chat.level} />
        </div>
        <p className="small muted">{durationLabel(chat.minutes, tr)}</p>

        {!chat.paid ? (
          aiTeacherEnabled() ? (
            <form action={payAiChat}>
              <input type="hidden" name="chat_id" value={chat.id} />
              <SubmitButton>{t.pay(price)}</SubmitButton>
            </form>
          ) : (
            <p className="notice">{t.comingSoonNote}</p>
          )
        ) : chat.ended_at || secondsLeft < 30 ? (
          <>
            <p>{t.over}</p>
            <Link href="/practice/ai" className="btn self-start">{t.newChat}</Link>
          </>
        ) : (
          <AiChatRoom chatId={chat.id} secondsLeft={secondsLeft} questions={topic?.questions ?? []} />
        )}
      </div>
    </section>
  );
}
