import Link from "next/link";
import { FreeTabs } from "@/components/FreeTabs";
import { MaterialsLocked, YourLevelNote } from "@/components/MaterialsGate";
import { allExercises } from "@/lib/exerciseTopics";
import { LEVELS, LEVEL_NAME, isLevel, lessonText } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { materialsAccess } from "@/lib/materials";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].exercises.title };
}

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const access = await materialsAccess();
  if (access.kind === "locked") return <MaterialsLocked t={t} active="exercises" />;
  const level = access.kind === "level" ? access.level : isLevel(params.level) ? params.level : null;
  const supabase = await createClient();
  // Topic names come from the lessons, so the exercises follow the lesson list.
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, slug, level, title, summary, title_en, title_ru, summary_en, summary_ru")
    .order("level")
    .order("position");
  const exercises = allExercises();
  const topics = (lessons ?? []).filter((x) => exercises.has(x.slug));
  const levels = level ? [level] : LEVELS;

  return (
    <section className="stack">
      <FreeTabs t={t} active="exercises" level={level} />
      <p className="muted" style={{ maxWidth: "70ch" }}>
        {t.exercises.lead}
      </p>
      {access.kind === "level" ? (
        <YourLevelNote t={t} level={access.level} />
      ) : (
        <nav className="filters" aria-label={t.common.levelFilter}>
          <Link href="/exercises" className="chip" aria-current={!level}>
            {t.common.all}
          </Link>
          {LEVELS.map((l) => (
            <Link key={l} href={`/exercises?level=${l}`} className="chip" aria-current={level === l}>
              {l}
            </Link>
          ))}
        </nav>
      )}
      {levels.map((l) => {
        const list = topics.filter((x) => x.level === l);
        if (list.length === 0) return null;
        return (
          <div key={l} className={`level-block lvl-${l}`}>
            <header className="level-banner">
              <div className="row" style={{ gap: 14 }}>
                <span className="level-code">{l}</span>
                <div className="stack" style={{ gap: 2 }}>
                  <h3 lang="en">{LEVEL_NAME[l]}</h3>
                  <span className="small">
                    {t.exercises.topics(list.length)} · {t.exercises.free}
                  </span>
                </div>
              </div>
            </header>
            <div className="lesson-grid">
              {list.map((x, i) => (
                <Link key={x.id} href={`/exercises/${x.slug}`} className="lesson-card">
                  <span className="lesson-num">{i + 1}</span>
                  <span className="stack" style={{ gap: 4, minWidth: 0 }}>
                    <strong>{lessonText(x, locale).title}</strong>
                    <span className="small muted">{t.exercises.tasks(exercises.get(x.slug)?.length ?? 0)}</span>
                  </span>
                  <span className="lesson-status">
                    <span className="status">{t.exercises.free}</span>
                    <span aria-hidden="true">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
