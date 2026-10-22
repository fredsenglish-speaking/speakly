"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { embedUrl } from "@/lib/video";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";

export type VideoState = { error?: string; ok?: string };

export async function saveLessonVideos(_: VideoState, form: FormData): Promise<VideoState> {
  const user = await requireUser("/admin/lessons");
  if (user.role !== "admin") redirect("/");
  const t = (await getT()).admin;
  const main = String(form.get("explanation_video_url") ?? "").trim();
  if (main && !embedUrl(main)) return { error: t.errVideo };

  const { error } = await createAdminClient()
    .from("lessons")
    .update({ explanation_video_url: main || null })
    .eq("id", Number(form.get("lesson_id")));
  if (error) return { error: t.errVideo };
  revalidatePath("/admin/lessons");
  revalidatePath("/lessons", "layout");
  return { ok: t.savedVideo };
}
