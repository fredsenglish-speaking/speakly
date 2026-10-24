import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { getT } from "@/lib/i18n/server";
import { CERTIFICATE_PRICE, LESSON_PRICE, LEVELS, TEST_PRICE, money } from "@/lib/levels";

const FILL = { A1: 17, A2: 33, B1: 50, B2: 67, C1: 83, C2: 100 } as const;

export default async function HomePage() {
  const t = await getT();
  const steps = [
    [t.home.s1Title, t.home.s1Text(money(TEST_PRICE), money(CERTIFICATE_PRICE))],
    [t.home.s2Title, t.home.s2Text],
    [t.home.s3Title, t.home.s3Text],
    [t.home.s4Title, t.home.s4Text],
  ];
  return (
    <>
      <section className="hero">
        <div className="stack" style={{ gap: 16 }}>
          <h1>{t.home.title}</h1>
          <p className="muted" style={{ maxWidth: "52ch" }}>
            {t.home.lead}
          </p>
          <div className="row">
            <Link href="/test" className="btn">
              {t.home.startTest} · {money(TEST_PRICE)}
            </Link>
            <Link href="/tutors" className="btn ghost">
              {t.home.seeTutors}
            </Link>
          </div>
        </div>
        <div className="panel ladder" aria-label={t.home.levelsLabel}>
          {LEVELS.map((l) => (
            <div className="rung" key={l}>
              <LevelChip level={l} />
              <div className="fill">
                <span style={{ width: `${FILL[l]}%`, background: `var(--lv-${l.toLowerCase()})` }} />
              </div>
              <span className="small muted price">
                {t.home.lesson} {money(LESSON_PRICE[l])}
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
      <section className="panel cambridge">
        <div className="stack">
          <h2>{t.home.cambridgeTitle}</h2>
          <p className="muted">{t.home.cambridgeText}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cambridge-preparation-centre-certificate.jpg"
          alt={t.home.cambridgeAlt}
          width={700}
          height={990}
          loading="lazy"
        />
      </section>
    </>
  );
}
