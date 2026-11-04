import Link from "next/link";
import { CERTIFICATE_PRICE, LESSON_PRICE, LEVEL_PRICE, LEVELS, PRACTICE_MINUTES, PRACTICE_PRICE, money } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { whatsappDigits } from "@/lib/whatsapp";

export async function generateMetadata() {
  const a = DICTIONARIES[await getLocale()].about;
  return {
    title: a.seoTitle,
    description: a.seoDescription,
    alternates: { canonical: "/about" },
    openGraph: { title: `${a.seoTitle} | Speakly AI`, description: a.seoDescription, url: "/about" },
  };
}

const ICONS = [
  "M4 20V14M10 20V9M16 20V12M22 20V4M3 20h20", // test
  "M12 3a6 6 0 1 1 0 12a6 6 0 0 1 0-12Zm-3.5 10.5L7 21l5-2.5 5 2.5-1.5-7.5", // certificate
  "M3 6h13v12H3V6Zm13 4 5-3v10l-5-3", // video lessons
  "M4 5h16v11H9l-5 4V5Zm4 5h.01M12 10h.01M16 10h.01", // speaking club
  "M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1V5Zm9 1v14", // materials
];
// Same order as about.offers: test, certificate, AI video teachers, lessons, speaking club, free materials.
const OFFER_ICONS = [ICONS[0], ICONS[1], ICONS[2], "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h11M9 8h6", ICONS[3], ICONS[4]];
const LINKS = ["/test", "/test", "/ai-teachers", "/lessons", "/practice", "/exercises"];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default async function AboutPage() {
  const t = DICTIONARIES[await getLocale()];
  const a = t.about;
  const offers = a.offers({
    cert: money(CERTIFICATE_PRICE),
    club: money(PRACTICE_PRICE),
    min: PRACTICE_MINUTES,
    lesson: money(Math.min(...LEVELS.map((l) => LESSON_PRICE[l]))),
    level: money(Math.min(...LEVELS.map((l) => LEVEL_PRICE[l]))),
  });
  const wa = whatsappDigits(process.env.WHATSAPP_NUMBER);

  return (
    <>
      <section className="ab-hero">
        <div className="ab-inner">
          <span className="kicker">{a.kicker}</span>
          <h1 className="ab-title">{a.heroTitle}</h1>
          <p className="ab-lead">{a.lead}</p>
          <ul className="ab-facts">
            {a.facts.map(([value, label]) => (
              <li key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="home-section ab-text">
        <h2>{a.whoTitle}</h2>
        {a.who.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      <section className="home-section">
        <h2>{a.offerTitle}</h2>
        <div className="ab-offers">
          {offers.map(([title, text], i) => (
            <Link key={title} href={LINKS[i]} className="service-card">
              <span className="service-icon">
                <Icon d={OFFER_ICONS[i]} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Link>
          ))}
        </div>
        <aside className="ab-cert-note" aria-labelledby="ab-cert-note">
          <span className="service-icon">
            <Icon d={ICONS[1]} />
          </span>
          <div>
            <h3 id="ab-cert-note">{a.certNoteTitle}</h3>
            <p>{a.certNote(money(CERTIFICATE_PRICE))}</p>
          </div>
        </aside>
      </section>

      <section className="home-section ab-text">
        <h2>{a.missionTitle}</h2>
        {a.mission.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      <section className="home-section ab-contact">
        <div>
          <h2>{a.ctaTitle}</h2>
          <p>{a.ctaText}</p>
          <p>
            <Link href="/faq" className="ab-faq-link">
              {t.faq.nav} →
            </Link>
          </p>
        </div>
        <div className="row">
          <Link href="/test" className="btn gold">
            {a.ctaTest} →
          </Link>
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="btn hero-ghost">
              {a.ctaWhatsapp}
            </a>
          )}
        </div>
      </section>
    </>
  );
}
