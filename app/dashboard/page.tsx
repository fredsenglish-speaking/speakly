import Link from "next/link";
import { paymentCode } from "@/lib/whatsapp";
import { SHOW_LIVE_TUTORS } from "@/lib/features";
import { LevelChip } from "@/components/LevelChip";
import { PendingPayments } from "@/components/PendingPayments";
import { requireUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { gradeFor } from "@/lib/grade";
import { LESSON_PRICE, LEVELS, durationLabel, formatDateTime, isLevel, lessonText, money } from "@/lib/levels";
import { LEVEL_TEACHER_COLUMNS, aiTeacherPortrait, type LevelTeacher } from "@/lib/levelTeachers";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].dashboard.title };
}

type Booking = {
  id: string;
  starts_at: string;
  duration_min: number;
  status: string;
  meeting_url: string | null;
  tutors: { profiles: { full_name: string } | null } | null;
  tutor_notes: { note: string; lesson_ids: number[] } | null;
};

type Result = { lesson_id: number; best_right: number; total: number; updated_at: string };
type Attempt = { id: string; score: number; total: number; level: string; finished_at: string };

const MATERIAL_LINKS = [
  ["/exercises", "exercisesTab", "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"],
  ["/books", "books", "M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1V5Zm9 1v14"],
  ["/films", "films", "M3 6h18v13H3V6Zm0 4h18M7 6l2 4M12 6l2 4M17 6l2 4"],
] as const;

