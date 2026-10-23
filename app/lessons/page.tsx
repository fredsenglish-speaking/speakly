import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { LevelTeacherCard } from "@/components/LevelTeacherCard";
import { getCurrentUser } from "@/lib/auth";
import { gradeFor } from "@/lib/grade";
import { LESSON_PRICE, LEVELS, LEVEL_NAME, isLevel, lessonText, money } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { LEVEL_TEACHER_COLUMNS, localIntro, type LevelTeacher } from "@/lib/levelTeachers";
import { createClient } from "@/lib/supabase/server";

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
  const ownedIds = new Set((owned ?? []).map((o) => o.lesson_id));
  const teachers = new Map(((teacherRows ?? []) as LevelTeacher[]).map((x) => [x.level, x]));
  const results = new Map(((resultRows ?? []) as Result[]).map((r) => [r.lesson_id, r]));
  const levels = level ? [level] : LEVELS;

  return (
    <section className="stack">
      <div className="row between">
        <h2>{t.lessons.title}</h2>
        <span className="small muted">{t.lessons.structure}</span>
      </div>
      <nav className="filters" aria-label={t.common.levelFilter}>
        <Link href="/lessons" className="chip" aria-current={!level}>
          {t.common.all}
        </Link>
        {LEVELS.map((l) => (
          <Link key={l} href={`/lessons?level=${l}`} className="chip" aria-current={level === l}>
            {l} · {money(LESSON_PRICE[l])}
          </Link>
        ))}
      </nav>
      {levels.map((l) => {
        const list = (lessons ?? []).filter((x) => x.level === l);
        if (list.length === 0) return null;
        const teacher = teachers.get(l);
        const done = list.filter((x) => results.has(x.id)).length;
        return (
          <div key={l} className={`level-block lvl-${l}`}>
            <header className="level-banner">
              <div className="row" style={{ gap: 14 }}>
                <span className="level-code">{l}</span>
                <div className="stack" style={{ gap: 2 }}>
                  <h3 lang="en">{LEVEL_NAME[l]}</h3>
                  <span className="small">
                    {t.lessons.lessonsCount(list.length)} · {money(LESSON_PRICE[l])} {t.lessons.perLesson}
                  </span>
                </div>
              </div>
              {teacher && (
                <div className="row banner-teacher">
                  <Avatar name={teacher.name} url={teacher.photo_url} size={52} />
                  <div className="stack" style={{ gap: 0 }}>
                    <span className="small">{t.lessons.videoTeacherShort}</span>
                    <strong>{teacher.name}</strong>
                  </div>
                </div>
              )}
              {user && (
                <div className="level-progress">
                  <span className="small">{t.lessons.progress(done, list.length)}</span>
                  <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={list.length} aria-valuenow={done}>
                    <i style={{ width: `${(done / list.length) * 100}%` }} />
                  </div>
                </div>
              )}
            </header>
            {teacher && (
              <details className="teacher-more">
                <summary>{t.lessons.meetTeacher}</summary>
                <LevelTeacherCard
                  teacher={teacher}
                  heading={t.lessons.videoTeacher(l, teacher.name)}
                  localText={localIntro(teacher, locale)}
                  videoLabel={t.lessons.introVideo}
                  noVideo={t.common.noVideo}
                />
              </details>
            )}
            <div className="lesson-grid">
              {list.map((x, i) => {
                const text = lessonText(x, locale);
                const result = results.get(x.id);
                const grade = result ? gradeFor(result.best_right, result.total) : null;
                return (
                  <Link key={x.id} href={`/lessons/${x.slug}`} className="lesson-card">
                    <span className="lesson-num" aria-label={t.lessons.lessonNo(i + 1)}>
                      {i + 1}
                    </span>
                    <span className="stack" style={{ gap: 4, minWidth: 0 }}>
                      <strong>{text.title}</strong>
                      <span className="small muted">{text.summary}</span>
                    </span>
                    <span className="lesson-status">
                      {grade ? (
                        <span className={`status ${grade}`}>
                          ✓ {t.lessons.completed}: {t.lessons.grades[grade]}
                        </span>
                      ) : ownedIds.has(x.id) ? (
                        <span className="status owned">{t.lessons.owned}</span>
                      ) : (
                        <span className="status price">{money(LESSON_PRICE[l])}</span>
                      )}
                      <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
