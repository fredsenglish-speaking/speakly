import Link from "next/link";
import { notFound } from "next/navigation";
import { LevelChip } from "@/components/LevelChip";
import { Video } from "@/components/Video";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TUTOR_COLUMNS, type TutorRow } from "@/lib/types";
import { BookingForm } from "./BookingForm";

export default async function TutorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase.from("tutors").select(TUTOR_COLUMNS).eq("id", id).eq("approved", true).maybeSingle();
  if (!data) notFound();
  const t = data as unknown as TutorRow;

  const { data: slots } = await supabase
    .from("tutor_slots")
    .select("id, starts_at")
    .eq("tutor_id", id)
    .eq("booked", false)
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(30);

  const name = t.profiles?.full_name ?? "";
  return (
    <section className="stack">
      <Link href="/tutors" className="btn ghost self-start">
        ← Müəllimlər
      </Link>
      <div className="panel tutor">
        <div className="ava">{name.slice(0, 1)}</div>
        <div className="stack">
          <h2>{name}</h2>
          <p className="small muted">
            {t.years_experience} il təcrübə{t.languages && ` · ${t.languages}`}
          </p>
          <div className="row" style={{ gap: 4 }}>
            {t.levels.map((l) => (
              <LevelChip key={l} level={l} />
            ))}
          </div>
          <p style={{ whiteSpace: "pre-line" }}>{t.bio}</p>
        </div>
      </div>
      {t.intro_video_url && <Video url={t.intro_video_url} title={`${name} təqdimat videosu`} />}
      <BookingForm
        tutorId={t.id}
        prices={{ 15: Number(t.price_15), 30: Number(t.price_30), 60: Number(t.price_60) }}
        slots={slots ?? []}
        signedIn={!!user}
      />
    </section>
  );
}
