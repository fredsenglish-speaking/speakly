"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { LESSON_PRICE, isLevel } from "@/lib/levels";
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
