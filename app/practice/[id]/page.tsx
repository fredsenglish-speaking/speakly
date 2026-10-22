import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { AutoRefresh } from "@/components/AutoRefresh";
import { LevelChip } from "@/components/LevelChip";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { PRACTICE_MINUTES, PRACTICE_PRICE, formatDateTime, money, shortName, topicTitle } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { leaveRoom, payRoom } from "../actions";
import { loadRooms, roomStatus } from "../rooms";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/practice/${id}`);
  const locale = await getLocale();
  const t = DICTIONARIES[locale].practice;
  const [room] = await loadRooms((q) => q.eq("id", id));
  const isHost = room?.host_id === user.id;
  const isGuest = !!room && room.guest_id === user.id;
  if (!room || (!isHost && !isGuest && user.role !== "admin")) notFound();

  const status = roomStatus(room);
  const iPaid = (isHost && room.host_paid) || (isGuest && room.guest_paid);
  const canSeeCall = iPaid || user.role === "admin";
  const price = money(PRACTICE_PRICE);
  const seat = (person: { full_name: string; avatar_url: string | null } | null, paid: boolean, me: boolean) =>
    person ? (
      <span className="row" style={{ gap: 8 }}>
        <Avatar name={person.full_name} url={person.avatar_url} size={28} />
        <span>
          {shortName(person.full_name)}
          {me && ` (${t.you})`}
          <span className="small muted"> · {paid ? t.paid : t.notPaid}</span>
        </span>
      </span>
    ) : (
      "—"
    );

  return (
    <section className="stack">
      {status !== "cancelled" && !canSeeCall && <AutoRefresh seconds={15} />}
      <Link href="/practice" className="small">← {t.title}</Link>
      <div className="panel stack">
        <div className="row between">
          <h2>{topicTitle(room.topic, locale)}</h2>
          <LevelChip level={room.level} />
        </div>
        <table className="list">
          <tbody>
            <tr><td className="muted">{t.time}</td><td>{formatDateTime(room.starts_at, locale)} · {t.minutes(PRACTICE_MINUTES)}</td></tr>
            <tr><td className="muted">{t.host}</td><td>{seat(room.host, room.host_paid, isHost)}</td></tr>
            <tr>
              <td className="muted">{t.partner}</td>
              <td>
                {room.guest
                  ? seat(room.guest, room.guest_paid, isGuest)
                  : room.invited
                    ? `${shortName(room.invited.full_name)} · ${t.invited}`
                    : t.waitingPartner}
              </td>
            </tr>
          </tbody>
        </table>
        <span className={`status self-start ${status === "ready" ? "completed" : status === "cancelled" ? "cancelled" : "scheduled"}`}>
          {t[status]}
        </span>

        {status === "ready" && (isHost || isGuest) && !iPaid && (
          <>
            <p>{t.payToEnter(price)}</p>
            <form action={payRoom}>
              <input type="hidden" name="room_id" value={room.id} />
              <SubmitButton>{t.payEnter(price)}</SubmitButton>
            </form>
          </>
        )}
        {(status === "waitingPartner" || status === "invited") && <p className="small muted">{t.waitPartnerFirst}</p>}

        {status !== "cancelled" && canSeeCall && (
          <>
            <a href={room.meeting_url} target="_blank" rel="noopener noreferrer" className="btn self-start">
              {t.joinCall}
            </a>
            <p className="small muted">{t.jitsiNote}</p>
          </>
        )}
      </div>

      <div className="panel stack">
        <h3>{t.questions}</h3>
        {canSeeCall ? (
          <>
            <p className="small muted">{t.howTo}</p>
            <ol className="stack" style={{ gap: 8, margin: 0, paddingLeft: 22 }}>
              {room.topic.questions.map((q, i) => (
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
