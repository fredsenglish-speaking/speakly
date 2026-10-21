import Link from "next/link";
import { notFound } from "next/navigation";
import { LevelChip } from "@/components/LevelChip";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentUser } from "@/lib/auth";
import { LESSON_PRICE, isLevel, money } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";
import { buyLesson } from "../actions";
import { LessonPlayer } from "./LessonPlayer";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, slug, level, title, summary, explanation_video_url, subtitled_video_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!lesson || !isLevel(lesson.level)) notFound();

  const { data: purchase } = user
    ? await supabase
        .from("lesson_purchases")
        .select("lesson_id")
        .eq("student_id", user.id)
        .eq("lesson_id", lesson.id)
        .maybeSingle()
    : { data: null };

  const head = (
    <>
      <Link href={`/lessons?level=${lesson.level}`} className="btn ghost self-start">
        ← Lessons
      </Link>
      <div className="row" style={{ gap: 10 }}>
        <LevelChip level={lesson.level} />
        <h2>{lesson.title}</h2>
      </div>
    </>
  );

  if (!purchase) {
    return (
      <section className="stack">
        {head}
        <div className="panel stack narrow">
          <p>{lesson.summary}</p>
          <p>Bu lesson 4 hissədən ibarətdir:</p>
          <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>
            <li>Müəllimin izahı (video)</li>
            <li>Practice test</li>
            <li>Müəllimin izahı, subtitrlə</li>
            <li>Practice test</li>
          </ol>
          <div className="row between">
            <span>Qiymət ({lesson.level})</span>
            <span className="price total">{money(LESSON_PRICE[lesson.level])}</span>
          </div>
          <form action={buyLesson}>
            <input type="hidden" name="slug" value={lesson.slug} />
            <SubmitButton>{user ? "Lesson-u al" : "Daxil ol və al"}</SubmitButton>
          </form>
        </div>
      </section>
    );
  }

  // Readable only after purchase (row level security).
  const { data: questions } = await supabase
    .from("lesson_questions")
    .select("id, part, question, options, correct")
    .eq("lesson_id", lesson.id)
    .order("position");

  return (
    <section className="stack">
      {head}
      <LessonPlayer
        title={lesson.title}
        explanationUrl={lesson.explanation_video_url}
        subtitledUrl={lesson.subtitled_video_url}
        questions={questions ?? []}
      />
    </section>
  );
}
