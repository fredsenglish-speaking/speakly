import { requireTutor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT()).profile.title };
}

export default async function TutorProfilePage() {
  const user = await requireTutor();
  const tr = await getT();
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tutors")
    .select("bio, languages, years_experience, levels, intro_video_url, meeting_url, price_15, price_30, price_60")
    .eq("id", user.id)
    .single();

  return (
    <section className="stack">
      <h2>{tr.profile.title}</h2>
      <ProfileForm
        fullName={user.full_name}
        bio={t?.bio ?? ""}
        languages={t?.languages ?? ""}
        years={t?.years_experience ?? 0}
        levels={t?.levels ?? []}
        introVideoUrl={t?.intro_video_url ?? ""}
        meetingUrl={t?.meeting_url ?? ""}
        prices={{ 15: Number(t?.price_15 ?? 5), 30: Number(t?.price_30 ?? 9), 60: Number(t?.price_60 ?? 15) }}
      />
    </section>
  );
}
