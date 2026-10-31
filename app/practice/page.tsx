import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { LevelChip } from "@/components/LevelChip";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentUser } from "@/lib/auth";
import { LEVELS, PRACTICE_MINUTES, PRACTICE_PRICE, formatDateTime, isLevel, money, shortName, topicTitle, type Level } from "@/lib/levels";
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
    <section className="club-steps">
      <h2>{d.practice.howTitle}</h2>
      <ol>
        {d.practice.steps(price, PRACTICE_MINUTES).map(([title, text], i) => (
          <li key={i}>
            <span className="club-step-no">{i + 1}</span>
            <h3>{title}</h3>
            <p className="small muted">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const BENEFIT_ICONS = [
  "M4 5h16v11H9l-5 4V5Z",
  "M6 4h12v16H6zM9 8h6M9 12h6M9 16h4",
  "M4 20V14M10 20V9M16 20V12M22 20V4",
  "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
];

function ClubHero({
  locale,
  price,
  level,
  lockedLevel,
  ctaHref,
}: {
  locale: Locale;
  price: string;
  level: Level | null;
  lockedLevel: boolean;
  ctaHref: string;
}) {
  const t = DICTIONARIES[locale].practice;
  return (
    <section className="club-hero">
      <div className="club-inner">
        <div className="club-copy">
          <h1 className="club-title" lang="en">
            Speak English
            <br />
            <span className="hero-accent">with Confidence</span>
          </h1>
          <p className="club-lead">{t.heroLead}</p>
        </div>
        <svg className="club-wave" viewBox="0 0 600 120" aria-hidden="true">
          <path d="M0 60 H170 L185 30 L200 92 L215 18 L232 104 L248 40 L262 76 L276 52 L290 66 H330 L344 36 L360 90 L376 24 L392 98 L408 46 L420 70 H600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
        <ul className="club-benefits">
          {t.benefits(price).map(([title, text], i) => (
            <li key={title}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={BENEFIT_ICONS[i]} />
              </svg>
              <strong>{title}</strong>
              <small>{text}</small>
            </li>
          ))}
        </ul>
        <div className="club-actions">
          <Link href={ctaHref} className="btn gold hero-cta">
            {t.cta} <span aria-hidden="true">→</span>
          </Link>
          <nav className="club-levels" aria-label={t.pickLevel}>
            {LEVELS.map((l) =>
              lockedLevel ? (
                <span key={l} className="club-level" aria-current={level === l} aria-disabled={level !== l}>
                  {l}
                </span>
              ) : (
                <Link key={l} href={`/practice?level=${l}#club`} className="club-level" aria-current={level === l}>
                  {l}
                </Link>
              ),
            )}
          </nav>
        </div>
      </div>
    </section>
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
  searchParams: Promise<{ day?: string; past?: string; level?: string }>;
}) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = DICTIONARIES[locale].practice;
  const price = money(PRACTICE_PRICE);
  const params = await searchParams;

  // Visitors who are not signed in can look at any level's upcoming topics; booking needs an account.
  if (!user) {
    const level: Level = isLevel(params.level) ? params.level : "A1";
    const { data: topicRows } = await createAdminClient()
      .from("practice_topics")
      .select("id, title, title_en, title_ru")
      .eq("level", level)
      .order("position");
    const slots = [...slotsForDay(0), ...slotsForDay(1)].slice(0, 6);
    const login = `/login?next=${encodeURIComponent("/practice")}`;
    return (
      <>
        <ClubHero locale={locale} price={price} level={level} lockedLevel={false} ctaHref={login} />
        <section id="club" className="panel club-panel">
          <h2>{t.previewTitle(level)}</h2>
          <ul className="club-slots">
            {slots.map((slot) => {
              const topic = topicForSlot(slot, topicRows ?? []);
              if (!topic) return null;
              return (
                <li key={slot}>
                  <strong className="club-time">{slotTime(slot)}</strong>
                  <span>{topicTitle(topic, locale)}</span>
                </li>
              );
            })}
          </ul>
          <p className="small muted">{t.signInToBook}</p>
          <div className="row">
            <Link href={login} className="btn">{DICTIONARIES[locale].nav.signIn}</Link>
            <Link href="/signup" className="btn ghost">{DICTIONARIES[locale].nav.signUp}</Link>
          </div>
        </section>
        <HowItWorks locale={locale} price={price} />
      </>
    );
  }

  if (!user.level) {
    return (
      <>
        <ClubHero locale={locale} price={price} level={null} lockedLevel ctaHref="/test" />
        <div id="club" className="panel stack narrow">
          <p>{t.needTest}</p>
          <Link href="/test" className="btn self-start">{t.takeTest}</Link>
        </div>
        <HowItWorks locale={locale} price={price} />
        <AiTeacherCard t={DICTIONARIES[locale].aiChat} />
      </>
    );
  }

  const level = user.level;
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
    <>
      <ClubHero locale={locale} price={price} level={level} lockedLevel ctaHref="#club" />
      <section id="club" className="stack club-area">
      <AutoRefresh seconds={30} />
      <div className="row between">
        <h2>{t.schedule}</h2>
        <LevelChip level={level} />
      </div>
      <p className="small muted">{t.ownLevelOnly}</p>
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

      </section>
      <HowItWorks locale={locale} price={price} />
      <AiTeacherCard t={DICTIONARIES[locale].aiChat} />
    </>
  );
}
