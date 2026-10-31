import { FreeTabs } from "@/components/FreeTabs";
import { MaterialsLocked } from "@/components/MaterialsGate";
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
    <>
      <FreeTabs
        t={t}
        active={part}
        level={level}
        filter={access.kind === "all"}
        ownLevel={access.kind === "level" ? access.level : undefined}
      />
      <p className="muted lib-intro">{part === "books" ? L.booksLead : L.filmsLead}</p>
      {levels.map((l) => {
        const list = libraryFor(l, part);
        return (
          <section key={l} className={`lib-shelf lvl-${l}`}>
            <header className="lib-shelf-head">
              <span className="lib-shelf-code">{l}</span>
              <h2 lang="en">{LEVEL_NAME[l]}</h2>
              <span className="small muted">{part === "books" ? L.countBooks(list.length) : L.countFilms(list.length)}</span>
            </header>
            <div className="lib-media-grid">
              {list.map((x) => (
                <article key={x.title} className={`lib-media ${x.kind === "book" ? "is-book" : "is-film"}`}>
                  <div className="lib-cover" aria-hidden="true">
                    <span className="lib-cover-kind">{x.kind === "book" ? L.book : L[x.kind]}</span>
                    <span className="lib-cover-title" lang="en">
                      {x.title}
                    </span>
                    <span className="lib-cover-by" lang="en">
                      {x.by}
                    </span>
                    <span className="lib-badge lib-cover-level">{l}</span>
                  </div>
                  <div className="lib-media-body">
                    <strong lang="en">{x.title}</strong>
                    <span className="small muted">
                      <span lang="en">{x.by}</span> · {L[x.kind]} · {l}
                    </span>
                    <p className="small">{x.about[locale]}</p>
                    {x.graded && <span className="small lib-graded">{L.graded}</span>}
                    <span className="lib-media-links">
                      {x.free && (
                        <a href={x.free} target="_blank" rel="noopener noreferrer" className="btn small gold">
                          {L.freeText}
                        </a>
                      )}
                      {x.kind !== "book" && (
                        <a href={trailerLink(x)} target="_blank" rel="noopener noreferrer" className="btn small">
                          ▶ {L.trailer}
                        </a>
                      )}
                      <a href={libraryLink(x)} target="_blank" rel="noopener noreferrer" className="btn ghost small">
                        {L.more}
                      </a>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
      <p className="small muted lib-intro">{L.note}</p>
    </>
  );
}
