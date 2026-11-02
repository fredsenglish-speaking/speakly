import Link from "next/link";
import { CERTIFICATE_PRICE, LESSON_PRICE, LEVEL_PRICE, LEVELS, PRACTICE_MINUTES, PRACTICE_PRICE, money } from "@/lib/levels";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { whatsappDigits } from "@/lib/whatsapp";

export async function generateMetadata() {
  const a = DICTIONARIES[await getLocale()].about;
  return { title: a.nav, description: a.lead };
}

const ICONS = [
  "M4 20V14M10 20V9M16 20V12M22 20V4M3 20h20", // test
  "M12 3a6 6 0 1 1 0 12a6 6 0 0 1 0-12Zm-3.5 10.5L7 21l5-2.5 5 2.5-1.5-7.5", // certificate
  "M3 6h13v12H3V6Zm13 4 5-3v10l-5-3", // video lessons
  "M4 5h16v11H9l-5 4V5Zm4 5h.01M12 10h.01M16 10h.01", // speaking club
  "M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1V5Zm9 1v14", // materials
  "M12 3a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V8a5 5 0 0 1 5-5Zm-7 18a7 7 0 0 1 14 0", // account
];
const LINKS = ["/test", "/test", "/lessons", "/practice", "/exercises", "/dashboard"];

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

      <section className="home-section ab-mission">
        <h2>{a.missionTitle}</h2>
        {a.mission.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      <section className="home-section">
        <h2>{a.offerTitle}</h2>
        <div className="ab-offers">
          {offers.map(([title, text], i) => (
            <Link key={title} href={LINKS[i]} className="service-card">
              <span className="service-icon">
                <Icon d={ICONS[i]} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section ab-gains">
        <h2>{a.gainTitle}</h2>
        <ul>
          {a.gains.map((g) => (
            <li key={g}>
              <span className="hero-point-icon" aria-hidden="true">
                <Icon d="M4 12.5 9.5 18 20 6" />
              </span>
              {g}
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section">
        <h2>{a.howTitle}</h2>
        <div className="steps">
          {a.how.map(([title, text], i) => (
            <div className="step" key={title}>
              <b>
                {t.home.step} {i + 1}
              </b>
              <h3>{title}</h3>
              <p className="small muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section ab-contact">
        <div>
          <h2>{a.contactTitle}</h2>
          <p>{a.contactText}</p>
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
