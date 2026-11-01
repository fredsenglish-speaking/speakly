import Link from "next/link";
import { CertificateCard } from "@/components/CertificateCard";
import { getT } from "@/lib/i18n/server";
import { CERTIFICATE_PRICE, LESSON_PRICE, LEVEL_NAME, LEVEL_PRICE, LEVELS, PRACTICE_MINUTES, PRACTICE_PRICE, levelSaving, money, type Level } from "@/lib/levels";
import { siteHost } from "@/lib/siteHost";
import { createClient } from "@/lib/supabase/server";

/** How many lessons each level has, so the cards can say how much the whole level saves. */
async function lessonCounts(): Promise<Map<Level, number>> {
  try {
    const { data } = await (await createClient()).from("lessons").select("level");
    const counts = new Map<Level, number>();
    for (const row of (data ?? []) as { level: Level }[]) counts.set(row.level, (counts.get(row.level) ?? 0) + 1);
    return counts;
  } catch {
    return new Map();
  }
}


// Simple line icons for the perks strip and the service cards, drawn in the current text colour.
const ICONS = {
  teacher: "M12 3a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V8a5 5 0 0 1 5-5Zm-7 18a7 7 0 0 1 14 0",
  chart: "M4 20V14M10 20V9M16 20V12M22 20V4M3 20h20",
  chat: "M4 5h16v11H9l-5 4V5Zm4 5h.01M12 10h.01M16 10h.01",
  book: "M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1V5Zm9 1v14",
  video: "M3 6h13v12H3V6Zm13 4 5-3v10l-5-3",
  award: "M12 3a6 6 0 1 1 0 12a6 6 0 0 1 0-12Zm-3.5 10.5L7 21l5-2.5 5 2.5-1.5-7.5",
  check: "M4 12.5 9.5 18 20 6",
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default async function HomePage() {
  const t = await getT();
  const h = t.home;
  const [counts, host] = await Promise.all([lessonCounts(), siteHost()]);
  const today = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Baku" }).format(new Date());
  const steps = [
    [h.s1Title, h.s1Text(money(CERTIFICATE_PRICE))],
    [h.s2Title, h.s2Text],
    [h.s3Title, h.s3Text],
    [h.s4Title, h.s4Text],
  ];
  // The free level test and the certificate come first; AI teachers are the second service.
  const perkIcons = [ICONS.chart, ICONS.award, ICONS.teacher, ICONS.chat];
  const perkLinks = ["/test", "/test", "/ai-teachers", "/practice"];
  const serviceIcons = [ICONS.award, ICONS.teacher, ICONS.chat, ICONS.book];
  const serviceLinks = ["/test", "/ai-teachers", "/practice", "/exercises"];
  // One sentence per line; the last one in gold: "Your level." / "Your AI teacher." / "<gold>Your learning pace.</gold>"
  const lines = h.title.split(/(?<=\.)\s+/);

  return (
    <>
      <section className="hero-banner">
        <div className="hero-photo" aria-hidden="true" />
        <div className="hero-copy">
          <span className="hero-badge">✦ {h.badge}</span>
          <h1 className="hero-title">
            {lines.map((line, i) => (
              <span key={i} className={i === lines.length - 1 ? "hero-line hero-accent" : "hero-line"}>
                {line}
                {/* A real space, so copied text and search engines read "səviyyəniz. Sizin". */}
                {i < lines.length - 1 && " "}
              </span>
            ))}
          </h1>
          <p className="hero-lead">{h.lead}</p>
          <ul className="hero-points">
            {h.heroPoints(money(CERTIFICATE_PRICE)).map((p) => (
              <li key={p}>
                <span className="hero-point-icon"><Icon d={ICONS.check} /></span>
                {p}
              </li>
            ))}
          </ul>
          <div className="row hero-actions">
            <Link href="/test" className="btn gold hero-cta">
              {h.heroCta} <span aria-hidden="true">→</span>
            </Link>
            <Link href="/ai-teachers" className="btn hero-ghost">
              {h.heroCta2}
            </Link>
          </div>
        </div>
        <div className="hero-perks">
          {h.perks.map(([title, text], i) => (
            <Link key={title} href={perkLinks[i]} className="hero-perk">
              <Icon d={perkIcons[i]} />
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <header className="section-head">
          <span className="kicker">{h.levelsKicker}</span>
          <h2>{h.levelsTitle}</h2>
          <p className="muted">{h.levelsLead}</p>
        </header>
        <div className="level-cards">
          {LEVELS.map((l) => {
            const saving = levelSaving(l, counts.get(l) ?? 0);
            return (
              <Link key={l} href={`/lessons?level=${l}`} className={`level-card lvl-${l}`}>
                <span className="level-card-code">{l}</span>
                <span className="level-card-name" lang="en">
                  {LEVEL_NAME[l]}
                </span>
                <span className="level-card-price">
                  <strong>{money(LEVEL_PRICE[l])}</strong>
                  <small>{t.lessons.wholeLevel}</small>
                </span>
                <span className="level-card-or">{h.levelOr(money(LESSON_PRICE[l]))}</span>
                {saving && <span className="level-card-save">{h.levelSave(saving)}</span>}
                <span className="level-card-cta">{h.levelCta} →</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="home-section home-cert">
        <div className="home-cert-copy">
          <span className="kicker">{h.certKicker}</span>
          <h2>{h.certTitle}</h2>
          <p className="muted">{h.certText}</p>
          <Link href="/test" className="btn gold">
            {h.certCta} →
          </Link>
        </div>
        <div className="home-cert-sample">
          <CertificateCard name="Your Name" level="B2" issued={today} code="SPK-B2-SAMPLE" verifyUrl={`${host}/certificate`} sample />
        </div>
      </section>

      <section className="home-section">
        <header className="section-head">
          <span className="kicker">{h.servicesKicker}</span>
          <h2>{h.servicesTitle}</h2>
        </header>
        <div className="service-cards">
          {h.services.map(([title, text], i) => (
            <Link key={title} href={serviceLinks[i]} className="service-card">
              <span className="service-icon">
                <Icon d={serviceIcons[i]} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
              {serviceLinks[i] === "/practice" ? (
                <>
                  <span className="service-price">{h.clubPrice(money(PRACTICE_PRICE), PRACTICE_MINUTES)}</span>
                  <span className="btn small service-btn">{h.clubCta} →</span>
                </>
              ) : (
                <span className="service-more">{h.more} →</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>{h.howItWorks}</h2>
        <div className="steps">
          {steps.map(([title, text], i) => (
            <div className="step" key={i}>
              <b>
                {h.step} {i + 1}
              </b>
              <h3>{title}</h3>
              <p className="small muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
