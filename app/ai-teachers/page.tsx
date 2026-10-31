import Link from "next/link";
import { Video } from "@/components/Video";
import { getCurrentUser } from "@/lib/auth";
import { LEVEL_NAME, LEVELS, isLevel, type Level } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getT } from "@/lib/i18n/server";
import { LEVEL_TEACHER_COLUMNS, localIntro, type LevelTeacher } from "@/lib/levelTeachers";

export async function generateMetadata() {
  return { title: (await getT()).nav.aiTeachers };
}

// The AI avatar who presents each level; the admin page can rename them or add a photo and intro video.
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
  const [t, locale, user] = await Promise.all([getT(), getLocale(), getCurrentUser()]);
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
              <span className="hero-badge">✦ {a.badge}</span>
              <h1 className="ai-title" lang="en">
                {a.title}
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
              const intro = row ? (localIntro(row, locale) ?? row.intro) : null;
              return (
                <article key={l} className={`ai-card lvl-${l}`}>
                  <div className="ai-portrait">
                    {row?.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.photo_url} alt={`${name}, ${a.aiLabel}`} loading="lazy" />
                    ) : (
                      <span className="ai-monogram" aria-hidden="true">
                        {name.slice(0, 1)}
                      </span>
                    )}
                    <span className="ai-badge" title={a.aiLabel}>
                      {a.aiBadge}
                    </span>
                    <span className="ai-level">{l}</span>
                  </div>
                  <div className="ai-body">
                    <h2 className="ai-name">{name}</h2>
                    <span className="ai-meta">
                      {a.aiLabel} · <span lang="en">{l} {LEVEL_NAME[l]}</span>
                    </span>
                    <p className="ai-tagline">{a.taglines[l]}</p>
                    {row?.video_url && (
                      <details className="ai-intro">
                        <summary>▶ {a.watchIntro}</summary>
                        <Video url={row.video_url} title={`${name} · ${l}`} emptyText={t.common.noVideo} />
                        {intro && (
                          <p className="small" lang={localIntro(row, locale) ? undefined : "en"}>
                            {intro}
                          </p>
                        )}
                      </details>
                    )}
                    <Link href={`/lessons?level=${l}`} className="btn gold ai-start">
                      <span lang="en">{a.start}</span> <span aria-hidden="true">→</span>
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
