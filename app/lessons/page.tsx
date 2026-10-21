import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { getCurrentUser } from "@/lib/auth";
import { LESSON_PRICE, LEVELS, isLevel, money } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Lessons" };

export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const params = await searchParams;
  const level = isLevel(params.level) ? params.level : null;
  const user = await getCurrentUser();
  const supabase = await createClient();
  const [{ data: lessons }, { data: owned }] = await Promise.all([
    supabase.from("lessons").select("id, slug, level, title, summary").order("level").order("position"),
    user
      ? supabase.from("lesson_purchases").select("lesson_id").eq("student_id", user.id)
      : Promise.resolve({ data: [] as { lesson_id: number }[] }),
  ]);
  const ownedIds = new Set((owned ?? []).map((o) => o.lesson_id));
  const levels = level ? [level] : LEVELS;

  return (
    <section className="stack">
      <div className="row between">
        <h2>Lessons</h2>
        <span className="small muted">Hər lesson: izah videosu, test, subtitrli izah, test</span>
      </div>
      <nav className="filters" aria-label="Səviyyə filtri">
        <Link href="/lessons" className="chip" aria-current={!level}>
          Hamısı
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
              <LevelChip level={l} /> səviyyəsi
            </h3>
            <div className="lessons">
              {list.map((x) => (
                <div key={x.id} className="panel lesson">
                  <div className="stack">
                    <strong>{x.title}</strong>
                    <span className="small muted">{x.summary}</span>
                  </div>
                  <Link href={`/lessons/${x.slug}`} className={ownedIds.has(x.id) ? "btn ghost" : "btn"}>
                    {ownedIds.has(x.id) ? "Aç" : money(LESSON_PRICE[l])}
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
