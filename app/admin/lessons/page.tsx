import Link from "next/link";
import { redirect } from "next/navigation";
import { LevelChip } from "@/components/LevelChip";
import { requireUser } from "@/lib/auth";
import { LEVELS, lessonText } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VideoForm } from "./VideoForm";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].admin.videos };
}

export default async function LessonVideosPage() {
  const user = await requireUser("/admin/lessons");
  if (user.role !== "admin") redirect("/");
  const locale = await getLocale();
  const t = DICTIONARIES[locale].admin;
  const { data } = await createAdminClient()
    .from("lessons")
    .select("id, level, title, title_en, title_ru, explanation_video_url")
    .order("level")
    .order("position");
  const lessons = data ?? [];
  const withVideo = lessons.filter((l) => l.explanation_video_url).length;

  return (
    <section className="stack">
      <Link href="/admin" className="small">← {t.title}</Link>
      <h2>{t.videos}</h2>
      <p className="muted">{t.videosIntro}</p>
      <p className="small">{t.videoCount(withVideo, lessons.length)}</p>
      {LEVELS.map((level) => (
        <details key={level} className="panel stack">
          <summary className="row" style={{ cursor: "pointer" }}>
            <LevelChip level={level} />
            <span className="small muted">
              {lessons.filter((l) => l.level === level && l.explanation_video_url).length} /{" "}
              {lessons.filter((l) => l.level === level).length}
            </span>
          </summary>
          <div className="stack" style={{ marginTop: 14 }}>
            {lessons
              .filter((l) => l.level === level)
              .map((l) => (
                <VideoForm
                  key={l.id}
                  lessonId={l.id}
                  title={lessonText(l, locale).title}
                  main={l.explanation_video_url}
                />
              ))}
          </div>
        </details>
      ))}
    </section>
  );
}
