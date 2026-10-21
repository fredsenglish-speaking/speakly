import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TEST_PRICE, money } from "@/lib/levels";
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
  const user = await requireUser("/test");
  const t = await getT();
  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("test_attempts")
    .select("id, paid, finished_at")
    .eq("student_id", user.id)
    .eq("paid", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (attempt && !attempt.finished_at) {
    // Answers stay on the server; the browser only gets questions and options.
    const { data: questions } = await createAdminClient()
      .from("test_questions")
      .select("id, question, options")
      .order("position");
    return <TestRunner attemptId={attempt.id} questions={questions ?? []} />;
  }

  const { count } = await createAdminClient().from("test_questions").select("id", { count: "exact", head: true });

  return (
    <section className="panel stack narrow">
      <h2>{t.test.title}</h2>
      <p className="muted">{t.test.intro(count ?? 0)}</p>
      {attempt && (
        <p className="small">
          {t.test.lastResult} <Link href={`/test/result/${attempt.id}`}>{t.test.see}</Link>
        </p>
      )}
      <div className="row between">
        <span>{t.test.price}</span>
        <span className="price total">{money(TEST_PRICE)}</span>
      </div>
      <form action={startTest}>
        <SubmitButton>{attempt ? t.test.retake : t.test.payStart}</SubmitButton>
      </form>
    </section>
  );
}
