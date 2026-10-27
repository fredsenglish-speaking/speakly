"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { LESSON_PRICE, LEVEL_PRICE, isLevel, levelPurchaseRef } from "@/lib/levels";
import { startPayment } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

export async function buyLesson(form: FormData) {
  const slug = String(form.get("slug"));
  const user = await requireUser(`/lessons/${slug}`);
  const { data: lesson } = await createAdminClient()
    .from("lessons")
    .select("id, level")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!lesson || !isLevel(lesson.level)) redirect("/lessons");

  redirect(
    await startPayment({
      userId: user.id,
      kind: "lesson",
      refId: String(lesson.id),
      amount: LESSON_PRICE[lesson.level],
      successPath: `/lessons/${slug}`,
    }),
  );
}

export async function buyLevel(form: FormData) {
  const level = String(form.get("level"));
  const back = String(form.get("back") || `/lessons?level=${level}`);
  const user = await requireUser(back);
  if (!isLevel(level)) redirect("/lessons");

  redirect(
    await startPayment({
      userId: user.id,
      kind: "lesson",
      refId: levelPurchaseRef(level),
      amount: LEVEL_PRICE[level],
      successPath: back,
    }),
  );
}

/** Keeps the student's best test result for a lesson they own. */
export async function saveLessonResult(lessonId: number, right: number, total: number) {
  const user = await requireUser("/lessons");
  if (![lessonId, right, total].every(Number.isInteger) || total <= 0 || right < 0 || right > total) return;
  const db = createAdminClient();
  const { data: owned } = await db
    .from("lesson_purchases")
    .select("lesson_id")
    .eq("student_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (!owned && user.role !== "admin") return;

  const { data: prev } = await db
    .from("lesson_results")
    .select("best_right, total, attempts")
    .eq("student_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  const better = !prev || right / total >= prev.best_right / prev.total;
  const { error } = await db.from("lesson_results").upsert(
    {
      student_id: user.id,
      lesson_id: lessonId,
      best_right: better ? right : prev.best_right,
      total: better ? total : prev.total,
      attempts: (prev?.attempts ?? 0) + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,lesson_id" },
  );
  if (error) console.error("lesson result save failed", error);
  revalidatePath("/lessons");
}
