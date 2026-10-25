import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";

const TABS = [
  ["exercises", "/exercises"],
  ["books", "/books"],
  ["films", "/films"],
] as const;

/** The three parts of the free section: exercises, books and films. */
export function FreeTabs({ t, active, level }: { t: Dictionary; active: (typeof TABS)[number][0]; level?: string | null }) {
  const label = { exercises: t.library.exercisesTab, books: t.library.books, films: t.library.films };
  return (
    <div className="stack" style={{ gap: 10 }}>
      <h2>
        {t.library.hub} <span className="status">{t.exercises.free}</span>
      </h2>
      <nav className="free-tabs" aria-label={t.library.hub}>
        {TABS.map(([key, href]) => (
          <Link key={key} href={level ? `${href}?level=${level}` : href} aria-current={key === active ? "page" : undefined}>
            {label[key]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
