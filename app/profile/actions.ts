"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";

export type ProfileState = { error?: string; ok?: string };

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function saveProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser("/profile");
  const t = (await getT()).me;
  const fullName = String(form.get("full_name") ?? "").trim().slice(0, 80);
  if (!fullName) return { error: t.errName };

  const db = createAdminClient();
  const update: { full_name: string; avatar_url?: string | null } = { full_name: fullName };

  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const ext = PHOTO_TYPES[photo.type];
    if (!ext || photo.size > MAX_PHOTO_BYTES) return { error: t.errPhoto };
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await db.storage
      .from("avatars")
      .upload(path, Buffer.from(await photo.arrayBuffer()), { contentType: photo.type, upsert: true });
    if (error) {
      console.error("avatar upload failed", error);
      return { error: t.errPhoto };
    }
    update.avatar_url = db.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  } else if (form.get("remove_photo") === "1") {
    update.avatar_url = null;
  }

  const { error } = await db.from("profiles").update(update).eq("id", user.id);
  if (error) {
    console.error("profile update failed", error);
    return { error: t.errPhoto };
  }
  revalidatePath("/", "layout");
  return { ok: t.saved };
}
