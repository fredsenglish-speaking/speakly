import Link from "next/link";
import { FreeTabs } from "@/components/FreeTabs";
import { MaterialsLocked } from "@/components/MaterialsGate";
import { EXERCISE_KINDS } from "@/lib/exercises";
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
    <>
      <FreeTabs
        t={t}
        active="exercises"
        level={level}
        filter={access.kind === "all"}
        ownLevel={access.kind === "level" ? access.level : undefined}
      />
      <p className="muted lib-intro">{t.exercises.lead}</p>
      {levels.map((l) => {
        const list = topics.filter((x) => x.level === l);
        if (list.length === 0) return null;
        return (
          <section key={l} className={`lib-shelf lvl-${l}`}>
            <header className="lib-shelf-head">
              <span className="lib-shelf-code">{l}</span>
              <h2 lang="en">{LEVEL_NAME[l]}</h2>
              <span className="small muted">
                {t.exercises.topics(list.length)} · {t.exercises.free}
              </span>
            </header>
            <div className="lib-ex-grid">
              {list.map((x, i) => {
                const tasks = exercises.get(x.slug) ?? [];
                const kinds = EXERCISE_KINDS.map((k) => [k, tasks.filter((e) => e.kind === k).length] as const).filter(
                  ([, n]) => n > 0,
                );
                return (
                  <Link key={x.id} href={`/exercises/${x.slug}`} className="lib-ex">
                    <span className="lib-ex-top">
                      <span className="lib-ex-num">{i + 1}</span>
                      <span className="lib-badge">{l}</span>
                    </span>
                    <strong className="lib-ex-title">{lessonText(x, locale).title}</strong>
                    <span className="lib-kinds">
                      {kinds.map(([k, n]) => (
                        <span key={k} className="lib-kind">
                          {t.library.kindShort[k]} · {n}
                        </span>
                      ))}
                    </span>
                    <span className="lib-ex-foot">
                      <span className="small muted">{t.exercises.tasks(tasks.length)}</span>
                      <span className="lib-open">{t.library.open} →</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
