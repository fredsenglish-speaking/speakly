"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CERTIFICATE_PRICE, TEST_PRICE, levelForScore } from "@/lib/levels";
import { startPayment } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

export async function startTest() {
  const user = await requireUser("/test");
  const db = createAdminClient();
  const { data, error } = await db.from("test_attempts").insert({ student_id: user.id }).select("id").single();
  if (error || !data) throw new Error("Could not start the test");
  redirect(
    await startPayment({ userId: user.id, kind: "test", refId: data.id, amount: TEST_PRICE, successPath: "/test" }),
  );
}

export async function submitTest(form: FormData) {
  const user = await requireUser("/test");
  const attemptId = String(form.get("attempt_id"));
  let answers: Record<string, number> = {};
  try {
    answers = JSON.parse(String(form.get("answers") ?? "{}"));
  } catch {
    // treat unreadable answers as unanswered
  }

  const db = createAdminClient();
  const { data: attempt } = await db
    .from("test_attempts")
    .select("id, paid, finished_at")
    .eq("id", attemptId)
    .eq("student_id", user.id)
    .single();
  if (!attempt?.paid || attempt.finished_at) redirect("/test");

  const { data: questions } = await db.from("test_questions").select("id, correct");
  const total = questions?.length ?? 0;
  const score = (questions ?? []).filter((q) => answers[q.id] === q.correct).length;
  const level = levelForScore(score, total);

  await db
    .from("test_attempts")
    .update({ answers, score, total, level, finished_at: new Date().toISOString() })
    .eq("id", attemptId);
  await db.from("profiles").update({ level }).eq("id", user.id);

  redirect(`/test/result/${attemptId}`);
}

export async function buyCertificate(form: FormData) {
  const attemptId = String(form.get("attempt_id"));
  const user = await requireUser(`/test/result/${attemptId}`);
  const db = createAdminClient();
  const { data: attempt } = await db
    .from("test_attempts")
    .select("id, level")
    .eq("id", attemptId)
    .eq("student_id", user.id)
    .single();
  if (!attempt?.level) redirect("/test");

  redirect(
    await startPayment({
      userId: user.id,
      kind: "certificate",
      refId: attemptId,
      amount: CERTIFICATE_PRICE,
      successPath: `/test/result/${attemptId}`,
    }),
  );
}
