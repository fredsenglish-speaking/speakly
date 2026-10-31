import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { LevelTeacherCard } from "@/components/LevelTeacherCard";
import { getCurrentUser } from "@/lib/auth";
import { gradeFor } from "@/lib/grade";
import { SubmitButton } from "@/components/SubmitButton";
import { LESSON_PRICE, LEVEL_PRICE, LEVELS, LEVEL_NAME, isLevel, lessonText, money, type Level } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { LEVEL_TEACHER_COLUMNS, localIntro, type LevelTeacher } from "@/lib/levelTeachers";
import { createClient } from "@/lib/supabase/server";
import { buyLevel } from "./actions";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].lessons.title };
}

type Result = { lesson_id: number; best_right: number; total: number };

export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const params = await searchParams;
  const level = isLevel(params.level) ? params.level : null;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const supabase = await createClient();
  const [{ data: lessons }, { data: owned }, { data: teacherRows }, { data: resultRows }] = await Promise.all([
    supabase.from("lessons").select("id, slug, level, title, summary, title_en, title_ru, summary_en, summary_ru").order("level").order("position"),
    user
      ? supabase.from("lesson_purchases").select("lesson_id").eq("student_id", user.id)
      : Promise.resolve({ data: [] as { lesson_id: number }[] }),
    supabase.from("level_teachers").select(LEVEL_TEACHER_COLUMNS),
    // Before migration 0008 runs the table is missing; the page then just shows no results.
    user
      ? supabase.from("lesson_results").select("lesson_id, best_right, total").eq("student_id", user.id)
      : Promise.resolve({ data: [] as Result[] }),
  ]);
  const ownedIds = new Set(
    user?.role === "admin" ? (lessons ?? []).map((x) => x.id) : (owned ?? []).map((o) => o.lesson_id),
  );
  const teachers = new Map(((teacherRows ?? []) as LevelTeacher[]).map((x) => [x.level, x]));
  const results = new Map(((resultRows ?? []) as Result[]).map((r) => [r.lesson_id, r]));
  // One level at a time: the one the visitor picked, else their own level, else A1.
  const current: Level = level ?? (isLevel(user?.level) ? user.level : "A1");
  const list = (lessons ?? []).filter((x) => x.level === current);
  const teacher = teachers.get(current);
  const done = list.filter((x) => results.has(x.id)).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;
  const counts = new Map(LEVELS.map((l) => [l, (lessons ?? []).filter((x) => x.level === l).length]));

  return (
    <>
      <section className="lx-hero">
        <div className="lx-inner">
          <header className="lx-head">
            <h1 className="lx-title">{t.lessons.title}</h1>
            <p className="lx-lead">{t.lessons.lead}</p>
          </header>
          <nav className="lx-levels" aria-label={t.common.levelFilter}>
            {LEVELS.map((l) => (
              <Link
                key={l}
                href={`/lessons?level=${l}#plan`}
                className={`lx-level lvl-${l}`}
                aria-current={current === l}
              >
                <span className="lx-level-code">{l}</span>
                <span className="lx-level-name">{t.lessons.levelLocal[l]}</span>
                <span className="lx-level-meta">
                  {t.lessons.lessonsCount(counts.get(l) ?? 0)} · {money(LESSON_PRICE[l])}
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section id="plan" className={`lx-plan lvl-${current}`}>
        <header className="lx-plan-head">
          <div className="stack" style={{ gap: 6 }}>
            <h2>{t.lessons.planTitle(current)}</h2>
            <span className="small muted">
              <span lang="en">{LEVEL_NAME[current]}</span> · {money(LESSON_PRICE[current])} {t.lessons.perLesson} ·{" "}
              {money(LEVEL_PRICE[current])} {t.lessons.wholeLevel}
            </span>
          </div>
          {user ? (
            <div className="lx-progress">
              <span className="small">{t.lessons.progressPct(done, list.length, pct)}</span>
              <div className="lx-bar" role="progressbar" aria-valuemin={0} aria-valuemax={list.length} aria-valuenow={done}>
                <i style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(`/lessons?level=${current}`)}`} className="small">
              {t.lessons.loginProgress}
            </Link>
          )}
        </header>

        <div className="lx-plan-bar">
          {teacher && (
            <Link href={`/ai-teachers?level=${current}`} className="lx-teacher">
              <Avatar name={teacher.name} url={teacher.photo_url} size={46} />
              <span className="stack" style={{ gap: 0 }}>
                <span className="small muted">
                  <span className="ai-badge inline">AI</span>
                  {t.lessons.aiTeacher}
                </span>
                <strong>{teacher.name}</strong>
              </span>
            </Link>
          )}
          {list.length > 0 && !list.every((x) => ownedIds.has(x.id)) && (
            <form action={buyLevel}>
              <input type="hidden" name="level" value={current} />
              <SubmitButton>{t.lessons.buyLevel(current, money(LEVEL_PRICE[current]))}</SubmitButton>
            </form>
          )}
        </div>

        {teacher && (
          <details className="teacher-more">
            <summary>{t.lessons.meetTeacher}</summary>
            <LevelTeacherCard
              teacher={teacher}
              heading={t.lessons.videoTeacher(current, teacher.name)}
              localText={localIntro(teacher, locale)}
              videoLabel={t.lessons.introVideo}
              noVideo={t.common.noVideo}
            />
          </details>
        )}

        <ol className="lx-list">
          {list.map((x, i) => {
            const text = lessonText(x, locale);
            const result = results.get(x.id);
            const grade = result ? gradeFor(result.best_right, result.total) : null;
            const owned = ownedIds.has(x.id);
            return (
              <li key={x.id}>
                <Link href={`/lessons/${x.slug}`} className="lx-row">
                  <span className="lx-thumb" aria-hidden="true">
                    {teacher?.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={teacher.photo_url} alt="" loading="lazy" />
                    )}
                    <span className="lx-play">▶</span>
                  </span>
                  <span className="lx-main">
                    <strong className="lx-name">
                      {t.lessons.lessonNo(i + 1)}: {text.title}
                    </strong>
                    {teacher && (
                      <span className="small muted">
                        {t.lessons.aiTeacher}: {teacher.name}
                      </span>
                    )}
                    <span className="lx-parts">
                      {t.lessons.parts.map((part) => (
                        <span key={part} className="lx-part">
                          {part}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="lx-state">
                    {grade ? (
                      <>
                        <span className="lx-check done" aria-hidden="true">✓</span>
                        <span className={`status ${grade}`}>
                          {t.lessons.completed}: {t.lessons.grades[grade]}
                        </span>
                      </>
                    ) : owned ? (
                      <>
                        <span className="lx-check" aria-hidden="true" />
                        <span className="status owned">{t.lessons.owned}</span>
                      </>
                    ) : (
                      <>
                        <span className="lx-check locked" aria-hidden="true">🔒</span>
                        <span className="status price">{money(LESSON_PRICE[current])}</span>
                      </>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
