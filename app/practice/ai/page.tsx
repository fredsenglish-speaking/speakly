import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { requireUser } from "@/lib/auth";
import { AI_CHAT_MINUTES, AI_CHAT_PRICE, durationLabel, formatDateTime, money, topicTitle } from "@/lib/levels";
import { aiTeacherEnabled } from "@/lib/liveavatar";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BuyAiChatForm } from "./BuyAiChatForm";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].aiChat.title };
}

type ChatRow = { id: string; minutes: number; paid: boolean; ended_at: string | null; created_at: string; topic_id: number };

export default async function AiChatPage() {
  const user = await requireUser("/practice/ai");
  const locale = await getLocale();
  const tr = DICTIONARIES[locale];
  const t = tr.aiChat;
  const enabled = aiTeacherEnabled();
  const db = createAdminClient();

  const [{ data: topicRows }, { data: chatRows }] = await Promise.all([
    user.level
      ? db.from("practice_topics").select("id, title, title_en, title_ru").eq("level", user.level).order("position")
      : Promise.resolve({ data: [] }),
    db
      .from("ai_chats")
      .select("id, minutes, paid, ended_at, created_at, topic_id")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const chats = (chatRows ?? []) as ChatRow[];
  const { data: chatTopics } = chats.length
    ? await db.from("practice_topics").select("id, title, title_en, title_ru").in("id", [...new Set(chats.map((c) => c.topic_id))])
    : { data: [] };
  const topicById = new Map((chatTopics ?? []).map((tp) => [tp.id, topicTitle(tp, locale)]));
  const topics = (topicRows ?? []).map((tp) => ({ id: tp.id, title: topicTitle(tp, locale) }));
  const prices = AI_CHAT_MINUTES.map((d) => ({ minutes: d, label: durationLabel(d, tr), price: money(AI_CHAT_PRICE[d]) }));

  return (
    <section className="stack">
      <Link href="/practice" className="small">← {t.back}</Link>
      <div className="row between">
        <h2>{t.title}</h2>
        {user.level && <LevelChip level={user.level} />}
      </div>
      <p className="muted">{t.cardText}</p>

      {!enabled ? (
        <div className="panel stack">
          <span className="status scheduled self-start">{t.comingSoon}</span>
          <p>{t.comingSoonNote}</p>
          <div className="choices">
            {prices.map((p) => (
              <div key={p.minutes} className="choice">
                <span>{p.label}</span>
                <span className="price">{p.price}</span>
              </div>
            ))}
          </div>
          <Link href="/practice" className="btn ghost self-start">{t.back}</Link>
        </div>
      ) : !user.level ? (
        <div className="panel stack">
          <p>{tr.practice.needTest}</p>
          <Link href="/test" className="btn self-start">{tr.practice.takeTest}</Link>
        </div>
      ) : (
        <BuyAiChatForm topics={topics} prices={prices} />
      )}

      {chats.length > 0 && (
        <div className="panel stack">
          <h3>{t.myChats}</h3>
          {chats.map((c) => (
            <div key={c.id} className="row between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
              <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                <strong>{topicById.get(c.topic_id) ?? "—"}</strong>
                <span className="small muted">
                  {formatDateTime(c.created_at, locale)} · {durationLabel(c.minutes, tr)}
                </span>
              </div>
              <span className={`status ${c.ended_at ? "cancelled" : c.paid ? "completed" : "scheduled"}`}>
                {c.ended_at ? t.finished : c.paid ? t.continue : t.notPaid}
              </span>
              <Link href={`/practice/ai/${c.id}`} className="btn ghost small">{tr.practice.open}</Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
