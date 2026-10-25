import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { LevelChip } from "@/components/LevelChip";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { PRACTICE_MINUTES, PRACTICE_PRICE, formatDateTime, money, shortName, topicTitle } from "@/lib/levels";
import { aiTeacherEnabled } from "@/lib/liveavatar";
import { SCHEDULE_DAYS, bakuDate, slotTime, slotsForDay, topicForSlot } from "@/lib/schedule";
import { DICTIONARIES, INTL_LOCALE, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookSlot } from "./actions";
import { loadRooms, roomStatus } from "./rooms";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].practice.title };
}

function AiTeacherCard({ t }: { t: (typeof DICTIONARIES)["az"]["aiChat"] }) {
  // Hidden until the AI teacher is switched on, so students only see what they can use.
  if (!aiTeacherEnabled()) return null;
  return (
    <div className="panel stack" style={{ borderColor: "var(--accent)" }}>
      <h3>{t.title}</h3>
      <p className="small">{t.cardText}</p>
      <Link href="/practice/ai" className="btn self-start">{t.tryIt}</Link>
    </div>
  );
}

function HowItWorks({ locale, price }: { locale: Locale; price: string }) {
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

function dayLabel(offset: number, locale: Locale) {
  const t = DICTIONARIES[locale].practice;
  if (offset === 0) return t.today;
  if (offset === 1) return t.tomorrow;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${bakuDate(offset)}T12:00:00Z`),
  );
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; past?: string }>;
}) {
  const user = await requireUser("/practice");
  const locale = await getLocale();
  const t = DICTIONARIES[locale].practice;
  const price = money(PRACTICE_PRICE);

  if (!user.level) {
    return (
      <section className="stack">
        <h2>{t.title}</h2>
        <HowItWorks locale={locale} price={price} />
        <div className="panel stack narrow">
          <p>{t.needTest}</p>
          <Link href="/test" className="btn self-start">{t.takeTest}</Link>
        </div>
        <AiTeacherCard t={DICTIONARIES[locale].aiChat} />
      </section>
    );
  }

  const level = user.level;
  const params = await searchParams;
  const day = Math.min(Math.max(Math.trunc(Number(params.day) || 0), 0), SCHEDULE_DAYS - 1);
  const slots = slotsForDay(day);
  const db = createAdminClient();
  const [{ data: topicRows }, dayRooms, mine] = await Promise.all([
    db.from("practice_topics").select("id, title, title_en, title_ru").eq("level", level).order("position"),
    slots.length
      ? loadRooms((q) => q.eq("level", level).eq("cancelled", false).in("starts_at", slots))
      : Promise.resolve([]),
    loadRooms((q) =>
      q
        .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
        .eq("cancelled", false)
        .gt("starts_at", new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())
        .order("starts_at"),
    ),
  ]);
  const topics = topicRows ?? [];
  const same = (a: string, b: string) => new Date(a).getTime() === new Date(b).getTime();

  return (
    <section className="stack">
      <AutoRefresh seconds={30} />
      <div className="row between">
        <h2>{t.title}</h2>
        <LevelChip level={level} />
      </div>
      <HowItWorks locale={locale} price={price} />
      {params.past && <p className="notice">{t.errPastSlot}</p>}

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

      <div className="panel stack">
        <h3>{t.schedule}</h3>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: SCHEDULE_DAYS }, (_, d) => (
            <Link key={d} href={`/practice?day=${d}`} className="chip" aria-current={d === day ? "true" : undefined}>
              {dayLabel(d, locale)}
            </Link>
          ))}
        </div>
        {slots.length === 0 && <p className="muted small">{t.noSlotsLeft}</p>}
        {slots.map((slot) => {
          const topic = topicForSlot(slot, topics);
          if (!topic) return null;
          const rooms = dayRooms.filter((r) => same(r.starts_at, slot));
          const myRoom = rooms.find((r) => r.host_id === user.id || r.guest_id === user.id);
          const waiting = rooms.filter((r) => !r.guest_id && !r.invited_id && r.host_id !== user.id).length;
          return (
            <form key={slot} action={bookSlot} className="row between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
              <input type="hidden" name="starts_at" value={slot} />
              <input type="hidden" name="day" value={day} />
              <strong style={{ fontVariantNumeric: "tabular-nums", minWidth: 52 }}>{slotTime(slot)}</strong>
              <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                <span>{topicTitle(topic, locale)}</span>
                {waiting > 0 && !myRoom && (
                  <span className="small" style={{ color: "var(--accent)" }}>● {t.waitingCount(waiting)}</span>
                )}
              </div>
              {myRoom ? (
                <Link href={`/practice/${myRoom.id}`} className="btn ghost small">{t.yourSeat}</Link>
              ) : (
                <SubmitButton className="btn small">{t.book}</SubmitButton>
              )}
            </form>
          );
        })}
      </div>

      <AiTeacherCard t={DICTIONARIES[locale].aiChat} />
    </section>
  );
}
