import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LevelChip } from "@/components/LevelChip";
import { MaterialsLocked } from "@/components/MaterialsGate";
import { exercisesFor } from "@/lib/exerciseTopics";
import { isLevel, lessonText } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { materialsAccess } from "@/lib/materials";
import { createClient } from "@/lib/supabase/server";
import { ExercisePlayer } from "./ExercisePlayer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("title, title_en, title_ru").eq("slug", slug).maybeSingle();
  const t = DICTIONARIES[locale].exercises;
  return { title: lesson ? `${t.title}: ${lessonText(lesson, locale).title}` : t.title };
}

export default async function ExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const access = await materialsAccess();
  if (access.kind === "locked") return <MaterialsLocked t={t} active="exercises" />;
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("slug, level, title, summary, title_en, title_ru, summary_en, summary_ru")
    .eq("slug", slug)
    .maybeSingle();
  const tasks = exercisesFor(slug);
  if (!lesson || !isLevel(lesson.level) || tasks.length === 0) notFound();
  // Students only get the exercises of their own level.
  if (access.kind === "level" && lesson.level !== access.level) redirect("/exercises");
  const text = lessonText(lesson, locale);

  return (
    <section className="stack">
      <Link href={`/exercises?level=${lesson.level}`} className="btn ghost self-start">
        {t.exercises.back}
      </Link>
      <div className="row" style={{ gap: 10 }}>
        <LevelChip level={lesson.level} />
        <h2>{text.title}</h2>
        <span className="status">{t.exercises.free}</span>
      </div>
      <ExercisePlayer tasks={tasks} />
      <div className="panel row between">
        <span>{t.exercises.lessonCta}</span>
        <Link href={`/lessons/${lesson.slug}`} className="btn ghost">
          {t.exercises.openLesson}
        </Link>
      </div>
    </section>
  );
}
