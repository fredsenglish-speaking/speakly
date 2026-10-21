import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { requireUser } from "@/lib/auth";
import { PRACTICE_MINUTES, PRACTICE_PRICE, formatDateTime, money, shortName, topicTitle } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { CreateRoomForm } from "./CreateRoomForm";
import { joinRoom } from "./actions";
import { ROOM_COLUMNS, roomStatus, type Room } from "./rooms";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].practice.title };
}

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ taken?: string }> }) {
  const user = await requireUser("/practice");
  const locale = await getLocale();
  const t = DICTIONARIES[locale].practice;
  const price = money(PRACTICE_PRICE);

  if (!user.level) {
    return (
      <section className="panel stack narrow">
        <h2>{t.title}</h2>
        <p className="muted">{t.intro(price, PRACTICE_MINUTES)}</p>
        <p>{t.needTest}</p>
        <Link href="/test" className="btn self-start">{t.takeTest}</Link>
      </section>
    );
  }

  const { taken } = await searchParams;
  const db = createAdminClient();
  const now = new Date().toISOString();
  const [{ data: topics }, { data: peers, count }, { data: openRows }, { data: mineRows }] = await Promise.all([
    db.from("practice_topics").select("id, title, title_en, title_ru").eq("level", user.level).order("position"),
    db
      .from("profiles")
      .select("id, full_name", { count: "exact" })
      .eq("level", user.level)
      .eq("role", "student")
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(60),
    db
      .from("practice_rooms")
      .select(ROOM_COLUMNS)
      .eq("level", user.level)
      .eq("cancelled", false)
      .is("guest_id", null)
      .neq("host_id", user.id)
      .gt("starts_at", now)
      .order("starts_at"),
    db
      .from("practice_rooms")
      .select(ROOM_COLUMNS)
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .eq("cancelled", false)
      .gt("starts_at", new Date(Date.now() - PRACTICE_MINUTES * 60000).toISOString())
      .order("starts_at"),
  ]);
  const open = (openRows ?? []) as unknown as Room[];
  const mine = (mineRows ?? []) as unknown as Room[];

  return (
    <section className="stack">
      <div className="row between">
        <h2>{t.title}</h2>
        <LevelChip level={user.level} />
      </div>
      <p className="muted">{t.intro(price, PRACTICE_MINUTES)}</p>
      {taken && <p className="notice">{t.errTaken}</p>}

      {mine.length > 0 && (
        <div className="panel stack">
          <h3>{t.myRooms}</h3>
          {mine.map((r) => (
            <div key={r.id} className="row between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
              <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                <strong>{topicTitle(r.practice_topics, locale)}</strong>
                <span className="small muted">
                  {formatDateTime(r.starts_at, locale)} ·{" "}
                  {r.host_id === user.id ? shortName(r.guest?.full_name ?? "") || "—" : shortName(r.host?.full_name ?? "")}
                </span>
              </div>
              <span className={`status ${roomStatus(r) === "ready" ? "completed" : "scheduled"}`}>{t[roomStatus(r)]}</span>
              <Link href={`/practice/${r.id}`} className="btn ghost small">{t.open}</Link>
            </div>
          ))}
        </div>
      )}

      <div className="panel stack">
        <h3>{t.openRooms}</h3>
        {open.length === 0 && <p className="muted small">{t.noOpenRooms}</p>}
        {open.map((r) => (
          <form key={r.id} action={joinRoom} className="row between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            <input type="hidden" name="room_id" value={r.id} />
            <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
              <strong>{topicTitle(r.practice_topics, locale)}</strong>
              <span className="small muted">
                {formatDateTime(r.starts_at, locale)} · {t.minutes(PRACTICE_MINUTES)} · {t.host}: {shortName(r.host?.full_name ?? "")}
              </span>
            </div>
            <SubmitButton className="btn small">{t.join(price)}</SubmitButton>
          </form>
        ))}
      </div>

      <CreateRoomForm topics={(topics ?? []).map((tp) => ({ id: tp.id, title: topicTitle(tp, locale) }))} price={price} />

      <div className="panel stack">
        <h3>{t.peers(count ?? 0)}</h3>
        {(peers ?? []).length === 0 ? (
          <p className="muted small">{t.noPeers}</p>
        ) : (
          <div className="filters">
            {(peers ?? []).map((p) => (
              <span key={p.id} className="chip">{shortName(p.full_name) || "—"}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
