import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import type { Dictionary } from "@/lib/i18n";
import { LEVELS, type Level } from "@/lib/levels";

const TABS = [
  ["exercises", "/exercises", "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"],
  ["books", "/books", "M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1V5Zm9 1v14"],
  ["films", "/films", "M3 6h18v13H3V6Zm0 4h18M7 6l2 4M12 6l2 4M17 6l2 4"],
] as const;

type Tab = (typeof TABS)[number][0];

/**
 * The library header: title, the three category cards (exercises, books, films) and,
 * for tutors and admins, a level filter. Students see the level the materials are picked for.
 */
export function FreeTabs({
  t,
  active,
  level,
  filter = false,
  ownLevel,
}: {
  t: Dictionary;
  active: Tab;
  level?: Level | null;
  filter?: boolean;
  ownLevel?: Level;
}) {
  const label = { exercises: t.library.exercisesTab, books: t.library.books, films: t.library.films };
  const path = TABS.find(([key]) => key === active)![1];
  return (
    <section className="lib-hero">
      <div className="lib-inner">
        <header className="lib-head">
          <h1 className="lib-title">{t.library.hub}</h1>
          <p className="lib-lead">{t.library.heroLead}</p>
        </header>
        <nav className="lib-cats" aria-label={t.library.hub}>
          {TABS.map(([key, href, icon]) => (
            <Link
              key={key}
              href={level && filter ? `${href}?level=${level}` : href}
              className={`lib-cat lib-cat-${key}`}
              aria-current={key === active ? "page" : undefined}
            >
              <span className="lib-cat-art" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon} />
                </svg>
              </span>
              <span className="lib-cat-text">
                <strong>{label[key]}</strong>
                <small>{t.library.catText[key]}</small>
              </span>
              <span className="lib-cat-go" aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
        {filter ? (
          <nav className="lib-levels" aria-label={t.common.levelFilter}>
            <Link href={path} className="ai-filter" aria-current={!level}>
              {t.common.all}
            </Link>
            {LEVELS.map((l) => (
              <Link key={l} href={`${path}?level=${l}`} className="ai-filter" aria-current={level === l}>
                {l}
              </Link>
            ))}
          </nav>
        ) : (
          ownLevel && (
            <p className="lib-own">
              {t.library.forYourLevel} <LevelChip level={ownLevel} />
            </p>
          )
        )}
      </div>
    </section>
  );
}
