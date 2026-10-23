"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLevel } from "@/lib/levels";
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

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function saveLevelTeacher(_: VideoState, form: FormData): Promise<VideoState> {
  const user = await requireUser("/admin/lessons");
  if (user.role !== "admin") redirect("/");
  const t = (await getT()).admin;
  const level = String(form.get("level") ?? "");
  if (!isLevel(level)) return { error: t.errTeacher };
  const text = (key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max) || null;
  const name = text("name", 60);
  const video = text("video_url", 300);
  if (!name || (video && !embedUrl(video))) return { error: t.errTeacher };

  const db = createAdminClient();
  const row: Record<string, string | null> = {
    level,
    name,
    intro: text("intro", 2000),
    intro_az: text("intro_az", 1000),
    intro_ru: text("intro_ru", 1000),
    video_url: video,
    updated_at: new Date().toISOString(),
  };

  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const ext = PHOTO_TYPES[photo.type];
    if (!ext || photo.size > MAX_PHOTO_BYTES) return { error: t.errTeacher };
    const path = `teachers/${level}-${Date.now()}.${ext}`;
    const { error } = await db.storage
      .from("avatars")
      .upload(path, Buffer.from(await photo.arrayBuffer()), { contentType: photo.type, upsert: true });
    if (error) {
      console.error("teacher photo upload failed", error);
      return { error: t.errTeacher };
    }
    row.photo_url = db.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await db.from("level_teachers").upsert(row, { onConflict: "level" });
  if (error) {
    console.error("level teacher save failed", error);
    return { error: t.errTeacher };
  }
  revalidatePath("/admin/lessons");
  revalidatePath("/lessons");
  return { ok: t.savedVideo };
}
