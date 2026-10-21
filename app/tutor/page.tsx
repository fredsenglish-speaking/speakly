import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { requireTutor } from "@/lib/auth";
import { durationLabel, formatDateTime, money } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";
import { deleteSlot } from "./actions";
import { AddSlotForm, NoteForm } from "./Forms";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].tutorPanel.title };
}

type Booking = {
  id: string;
  starts_at: string;
  duration_min: number;
  price: number;
  status: string;
  profiles: { full_name: string; level: string | null } | null;
  tutor_notes: { note: string; lesson_ids: number[] } | null;
};

export default async function TutorPanel() {
  const user = await requireTutor();
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: tutor }, { data: rows }, { data: slots }, { data: lessons }] = await Promise.all([
    supabase.from("tutors").select("approved, bio, levels").eq("id", user.id).single(),
    supabase
      .from("bookings")
      .select("id, starts_at, duration_min, price, status, profiles(full_name, level), tutor_notes(note, lesson_ids)")
      .eq("tutor_id", user.id)
      .in("status", ["scheduled", "completed"])
      .order("starts_at"),
    supabase
      .from("tutor_slots")
      .select("id, starts_at, booked")
      .eq("tutor_id", user.id)
      .gt("starts_at", now.toISOString())
      .order("starts_at"),
    supabase.from("lessons").select("id, level, title, title_en, title_ru").order("level").order("position"),
  ]);
  const bookings = (rows ?? []) as unknown as Booking[];
  const upcoming = bookings.filter((b) => b.status === "scheduled" && new Date(b.starts_at) > now);
  const needNote = bookings.filter((b) => !b.tutor_notes && new Date(b.starts_at) <= now);
  const thisMonth = bookings.filter((b) => b.starts_at >= monthStart && new Date(b.starts_at) <= now);
  const earned = thisMonth.reduce((s, b) => s + Number(b.price), 0);

  return (
    <section className="stack">
      <div className="row between">
        <h2>{t.tutorPanel.title}</h2>
        <Link href="/tutor/profile" className="btn ghost small">
          {t.tutorPanel.editProfile}
        </Link>
      </div>
      {!tutor?.approved && (
        <p className="notice">
          {t.tutorPanel.pending} <Link href="/tutor/profile">{t.tutorPanel.editProfile}</Link>
        </p>
      )}

      <div className="steps three">
        <div className="step">
          <b>{t.tutorPanel.thisMonth}</b>
          <h3 className="price">{t.tutorPanel.classes(thisMonth.length)}</h3>
        </div>
        <div className="step">
          <b>{t.tutorPanel.amount}</b>
          <h3 className="price">{money(earned)}</h3>
          <p className="small muted">{t.tutorPanel.beforeFee}</p>
        </div>
        <div className="step">
          <b>{t.tutorPanel.needNote}</b>
          <h3 className="price">{needNote.length}</h3>
        </div>
      </div>

      {needNote.map((b) => (
        <article key={b.id} className="panel stack">
          <div className="row between">
            <h3 className="row" style={{ gap: 8 }}>
              {b.profiles?.full_name} {b.profiles?.level && <LevelChip level={b.profiles.level} />}
            </h3>
            <span className="small muted">
              {formatDateTime(b.starts_at, locale)} · {durationLabel(b.duration_min, t)}
            </span>
          </div>
          <NoteForm bookingId={b.id} lessons={lessons ?? []} studentLevel={b.profiles?.level ?? null} />
        </article>
      ))}

      <div className="panel stack">
        <h3>{t.tutorPanel.upcoming}</h3>
        {upcoming.length === 0 ? (
          <p className="muted small">{t.tutorPanel.noBookings}</p>
        ) : (
          <table className="list">
            <tbody>
              {upcoming.map((b) => (
                <tr key={b.id}>
                  <td>{formatDateTime(b.starts_at, locale)}</td>
                  <td>{b.profiles?.full_name}</td>
                  <td>{durationLabel(b.duration_min, t)}</td>
                  <td className="price">{money(b.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel stack">
        <h3>{t.tutorPanel.slots}</h3>
        <AddSlotForm />
        {(slots ?? []).length === 0 ? (
          <p className="muted small">{t.tutorPanel.noSlots}</p>
        ) : (
          <div className="filters">
            {slots!.map((s) => (
              <span key={s.id} className="chip">
                {formatDateTime(s.starts_at, locale)}
                {s.booked ? (
                  <span className="small muted">· {t.tutorPanel.booked}</span>
                ) : (
                  <form action={deleteSlot} style={{ display: "inline" }}>
                    <input type="hidden" name="slot_id" value={s.id} />
                    <button type="submit" aria-label={t.tutorPanel.deleteSlot} style={{ border: 0, background: "none", color: "inherit", padding: 0 }}>
                      ✕
                    </button>
                  </form>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
