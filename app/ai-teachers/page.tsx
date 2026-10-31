import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LEVEL_NAME, LEVELS, isLevel, type Level } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { LEVEL_TEACHER_COLUMNS, aiTeacherPortrait, type LevelTeacher } from "@/lib/levelTeachers";

export async function generateMetadata() {
  return { title: (await getT()).nav.aiTeachers };
}

// The AI avatar who presents each level; the admin page can rename them.
const DEFAULT_NAMES: Record<Level, string> = {
  A1: "Nicole",
  A2: "Daniel",
  B1: "Emma",
  B2: "George",
  C1: "Margaret",
  C2: "Edward",
};

export default async function AiTeachersPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const params = await searchParams;
  const level = isLevel(params.level) ? params.level : null;
  const [t, user] = await Promise.all([getT(), getCurrentUser()]);
  const a = t.aiTeachers;

  const supabase = await createClient();
  const { data } = await supabase.from("level_teachers").select(LEVEL_TEACHER_COLUMNS);
  const rows = new Map(((data ?? []) as LevelTeacher[]).map((r) => [r.level, r]));
  const teachers = LEVELS.filter((l) => !level || l === level).map((l) => ({ level: l, row: rows.get(l) ?? null }));

  return (
    <>
      <section className="ai-page">
        <div className="ai-inner">
          <header className="ai-head">
            <div className="ai-head-copy">
              <span className="hero-badge" lang="en">✦ {a.badge}</span>
              <h1 className="ai-title" lang="en">
                Meet Your <span className="hero-accent">AI</span> English Teachers
              </h1>
              <p className="ai-lead">{a.lead}</p>
            </div>
            <div className="ai-emblem" aria-hidden="true">
              AI
            </div>
          </header>

          <nav className="ai-filters" aria-label={t.common.levelFilter}>
            <Link href="/ai-teachers" className="ai-filter" aria-current={!level}>
              {t.common.all}
            </Link>
            {LEVELS.map((l) => (
              <Link
                key={l}
                href={`/ai-teachers?level=${l}`}
                className="ai-filter"
                aria-current={level === l}
              >
                {l}
                {user?.level === l && <span className="ai-filter-you" aria-label={t.common.yourLevel} />}
              </Link>
            ))}
          </nav>

          <div className={level ? "ai-cards single" : "ai-cards"}>
            {teachers.map(({ level: l, row }) => {
              const name = row?.name || DEFAULT_NAMES[l];
              return (
                <article key={l} className={`ai-card lvl-${l}`}>
                  <div className="ai-portrait">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={aiTeacherPortrait(l)} alt={`${name}, ${a.aiLabel} ${l}`} width={600} height={667} loading="lazy" />
                    <span className="ai-badge" title={a.aiLabel}>
                      {a.aiBadge}
                    </span>
                  </div>
                  <div className="ai-body">
                    <h2 className="ai-name">{name}</h2>
                    <span className="ai-level-pill" title={`${a.aiLabel} · ${LEVEL_NAME[l]}`}>
                      {l}
                    </span>
                    <p className="ai-tagline">{a.taglines[l]}</p>
                    <Link href={`/lessons?level=${l}`} className="btn gold ai-start">
                      {a.start} <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="ai-note">
            <span className="ai-badge inline">{a.aiBadge}</span> {a.note}
          </p>
        </div>
      </section>

      <section className="panel ai-live">
        <div className="stack" style={{ gap: 6 }}>
          <h2>{a.liveTitle}</h2>
          <p className="muted">{a.liveText}</p>
        </div>
        <Link href="/tutors" className="btn">
          {a.liveCta} →
        </Link>
      </section>
    </>
  );
}
