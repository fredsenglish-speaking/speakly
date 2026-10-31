import Link from "next/link";
import { FreeTabs } from "@/components/FreeTabs";
import { MaterialsLocked, YourLevelNote } from "@/components/MaterialsGate";
import { libraryFor, libraryLink, trailerLink } from "@/lib/library";
import { LEVELS, LEVEL_NAME, isLevel } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { materialsAccess } from "@/lib/materials";

/** The Books and Films tabs: recommendations for each level, with links out. */
export async function LibraryList({ part, level: rawLevel }: { part: "books" | "films"; level?: string }) {
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const access = await materialsAccess();
  if (access.kind === "locked") return <MaterialsLocked t={t} active={part} />;
  const level = access.kind === "level" ? access.level : isLevel(rawLevel) ? rawLevel : null;
  const L = t.library;
  const path = part === "books" ? "/books" : "/films";
  const levels = level ? [level] : LEVELS;

  return (
    <section className="stack">
      <FreeTabs t={t} active={part} level={level} />
      <p className="muted" style={{ maxWidth: "70ch" }}>
        {part === "books" ? L.booksLead : L.filmsLead}
      </p>
      {access.kind === "level" ? (
        <YourLevelNote t={t} level={access.level} />
      ) : (
        <nav className="filters" aria-label={t.common.levelFilter}>
          <Link href={path} className="chip" aria-current={!level}>
            {t.common.all}
          </Link>
          {LEVELS.map((l) => (
            <Link key={l} href={`${path}?level=${l}`} className="chip" aria-current={level === l}>
              {l}
            </Link>
          ))}
        </nav>
      )}
      {levels.map((l) => {
        const list = libraryFor(l, part);
        return (
          <div key={l} className={`level-block lvl-${l}`}>
            <header className="level-banner">
              <div className="row" style={{ gap: 14 }}>
                <span className="level-code">{l}</span>
                <div className="stack" style={{ gap: 2 }}>
                  <h3 lang="en">{LEVEL_NAME[l]}</h3>
                  <span className="small">{part === "books" ? L.countBooks(list.length) : L.countFilms(list.length)}</span>
                </div>
              </div>
            </header>
            <div className="lesson-grid">
              {list.map((x) => (
                <article key={x.title} className="media-card">
                  <span className="media-kind">
                    {x.kind === "book" ? "📖" : "🎬"} {L[x.kind]}
                  </span>
                  <strong lang="en">{x.title}</strong>
                  <span className="small muted" lang="en">
                    {x.by}
                  </span>
                  <p className="small" style={{ margin: 0 }}>
                    {x.about[locale]}
                  </p>
                  {x.graded && <span className="small muted">{L.graded}</span>}
                  <span className="row media-links">
                    {x.free && (
                      <a href={x.free} target="_blank" rel="noopener noreferrer" className="btn small">
                        {L.freeText}
                      </a>
                    )}
                    {x.kind !== "book" && (
                      <a href={trailerLink(x)} target="_blank" rel="noopener noreferrer" className="btn small">
                        {L.trailer}
                      </a>
                    )}
                    <a href={libraryLink(x)} target="_blank" rel="noopener noreferrer" className="btn ghost small">
                      {L.more}
                    </a>
                  </span>
                </article>
              ))}
            </div>
          </div>
        );
      })}
      <p className="small muted" style={{ maxWidth: "70ch" }}>
        {L.note}
      </p>
    </section>
  );
}
