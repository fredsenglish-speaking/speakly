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

  const { data: cert } = await supabase.from("certificates").select("code").eq("attempt_id", id).maybeSingle();

  const issued = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Baku",
  }).format(new Date());

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
        <LevelLadder label={t.test.scale} current={attempt.level} />
        <div className="row tx-result-actions">
            <Link href={`/lessons?level=${attempt.level}`} className="btn gold hero-cta">
              {t.test.seeLessons(attempt.level)} →
            </Link>
            <Link href={`/ai-teachers?level=${attempt.level}`} className="btn ghost">
              {t.nav.aiTeachers}
            </Link>
            <Link href={`/tutors?level=${attempt.level}`} className="btn ghost">
              {t.test.seeTutors(attempt.level)}
            </Link>
            {cert ? (
              <Link href={`/certificate/${cert.code}`} className="btn">
                {t.test.myCertificate}
              </Link>
            ) : (
              <form action={buyCertificate}>
                <input type="hidden" name="attempt_id" value={attempt.id} />
                <SubmitButton className="btn gold">
                  {t.test.buyCertificate} · {money(CERTIFICATE_PRICE)}
                </SubmitButton>
              </form>
            )}
        </div>
      </section>
      {!cert && (
        <section className="stack cert-sample">
          <p className="muted">{t.test.sampleNote}</p>
          <CertificateCard
            name={user.full_name}
            level={attempt.level}
            issued={issued}
            code={`SPK-${attempt.level}-SAMPLE`}
            verifyUrl={`${await siteHost()}/certificate`}
            sample
          />
        </section>
      )}
    </>
  );
}
