import Link from "next/link";
import { notFound } from "next/navigation";
import { LevelChip } from "@/components/LevelChip";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { PRACTICE_MINUTES, PRACTICE_PRICE, formatDateTime, money, shortName, topicTitle } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { leaveRoom, payRoom } from "../actions";
import { ROOM_COLUMNS, roomStatus, type Room } from "../rooms";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/practice/${id}`);
  const locale = await getLocale();
  const t = DICTIONARIES[locale].practice;
  const { data } = await createAdminClient().from("practice_rooms").select(ROOM_COLUMNS).eq("id", id).maybeSingle();
  const room = data as unknown as Room | null;
  const isHost = room?.host_id === user.id;
  const isGuest = !!room && room.guest_id === user.id;
  if (!room || (!isHost && !isGuest && user.role !== "admin")) notFound();

  const status = roomStatus(room);
  const iPaid = (isHost && room.host_paid) || (isGuest && room.guest_paid);
  const showQuestions = iPaid || user.role === "admin";
  const seat = (name: string | undefined, paid: boolean, me: boolean) => (
    <span>
      {name ? shortName(name) : "—"}
      {me && ` (${t.you})`}
      {name && <span className="small muted"> · {paid ? t.paid : t.notPaid}</span>}
    </span>
  );

  return (
    <section className="stack">
      <Link href="/practice" className="small">← {t.title}</Link>
      <div className="panel stack">
        <div className="row between">
          <h2>{topicTitle(room.practice_topics, locale)}</h2>
          <LevelChip level={room.level} />
        </div>
        <table className="list">
          <tbody>
            <tr><td className="muted">{t.time}</td><td>{formatDateTime(room.starts_at, locale)} · {t.minutes(PRACTICE_MINUTES)}</td></tr>
            <tr><td className="muted">{t.host}</td><td>{seat(room.host?.full_name, room.host_paid, isHost)}</td></tr>
            <tr><td className="muted">{t.partner}</td><td>{room.guest_id ? seat(room.guest?.full_name, room.guest_paid, isGuest) : t.waitingPartner}</td></tr>
          </tbody>
        </table>
        <span className={`status self-start ${status === "ready" ? "completed" : status === "cancelled" ? "cancelled" : "scheduled"}`}>
          {t[status]}
        </span>

        {status !== "cancelled" && (isHost || isGuest) && !iPaid && (
          <form action={payRoom}>
            <input type="hidden" name="room_id" value={room.id} />
            <SubmitButton>{t.pay(money(PRACTICE_PRICE))}</SubmitButton>
          </form>
        )}

        {status === "ready" ? (
          <>
            <a href={room.meeting_url} target="_blank" rel="noopener noreferrer" className="btn self-start">
              {t.joinCall}
            </a>
            <p className="small muted">{t.jitsiNote}</p>
          </>
        ) : (
          status !== "cancelled" && <p className="small muted">{t.callLater}</p>
        )}
      </div>

      <div className="panel stack">
        <h3>{t.questions}</h3>
        {showQuestions ? (
          <>
            <p className="small muted">{t.howTo}</p>
            <ol className="stack" style={{ gap: 8, margin: 0, paddingLeft: 22 }}>
              {room.practice_topics.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </>
        ) : (
          <p className="muted small">{t.questionsAfterPay}</p>
        )}
      </div>

      {status !== "cancelled" && (isHost || isGuest) && (
        <form action={leaveRoom} className="row">
          <input type="hidden" name="room_id" value={room.id} />
          <SubmitButton className="btn ghost small">{isHost ? t.cancel : t.leave}</SubmitButton>
          {iPaid && <span className="small muted">{t.refundNote}</span>}
        </form>
      )}
    </section>
  );
}
