import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { requireUser } from "@/lib/auth";
import { LESSON_PRICE, durationLabel, formatDateTime, isLevel, money } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dərslərim" };

const STATUS: Record<string, string> = {
  pending_payment: "Ödəniş gözlənilir",
  scheduled: "Planlaşdırılıb",
  completed: "Keçirilib",
  cancelled: "Ləğv edilib",
};

type Booking = {
  id: string;
  starts_at: string;
  duration_min: number;
  status: string;
  meeting_url: string | null;
  tutors: { profiles: { full_name: string } | null } | null;
  tutor_notes: { note: string; lesson_ids: number[] } | null;
};

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();

  const [{ data: bookingRows }, { data: lessons }, { data: owned }, { data: certs }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, starts_at, duration_min, status, meeting_url, tutors(profiles(full_name)), tutor_notes(note, lesson_ids)")
      .eq("student_id", user.id)
      .neq("status", "pending_payment")
      .order("starts_at", { ascending: false }),
    supabase.from("lessons").select("id, slug, level, title"),
    supabase.from("lesson_purchases").select("lesson_id").eq("student_id", user.id),
    supabase.from("certificates").select("code, level, issued_at").eq("student_id", user.id),
  ]);
  const bookings = (bookingRows ?? []) as unknown as Booking[];
  const lessonById = new Map((lessons ?? []).map((l) => [l.id, l]));
  const ownedIds = new Set((owned ?? []).map((o) => o.lesson_id));

  return (
    <section className="stack">
      <div className="row between">
        <h2>Dərslərim</h2>
        {user.level ? (
          <span className="small muted">
            Səviyyəniz: <LevelChip level={user.level} />
          </span>
        ) : (
          <Link href="/test" className="btn small">
            Səviyyə testini keç
          </Link>
        )}
      </div>

      {bookings.length === 0 && (
        <div className="panel stack">
          <p className="muted">Hələ speaking dərsiniz yoxdur.</p>
          <Link href={user.level ? `/tutors?level=${user.level}` : "/tutors"} className="btn self-start">
            Müəllim seç
          </Link>
        </div>
      )}

      {bookings.map((b) => {
        const tutorName = b.tutors?.profiles?.full_name ?? "";
        const upcoming = b.status === "scheduled" && new Date(b.starts_at) > new Date(Date.now() - b.duration_min * 60000);
        return (
          <article key={b.id} className="panel stack">
            <div className="row between">
              <div className="row">
                <div className="ava sm">{tutorName.slice(0, 1)}</div>
                <div>
                  <h3>{tutorName}</h3>
                  <p className="small muted">
                    {formatDateTime(b.starts_at)} · {durationLabel(b.duration_min)}
                  </p>
                </div>
              </div>
              <span className={`status ${b.status}`}>{STATUS[b.status]}</span>
            </div>
            {upcoming &&
              (b.meeting_url ? (
                <a href={b.meeting_url} target="_blank" rel="noreferrer" className="btn self-start">
                  Dərsə qoşul
                </a>
              ) : (
                <p className="small muted">Dərs linki müəllim tərəfindən əlavə olunacaq.</p>
              ))}
            {b.tutor_notes && (
              <div className="note">
                <strong className="small">Müəllimin qeydi</strong>
                <p style={{ whiteSpace: "pre-line" }}>{b.tutor_notes.note}</p>
                {b.tutor_notes.lesson_ids.length > 0 && (
                  <>
                    <span className="small muted">Tövsiyə olunan lesson-lar:</span>
                    <div className="filters">
                      {b.tutor_notes.lesson_ids.map((id) => {
                        const l = lessonById.get(id);
                        if (!l) return null;
                        return (
                          <Link key={id} href={`/lessons/${l.slug}`} className="chip">
                            <LevelChip level={l.level} /> {l.title}
                            {!ownedIds.has(id) && isLevel(l.level) && ` · ${money(LESSON_PRICE[l.level])}`}
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </article>
        );
      })}

      {(certs ?? []).length > 0 && (
        <div className="panel stack">
          <h3>Sertifikatlarım</h3>
          <div className="filters">
            {certs!.map((c) => (
              <Link key={c.code} href={`/certificate/${c.code}`} className="chip">
                <LevelChip level={c.level} /> {c.code}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
