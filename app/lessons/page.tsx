import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { getCurrentUser } from "@/lib/auth";
import { LESSON_PRICE, LEVELS, isLevel, lessonText, money } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].lessons.title };
}

export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const params = await searchParams;
  const level = isLevel(params.level) ? params.level : null;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const supabase = await createClient();
  const [{ data: lessons }, { data: owned }] = await Promise.all([
    supabase.from("lessons").select("id, slug, level, title, summary, title_en, title_ru, summary_en, summary_ru").order("level").order("position"),
    user
      ? supabase.from("lesson_purchases").select("lesson_id").eq("student_id", user.id)
      : Promise.resolve({ data: [] as { lesson_id: number }[] }),
  ]);
  const ownedIds = new Set((owned ?? []).map((o) => o.lesson_id));
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
        return (
          <div key={l} className="stack" style={{ gap: 10 }}>
            <h3 className="row" style={{ gap: 8 }}>
              <LevelChip level={l} /> {t.lessons.levelHeading}
            </h3>
            <div className="lessons">
              {list.map((x) => (
                <div key={x.id} className="panel lesson">
                  <div className="stack">
                    <strong>{lessonText(x, locale).title}</strong>
                    <span className="small muted">{lessonText(x, locale).summary}</span>
                  </div>
                  <Link href={`/lessons/${x.slug}`} className={ownedIds.has(x.id) ? "btn ghost" : "btn"}>
                    {ownedIds.has(x.id) ? t.lessons.open : money(LESSON_PRICE[l])}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
