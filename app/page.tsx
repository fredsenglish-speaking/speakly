import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { CERTIFICATE_PRICE, LESSON_PRICE, LEVELS, TEST_PRICE, money } from "@/lib/levels";

const FILL = { A1: 20, A2: 40, B1: 60, B2: 80, C1: 100 } as const;

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="stack" style={{ gap: 16 }}>
          <h1>Səviyyənə uyğun müəllimlə ingiliscə danış</h1>
          <p className="muted" style={{ maxWidth: "52ch" }}>
            Səviyyə testini keç, sənə uyğun müəllimi seç və 15 dəqiqədən 1 saata qədər canlı speaking dərsi al. Hər
            dərsdən sonra müəllim nəyə çalışmalı olduğunu yazır.
          </p>
          <div className="row">
            <Link href="/test" className="btn">
              Səviyyə testinə başla · {money(TEST_PRICE)}
            </Link>
            <Link href="/tutors" className="btn ghost">
              Müəllimlərə bax
            </Link>
          </div>
        </div>
        <div className="panel ladder" aria-label="Səviyyələr və lesson qiymətləri">
          {LEVELS.map((l) => (
            <div className="rung" key={l}>
              <LevelChip level={l} />
              <div className="fill">
                <span style={{ width: `${FILL[l]}%`, background: `var(--lv-${l.toLowerCase()})` }} />
              </div>
              <span className="small muted price">lesson {money(LESSON_PRICE[l])}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="stack">
        <h2>Necə işləyir</h2>
        <div className="steps">
          <div className="step">
            <b>Addım 1</b>
            <h3>Test</h3>
            <p className="small muted">
              {money(TEST_PRICE)} ödə, səviyyəni öyrən. Onlayn sertifikat {money(CERTIFICATE_PRICE)}.
            </p>
          </div>
          <div className="step">
            <b>Addım 2</b>
            <h3>Müəllim</h3>
            <p className="small muted">Səviyyənə uyğun müəllimlərin təqdimatına bax, birini seç.</p>
          </div>
          <div className="step">
            <b>Addım 3</b>
            <h3>Speaking</h3>
            <p className="small muted">15 dəq, 30 dəq və ya 1 saat canlı danışıq dərsi.</p>
          </div>
          <div className="step">
            <b>Addım 4</b>
            <h3>Lesson</h3>
            <p className="small muted">Müəllimin qeydinə görə qrammatika dərsini al.</p>
          </div>
        </div>
      </section>
    </>
  );
}
