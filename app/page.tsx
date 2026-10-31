import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { getT } from "@/lib/i18n/server";
import { CERTIFICATE_PRICE, LESSON_PRICE, LEVEL_PRICE, LEVELS, money } from "@/lib/levels";

const FILL = { A1: 17, A2: 33, B1: 50, B2: 67, C1: 83, C2: 100 } as const;

export default async function HomePage() {
  const t = await getT();
  const steps = [
    [t.home.s1Title, t.home.s1Text(money(CERTIFICATE_PRICE))],
    [t.home.s2Title, t.home.s2Text],
    [t.home.s3Title, t.home.s3Text],
    [t.home.s4Title, t.home.s4Text],
  ];
  // Two lines like the banner design: "Discover your level." / "Let your potential <gold>speak.</gold>"
  const [first, second = ""] = t.home.title.split(/(?<=\.)\s+/);
  const cut = second.lastIndexOf(" ");
  const rest = second.slice(0, cut);
  const accent = second.slice(cut + 1);
  return (
    <>
      <section className="hero-banner">
        <div className="hero-photo" aria-hidden="true" />
        <div className="hero-copy">
          <h1 className="hero-title">
            {first}
            <br />
            {rest} <span className="hero-accent">{accent}</span>
          </h1>
          <p className="hero-lead">{t.home.lead}</p>
          <div className="row">
            <Link href="/test" className="btn hero-cta">
              {t.home.heroCta} <span aria-hidden="true">→</span>
            </Link>
            <Link href="/tutors" className="hero-link">
              {t.home.seeTutors}
            </Link>
          </div>
        </div>
      </section>
      <section className="stack">
        <h2>{t.home.levelsLabel}</h2>
        <div className="panel ladder two">
          {LEVELS.map((l) => (
            <div className="rung" key={l}>
              <LevelChip level={l} />
              <div className="fill">
                <span style={{ width: `${FILL[l]}%`, background: `var(--lv-${l.toLowerCase()})` }} />
              </div>
              <span className="small muted price">
                {t.home.lesson} {money(LESSON_PRICE[l])} · {t.lessons.wholeLevel} {money(LEVEL_PRICE[l])}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="stack">
        <h2>{t.home.howItWorks}</h2>
        <div className="steps">
          {steps.map(([title, text], i) => (
            <div className="step" key={i}>
              <b>
                {t.home.step} {i + 1}
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
