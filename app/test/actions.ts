"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CERTIFICATE_PRICE, TEST_RETAKE_PRICE, levelForAnswers } from "@/lib/levels";
import { startPayment } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

export async function startTest() {
  const user = await requireUser("/test");
  const db = createAdminClient();
  // The first level test is free; every later attempt costs TEST_RETAKE_PRICE.
  // An unfinished attempt is picked up again instead of starting a new one.
  const { data: open } = await db
    .from("test_attempts")
    .select("id")
    .eq("student_id", user.id)
    .eq("paid", true)
    .is("finished_at", null)
    .limit(1)
    .maybeSingle();
  if (open) redirect("/test");

  const { count: done } = await db
    .from("test_attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id)
    .not("finished_at", "is", null);
  if (!done) {
    const { error } = await db.from("test_attempts").insert({ student_id: user.id, paid: true });
    if (error) throw new Error("Could not start the test");
    redirect("/test");
  }

  const { data: pending } = await db
    .from("payments")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "test")
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (pending) redirect(`/pay/${pending.id}`);

  const { data, error } = await db.from("test_attempts").insert({ student_id: user.id }).select("id").single();
  if (error || !data) throw new Error("Could not start the test");
  redirect(
    await startPayment({ userId: user.id, kind: "test", refId: data.id, amount: TEST_RETAKE_PRICE, successPath: "/test" }),
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

  const { data: questions } = await db.from("test_questions").select("id, correct, level");
  const results = (questions ?? []).map((q) => ({ level: q.level, correct: answers[q.id] === q.correct }));
  const total = results.length;
  const score = results.filter((r) => r.correct).length;
  const level = levelForAnswers(results);

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
