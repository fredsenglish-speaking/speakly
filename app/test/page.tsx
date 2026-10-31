import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LevelLadder } from "@/components/LevelLadder";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { getT } from "@/lib/i18n/server";
import { startTest } from "./actions";
import { TestRunner } from "./TestRunner";

export async function generateMetadata() {
  return { title: (await getT()).test.title };
}

export default async function TestPage() {
  const user = await getCurrentUser();
  const t = await getT();
  const { count } = await createAdminClient().from("test_questions").select("id", { count: "exact", head: true });
  const n = count ?? 0;

  let attempt: { id: string; paid: boolean; finished_at: string | null } | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("test_attempts")
      .select("id, paid, finished_at")
      .eq("student_id", user.id)
      .eq("paid", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    attempt = data;
  }

  if (attempt && !attempt.finished_at) {
    // Answers stay on the server; the browser only gets questions and options.
    const { data: questions } = await createAdminClient()
      .from("test_questions")
      .select("id, question, options")
      .order("position");
    return <TestRunner attemptId={attempt.id} questions={questions ?? []} />;
  }

  const facts: [string, string][] = [
    ["M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", t.test.factTime],
    ["M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", n > 0 ? t.test.factQuestions(n) : t.test.factQuestionsAny],
    ["M4 20V14M10 20V9M16 20V12M22 20V4M3 20h20", t.test.factResult],
  ];

  return (
    <section className="tx-intro">
      <div className="tx-visual">
        <LevelLadder label={t.test.scale} current={user?.level} />
      </div>
      <div className="tx-copy">
        <span className="kicker">{t.test.title}</span>
        <h1 className="tx-title">{t.test.heroTitle}</h1>
        <p className="tx-lead">{t.test.heroLead}</p>
        <ul className="tx-facts">
          {facts.map(([d, text]) => (
            <li key={text}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={d} />
              </svg>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className="small muted">{t.test.howScored}</p>
        {user ? (
          <>
            {attempt && (
              <p className="small">
                {t.test.lastResult} <Link href={`/test/result/${attempt.id}`}>{t.test.see}</Link>
              </p>
            )}
            <form action={startTest}>
              <SubmitButton className="btn gold hero-cta tx-cta">
                {attempt ? t.test.retake : t.test.startFree} →
              </SubmitButton>
            </form>
          </>
        ) : (
          <>
            <Link href="/signup" className="btn gold hero-cta tx-cta">
              {t.test.startFree} →
            </Link>
            <p className="tx-account">
              {t.test.needAccount} {t.test.haveAccount}{" "}
              <Link href={`/login?next=${encodeURIComponent("/test")}`}>{t.nav.signIn}</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
