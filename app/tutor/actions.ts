"use server";

import { revalidatePath } from "next/cache";
import { requireTutor } from "@/lib/auth";
import { LEVELS, bakuLocalToIso } from "@/lib/levels";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string };

export async function addSlot(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireTutor();
  const iso = bakuLocalToIso(String(form.get("starts_at") ?? ""));
  if (!iso) return { error: "Tarix və saatı seçin." };
  if (new Date(iso) <= new Date()) return { error: "Keçmiş vaxt əlavə etmək olmaz." };

  const supabase = await createClient();
  const { error } = await supabase.from("tutor_slots").insert({ tutor_id: user.id, starts_at: iso });
  if (error) return { error: error.code === "23505" ? "Bu vaxt artıq əlavə olunub." : "Vaxt əlavə olunmadı." };
  revalidatePath("/tutor");
  return { ok: "Vaxt əlavə olundu." };
}

export async function deleteSlot(form: FormData) {
  await requireTutor();
  const supabase = await createClient();
  // Row level security only lets tutors delete their own free slots.
  await supabase.from("tutor_slots").delete().eq("id", String(form.get("slot_id")));
  revalidatePath("/tutor");
}

export async function saveNote(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireTutor();
  const bookingId = String(form.get("booking_id"));
  const note = String(form.get("note") ?? "").trim();
  const lessonIds = form.getAll("lesson_ids").map(Number).filter(Number.isInteger);
  if (!note) return { error: "Qeyd yazın." };

  const db = createAdminClient();
  const { data: booking } = await db
    .from("bookings")
    .select("id, student_id, status")
    .eq("id", bookingId)
    .eq("tutor_id", user.id)
    .single();
  if (!booking || !["scheduled", "completed"].includes(booking.status)) return { error: "Dərs tapılmadı." };

  const { error } = await db.from("tutor_notes").upsert(
    { booking_id: booking.id, tutor_id: user.id, student_id: booking.student_id, note, lesson_ids: lessonIds },
    { onConflict: "booking_id" },
  );
  if (error) return { error: "Qeyd saxlanmadı." };
  await db.from("bookings").update({ status: "completed" }).eq("id", booking.id);
  revalidatePath("/tutor");
  return { ok: "Qeyd tələbəyə göndərildi." };
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireTutor();
  const fullName = String(form.get("full_name") ?? "").trim();
  const prices = [15, 30, 60].map((d) => Number(form.get(`price_${d}`)));
  if (prices.some((p) => !Number.isFinite(p) || p <= 0)) return { error: "Qiymətlər müsbət rəqəm olmalıdır." };
  const levels = form.getAll("levels").map(String).filter((l) => (LEVELS as readonly string[]).includes(l));
  const urlOrNull = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s.startsWith("https://") ? s : null;
  };

  const supabase = await createClient();
  if (fullName) await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  const { error } = await supabase
    .from("tutors")
    .update({
      bio: String(form.get("bio") ?? "").trim(),
      languages: String(form.get("languages") ?? "").trim(),
      years_experience: Math.max(0, Math.floor(Number(form.get("years_experience")) || 0)),
      levels,
      intro_video_url: urlOrNull(form.get("intro_video_url")),
      meeting_url: urlOrNull(form.get("meeting_url")),
      price_15: prices[0],
      price_30: prices[1],
      price_60: prices[2],
    })
    .eq("id", user.id);
  if (error) return { error: "Profil saxlanmadı." };
  revalidatePath("/tutor/profile");
  return { ok: "Profil yadda saxlandı." };
}