function Svg({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const d = t.dashboard;
  const supabase = await createClient();

  const [{ data: bookingRows }, { data: lessons }, { data: owned }, { data: certs }, { data: resultRows }, { data: attemptRows }, { data: teacherRows }, { data: certOrders }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id, starts_at, duration_min, status, meeting_url, tutors(profiles(full_name)), tutor_notes(note, lesson_ids)")
        .eq("student_id", user.id)
        .neq("status", "pending_payment")
        .order("starts_at", { ascending: false }),
      supabase.from("lessons").select("id, slug, level, title, title_en, title_ru").order("level").order("position"),
      supabase.from("lesson_purchases").select("lesson_id").eq("student_id", user.id),
      supabase.from("certificates").select("code, level, issued_at").eq("student_id", user.id),
      supabase.from("lesson_results").select("lesson_id, best_right, total, updated_at").eq("student_id", user.id).order("updated_at", { ascending: false }),
      supabase
        .from("test_attempts")
        .select("id, score, total, level, finished_at")
        .eq("student_id", user.id)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(5),
      supabase.from("level_teachers").select(LEVEL_TEACHER_COLUMNS),
      // Certificate orders still waiting for the admin's confirmation.
      supabase.from("payments").select("id").eq("user_id", user.id).eq("kind", "certificate").eq("status", "pending"),
    ]);
  const bookings = (bookingRows ?? []) as unknown as Booking[];
  const allLessons = lessons ?? [];
  const lessonById = new Map(allLessons.map((l) => [l.id, l]));
  const ownedIds = new Set(user.role === "admin" ? allLessons.map((l) => l.id) : (owned ?? []).map((o) => o.lesson_id));
  const results = (resultRows ?? []) as Result[];
  const resultById = new Map(results.map((r) => [r.lesson_id, r]));
  const attempts = (attemptRows ?? []) as Attempt[];
  const teachers = new Map(((teacherRows ?? []) as LevelTeacher[]).map((x) => [x.level, x]));

  const level = user.level;
  const levelLessons = level ? allLessons.filter((l) => l.level === level) : [];
  const levelDone = levelLessons.filter((l) => resultById.has(l.id)).length;
  const pct = levelLessons.length ? Math.round((levelDone / levelLessons.length) * 100) : 0;
  // Next lesson: the first unfinished one the student owns, else the first unfinished one in their level.
  const unfinished = levelLessons.filter((l) => !resultById.has(l.id));
  const next = unfinished.find((l) => ownedIds.has(l.id)) ?? unfinished[0] ?? null;
  const nextNo = next ? levelLessons.indexOf(next) + 1 : 0;
  const myTeacher = level ? teachers.get(level) : undefined;
  const firstName = user.full_name.trim().split(/\s+/)[0] || user.full_name;
  const lastTest = attempts[0];

  return (
    <section className="db">
      <header className="db-head">
        <div>
          <h1 className="db-title">{d.welcome(firstName)}</h1>
          <p className="muted">{d.welcomeLead}</p>
        </div>
        {!level && (
          <Link href="/test" className="btn gold">
            {d.takeTest} →
          </Link>
        )}
      </header>

      <PendingPayments userId={user.id} />

      <div className="db-stats">
        <div className="db-stat">
          <span className="db-stat-icon"><Svg d="M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm-4 0-2 7 6-3 6 3-2-7" /></span>
          <span className="db-stat-label">{d.currentLevel}</span>
          {level ? (
            <>
              <strong className="db-stat-value">{level}</strong>
              <span className="small muted">{t.lessons.levelLocal[level]}</span>
            </>
          ) : (
            <span className="small muted">{d.noLevel}</span>
          )}
        </div>
        <div className="db-stat">
          <span className="db-stat-label">{d.progress}</span>
          <strong className="db-stat-value">{pct}%</strong>
          <div className="lx-bar"><i style={{ width: `${pct}%` }} /></div>
          {level && <span className="small muted">{d.progressOf(levelDone, levelLessons.length, level)}</span>}
        </div>
        <div className="db-stat">
          <span className="db-stat-icon"><Svg d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1V5Zm9 1v14" /></span>
          <span className="db-stat-label">{d.completedLessons}</span>
          <strong className="db-stat-value">{results.length}</strong>
        </div>
        <div className="db-stat">
          <span className="db-stat-icon"><Svg d="M4 20V14M10 20V9M16 20V12M22 20V4M3 20h20" /></span>
          <span className="db-stat-label">{d.testResult}</span>
          {lastTest ? (
            <>
              <strong className="db-stat-value">{lastTest.level}</strong>
              <span className="small muted">
                {lastTest.score}/{lastTest.total} · {d.lastTest}
              </span>
            </>
          ) : (
            <span className="small muted">{d.noTest}</span>
          )}
        </div>
      </div>

      <div className="db-grid">
        <section className="db-card db-continue">
          <h2>{d.continueTitle}</h2>
          {next && level ? (
            <Link href={`/lessons/${next.slug}`} className={`db-next lvl-${level}`}>
              <span className="lx-thumb" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aiTeacherPortrait(level)} alt="" />
                <span className="lx-play">▶</span>
              </span>
              <span className="stack" style={{ gap: 6 }}>
                <strong>
                  {t.lessons.lessonNo(nextNo)}: {lessonText(next, locale).title}
                </strong>
                <span className="small muted">
                  {level}
                  {myTeacher && ` · ${t.lessons.aiTeacher}: ${myTeacher.name}`}
                  {!ownedIds.has(next.id) && ` · ${money(LESSON_PRICE[level])}`}
                </span>
                <span className="btn gold small self-start">
                  {levelDone > 0 ? d.continueBtn : d.startBtn} →
                </span>
              </span>
            </Link>
          ) : (
            <p className="muted">{level && levelLessons.length > 0 ? d.allDone : d.noLessonsYet}</p>
          )}
        </section>

        <section className="db-card">
          <div className="row between">
            <h2>{d.aiTitle}</h2>
            <Link href="/ai-teachers" className="small">{d.aiAll} →</Link>
          </div>
          <div className="db-teachers">
            {LEVELS.filter((l) => teachers.has(l)).map((l) => {
              const tt = teachers.get(l)!;
              return (
                <Link key={l} href={`/ai-teachers?level=${l}`} className="db-teacher" aria-current={l === level ? "true" : undefined}>
                  <Avatar name={tt.name} url={aiTeacherPortrait(l)} size={l === level ? 72 : 52} />
                  <span className="small"><strong>{tt.name}</strong> · {l}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="db-card">
          <h2>{d.completedTitle}</h2>
          {results.length === 0 ? (
            <p className="muted small">{d.noCompleted}</p>
          ) : (
            <ul className="db-list">
              {results.slice(0, 6).map((r) => {
                const l = lessonById.get(r.lesson_id);
                if (!l) return null;
                const grade = gradeFor(r.best_right, r.total);
                return (
                  <li key={r.lesson_id}>
                    <Link href={`/lessons/${l.slug}`}>
                      <LevelChip level={l.level} /> <span>{lessonText(l, locale).title}</span>
                    </Link>
                    <span className={`status ${grade}`}>{t.lessons.grades[grade]}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="db-card">
          <h2>{d.testsTitle}</h2>
          {attempts.length === 0 ? (
            <p className="muted small">{d.noTest}</p>
          ) : (
            <ul className="db-list">
              {attempts.map((a) => (
                <li key={a.id}>
                  <Link href={`/test/result/${a.id}`}>
                    <LevelChip level={a.level} /> <span>{formatDateTime(a.finished_at, locale)}</span>
                  </Link>
                  <span className="small muted">{a.score}/{a.total}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/test" className="btn ghost small self-start">
            {attempts.length ? d.retake : d.takeTest}
          </Link>
        </section>
      </div>

      <section className="db-card">
        <h2>{d.materialsTitle}</h2>
        <div className="db-materials">
          {MATERIAL_LINKS.map(([href, key, icon]) => (
            <Link key={href} href={href} className="db-material">
              <span className="db-stat-icon"><Svg d={icon} /></span>
              <strong>{t.library[key]}</strong>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>

      {(SHOW_LIVE_TUTORS || bookings.length > 0) && (
      <section className="stack">
        <h2>{d.classesTitle}</h2>
      {bookings.length === 0 && (
        <div className="panel stack">
          <p className="muted">{t.dashboard.noClasses}</p>
          <Link href={user.level ? `/tutors?level=${user.level}` : "/tutors"} className="btn self-start">
            {t.dashboard.chooseTutor}
          </Link>
        </div>
      )}

      {bookings.map((b) => {
        const tutorName = b.tutors?.profiles?.full_name ?? "";
        const upcoming = b.status === "scheduled" && new Date(b.starts_at) > new Date(Date.now() - b.duration_min * 60000);
        return (
          <article key={b.id} className="panel stack">
            <div className="row between">
              <div className="row">
                <div className="ava sm">{tutorName.slice(0, 1)}</div>
                <div>
                  <h3>{tutorName}</h3>
                  <p className="small muted">
                    {formatDateTime(b.starts_at, locale)} · {durationLabel(b.duration_min, t)}
                  </p>
                </div>
              </div>
              <span className={`status ${b.status}`}>{t.dashboard.status[b.status]}</span>
            </div>
            {upcoming &&
              (b.meeting_url ? (
                <a href={b.meeting_url} target="_blank" rel="noreferrer" className="btn self-start">
                  {t.dashboard.join}
                </a>
              ) : (
                <p className="small muted">{t.dashboard.linkLater}</p>
              ))}
            {b.tutor_notes && (
              <div className="note">
                <strong className="small">{t.dashboard.tutorNote}</strong>
                <p style={{ whiteSpace: "pre-line" }}>{b.tutor_notes.note}</p>
                {b.tutor_notes.lesson_ids.length > 0 && (
                  <>
                    <span className="small muted">{t.dashboard.recommended}</span>
                    <div className="filters">
                      {b.tutor_notes.lesson_ids.map((id) => {
                        const l = lessonById.get(id);
                        if (!l) return null;
                        return (
                          <Link key={id} href={`/lessons/${l.slug}`} className="chip">
                            <LevelChip level={l.level} /> {lessonText(l, locale).title}
                            {!ownedIds.has(id) && isLevel(l.level) && ` · ${money(LESSON_PRICE[l.level])}`}
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </article>
        );
      })}

      </section>
      )}

      {(certOrders ?? []).length > 0 && (
        <div className="panel stack">
          <h3>{t.dashboard.certificates}</h3>
          {certOrders!.map((o) => (
            <p key={o.id} className="row between" style={{ gap: 10 }}>
              <span>{t.test.orderPending(paymentCode(o.id))}</span>
              <Link href={`/pay/${o.id}`} className="btn small">{t.pay.open}</Link>
            </p>
          ))}
        </div>
      )}

      {(certs ?? []).length > 0 && (
        <div className="panel stack">
          <h3>{t.dashboard.certificates}</h3>
          <div className="filters">
            {certs!.map((c) => (
              <Link key={c.code} href={`/certificate/${c.code}`} className="chip">
                <LevelChip level={c.level} /> {c.code}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
