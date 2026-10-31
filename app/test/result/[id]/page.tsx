import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CertificateCard } from "@/components/CertificateCard";
import { CERTIFICATE_PRICE, LEVEL_NAME, isLevel, money } from "@/lib/levels";
import { LevelLadder } from "@/components/LevelLadder";
import { siteHost } from "@/lib/siteHost";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { buyCertificate } from "../../actions";
import { paymentCode } from "@/lib/whatsapp";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT()).test.resultTitle };
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/test/result/${id}`);
  const t = await getT();
  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("test_attempts")
    .select("id, score, total, level")
    .eq("id", id)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!attempt?.level || !isLevel(attempt.level)) notFound();

  const [{ data: cert }, { data: order }] = await Promise.all([
    supabase.from("certificates").select("code").eq("attempt_id", id).maybeSingle(),
    // An order the student already started (WhatsApp + admin confirmation).
    supabase
      .from("payments")
      .select("id")
      .eq("kind", "certificate")
      .eq("ref_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const issued = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Baku",
  }).format(new Date());

  const buyLabel = `${t.test.buyCertificate} — ${money(CERTIFICATE_PRICE)}`;
  const getCertificate = order ? (
    <div className="tx-order stack">
      <p>{t.test.orderPending(paymentCode(order.id))}</p>
      <Link href={`/pay/${order.id}`} className="btn gold tx-cert-cta self-start">
        {t.test.openOrder} →
      </Link>
    </div>
  ) : (
    <form action={buyCertificate}>
      <input type="hidden" name="attempt_id" value={attempt.id} />
      <SubmitButton className="btn gold tx-cert-cta">{buyLabel}</SubmitButton>
    </form>
  );

  return (
    <>
      <section className="tx-result">
        <div className="tx-result-main">
          <div className={`big-lv lv-${attempt.level}`}>{attempt.level}</div>
          <div className="stack">
            <span className="kicker">{t.test.resultTitle}</span>
            <h1 className="tx-result-title">{t.test.yourLevel(attempt.level)}</h1>
            <p className="muted">
              <span lang="en">{LEVEL_NAME[attempt.level]}</span> · {t.test.score(attempt.total, attempt.score)}
            </p>
          </div>
        </div>
      </section>

      {cert ? (
        <section className="tx-cert tx-cert-done">
          <Link href={`/certificate/${cert.code}`} className="btn gold tx-cert-cta">
            {t.test.myCertificate} →
          </Link>
        </section>
      ) : (
        <section className="tx-cert cert-sample">
          <div className="tx-cert-head">
            <div className="stack" style={{ gap: 6 }}>
              <span className="kicker">{t.test.certKicker}</span>
              <h2 className="tx-cert-title">{t.test.certTitle}</h2>
              <p className="muted">{t.test.sampleNote}</p>
            </div>
            {getCertificate}
          </div>
          <CertificateCard
            name={user.full_name}
            level={attempt.level}
            issued={issued}
            code={`SPK-${attempt.level}-SAMPLE`}
            verifyUrl={`${await siteHost()}/certificate`}
            sample
          />
          <div className="tx-cert-foot">{getCertificate}</div>
        </section>
      )}

      <section className="tx-result">
        <h2 className="tx-cert-title">{t.test.nextSteps}</h2>
        <LevelLadder label={t.test.scale} current={attempt.level} />
        <div className="row tx-result-actions">
          <Link href={`/lessons?level=${attempt.level}`} className="btn gold hero-cta">
            {t.test.seeLessons(attempt.level)} →
          </Link>
          <Link href={`/ai-teachers?level=${attempt.level}`} className="btn ghost">
            {t.nav.aiTeachers}
          </Link>
        </div>
      </section>
    </>
  );
}
