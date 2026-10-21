import Link from "next/link";
import { notFound } from "next/navigation";
import { LevelChip } from "@/components/LevelChip";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentUser } from "@/lib/auth";
import { LESSON_PRICE, isLevel, lessonText, money } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { buyLesson } from "../actions";
import { LessonPlayer } from "./LessonPlayer";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, slug, level, title, summary, title_en, title_ru, summary_en, summary_ru, explanation_video_url, subtitled_video_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!lesson || !isLevel(lesson.level)) notFound();
  const text = lessonText(lesson, locale);

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
        {t.lessons.back}
      </Link>
      <div className="row" style={{ gap: 10 }}>
        <LevelChip level={lesson.level} />
        <h2>{text.title}</h2>
      </div>
    </>
  );

  if (!purchase) {
    return (
      <section className="stack">
        {head}
        <div className="panel stack narrow">
          <p>{text.summary}</p>
          <p>{t.lessons.consistsOf}</p>
          <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>
            <li>{t.lessons.part1}</li>
            <li>{t.lessons.part2}</li>
            <li>{t.lessons.part3}</li>
            <li>{t.lessons.part4}</li>
          </ol>
          <div className="row between">
            <span>
              {t.common.price} ({lesson.level})
            </span>
            <span className="price total">{money(LESSON_PRICE[lesson.level])}</span>
          </div>
          <form action={buyLesson}>
            <input type="hidden" name="slug" value={lesson.slug} />
            <SubmitButton>{user ? t.lessons.buy : t.lessons.loginBuy}</SubmitButton>
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
        title={text.title}
        explanationUrl={lesson.explanation_video_url}
        subtitledUrl={lesson.subtitled_video_url}
        questions={questions ?? []}
      />
    </section>
  );
}
