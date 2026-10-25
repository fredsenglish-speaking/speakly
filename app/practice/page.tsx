import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { AutoRefresh } from "@/components/AutoRefresh";
import { LevelChip } from "@/components/LevelChip";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { PRACTICE_MINUTES, PRACTICE_PRICE, formatDateTime, money, shortName, topicTitle } from "@/lib/levels";
import { aiTeacherEnabled } from "@/lib/liveavatar";
import { isOnline } from "@/lib/presence";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateRoomForm } from "./CreateRoomForm";
import { inviteNow, joinRoom } from "./actions";
import { loadRooms, roomStatus } from "./rooms";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].practice.title };
}

function AiTeacherCard({ t }: { t: (typeof DICTIONARIES)["az"]["aiChat"] }) {
  // Hidden until the AI teacher is switched on, so students only see what they can use.
  if (!aiTeacherEnabled()) return null;
  return (
    <div className="panel stack" style={{ borderColor: "var(--accent)" }}>
      <div className="row between">
        <h3>{t.title}</h3>
      </div>
      <p className="small">{t.cardText}</p>
      <Link href="/practice/ai" className="btn self-start">{t.tryIt}</Link>
    </div>
  );
}

function HowItWorks({ locale, price }: { locale: keyof typeof DICTIONARIES; price: string }) {
  const d = DICTIONARIES[locale];
  return (
    <div className="steps three">
      {d.practice.steps(price, PRACTICE_MINUTES).map(([title, text], i) => (
        <div className="step" key={i}>
          <b>
            {d.home.step} {i + 1}
          </b>
          <h3>{title}</h3>
          <p className="small muted">{text}</p>
        </div>
      ))}
    </div>
  );
}

type Peer = { id: string; full_name: string; avatar_url?: string | null; last_seen_at?: string | null };

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ taken?: string; offline?: string }>;
}) {
  const user = await requireUser("/practice");
  const locale = await getLocale();
  const t = DICTIONARIES[locale].practice;
  const price = money(PRACTICE_PRICE);

  if (!user.level) {
    return (
      <section className="panel stack narrow">
        <h2>{t.title}</h2>
        <HowItWorks locale={locale} price={price} />
        <p>{t.needTest}</p>
        <Link href="/test" className="btn self-start">{t.takeTest}</Link>
        <AiTeacherCard t={DICTIONARIES[locale].aiChat} />
      </section>
    );
  }

  const level = user.level;
  const { taken, offline } = await searchParams;
  const db = createAdminClient();
  const now = new Date().toISOString();
  const [{ data: topicRows }, { data: peerRows, count }, open, mine] = await Promise.all([
    db.from("practice_topics").select("id, title, title_en, title_ru").eq("level", level).order("position"),
    db
      .from("profiles")
      .select("*", { count: "exact" })
      .eq("level", level)
      .eq("role", "student")
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    loadRooms((q) =>
      q
        .eq("level", level)
        .eq("cancelled", false)
        .is("guest_id", null)
        .is("invited_id", null)
        .neq("host_id", user.id)
        .gt("starts_at", now)
        .order("starts_at"),
    ),
    loadRooms((q) =>
      q
        .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
        .eq("cancelled", false)
        .gt("starts_at", new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())
        .order("starts_at"),
    ),
  ]);
  const topics = (topicRows ?? []).map((tp) => ({ id: tp.id, title: topicTitle(tp, locale) }));
  const peers = ((peerRows ?? []) as Peer[])
    .map((p) => ({ ...p, online: isOnline(p.last_seen_at) }))
    .sort((a, b) => Number(b.online) - Number(a.online));
  const onlineCount = peers.filter((p) => p.online).length;

  return (
    <section className="stack">
      <AutoRefresh seconds={30} />
      <div className="row between">
        <h2>{t.title}</h2>
        <LevelChip level={level} />
      </div>
      <HowItWorks locale={locale} price={price} />
      <div className="row">
        <a href="#new-room" className="btn">{t.newRoom}</a>
        <a href="#open-rooms" className="btn ghost">{t.jumpOpen}</a>
      </div>
      {taken && <p className="notice">{t.errTaken}</p>}
      {offline && <p className="notice">{t.errOffline}</p>}

      {mine.length > 0 && (
        <div className="panel stack">
          <h3>{t.myRooms}</h3>
          {mine.map((r) => {
            const other = r.host_id === user.id ? r.guest ?? r.invited : r.host;
            const status = roomStatus(r);
            return (
              <div key={r.id} className="row between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                  <strong>{topicTitle(r.topic, locale)}</strong>
                  <span className="small muted">
                    {formatDateTime(r.starts_at, locale)} · {other ? shortName(other.full_name) : "—"}
                  </span>
                </div>
                <span className={`status ${status === "ready" ? "completed" : "scheduled"}`}>{t[status]}</span>
                <Link href={`/practice/${r.id}`} className="btn ghost small">{t.open}</Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="panel stack" id="open-rooms">
        <h3>{t.openRooms}</h3>
        {open.length === 0 && <p className="muted small">{t.noOpenRooms}</p>}
        {open.map((r) => (
          <form key={r.id} action={joinRoom} className="row between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            <input type="hidden" name="room_id" value={r.id} />
            <Avatar name={r.host?.full_name ?? ""} url={r.host?.avatar_url} size={36} />
            <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
              <strong>{topicTitle(r.topic, locale)}</strong>
              <span className="small muted">
                {formatDateTime(r.starts_at, locale)} · {t.minutes(PRACTICE_MINUTES)} · {shortName(r.host?.full_name ?? "")}
              </span>
            </div>
            <SubmitButton className="btn small">{t.join}</SubmitButton>
          </form>
        ))}
      </div>

      <div id="new-room">
        <CreateRoomForm topics={topics} />
      </div>

      <div className="panel stack">
        <div className="row between">
          <h3>{t.peers(count ?? peers.length)}</h3>
          {onlineCount > 0 && <span className="small" style={{ color: "var(--accent)" }}>● {t.onlineNow(onlineCount)}</span>}
        </div>
        {peers.length === 0 ? (
          <p className="muted small">{t.noPeers}</p>
        ) : (
          <div className="peers">
            {peers.map((p) => (
              <div key={p.id} className="peer">
                <Avatar name={p.full_name} url={p.avatar_url} size={40} online={p.online} />
                <span className="name">{shortName(p.full_name) || "—"}</span>
                {p.online && (
                  <details>
                    <summary className="btn small">{t.talk}</summary>
                    <form action={inviteNow}>
                      <input type="hidden" name="peer_id" value={p.id} />
                      <label className="field" style={{ flex: 1 }}>
                        {t.inviteTitle(shortName(p.full_name))}
                        <select name="topic_id" required defaultValue="">
                          <option value="" disabled>{t.chooseTopic}</option>
                          {topics.map((tp) => (
                            <option key={tp.id} value={tp.id}>{tp.title}</option>
                          ))}
                        </select>
                      </label>
                      <SubmitButton className="btn small">{t.sendInvite}</SubmitButton>
                    </form>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AiTeacherCard t={DICTIONARIES[locale].aiChat} />
    </section>
  );
}
