import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { requireTutor } from "@/lib/auth";
import { durationLabel, formatDateTime, money } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";
import { deleteSlot } from "./actions";
import { AddSlotForm, NoteForm } from "./Forms";

export const metadata = { title: "Müəllim paneli" };

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
    supabase.from("lessons").select("id, level, title").order("level").order("position"),
  ]);
  const bookings = (rows ?? []) as unknown as Booking[];
  const upcoming = bookings.filter((b) => b.status === "scheduled" && new Date(b.starts_at) > now);
  const needNote = bookings.filter((b) => !b.tutor_notes && new Date(b.starts_at) <= now);
  const thisMonth = bookings.filter((b) => b.starts_at >= monthStart && new Date(b.starts_at) <= now);
  const earned = thisMonth.reduce((s, b) => s + Number(b.price), 0);

  return (
    <section className="stack">
      <div className="row between">
        <h2>Müəllim paneli</h2>
        <Link href="/tutor/profile" className="btn ghost small">
          Profilimi redaktə et
        </Link>
      </div>
      {!tutor?.approved && (
        <p className="notice">
          Profiliniz təsdiq gözləyir. Təsdiqdən sonra tələbələr sizi müəllimlər siyahısında görəcək. Bu vaxt{" "}
          <Link href="/tutor/profile">profilinizi</Link> doldurun.
        </p>
      )}

      <div className="steps three">
        <div className="step">
          <b>Bu ay</b>
          <h3 className="price">{thisMonth.length} dərs</h3>
        </div>
        <div className="step">
          <b>Dərs məbləği</b>
          <h3 className="price">{money(earned)}</h3>
          <p className="small muted">platforma komissiyasından əvvəl</p>
        </div>
        <div className="step">
          <b>Qeyd gözləyir</b>
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
              {formatDateTime(b.starts_at)} · {durationLabel(b.duration_min)}
            </span>
          </div>
          <NoteForm bookingId={b.id} lessons={lessons ?? []} studentLevel={b.profiles?.level ?? null} />
        </article>
      ))}

      <div className="panel stack">
        <h3>Qarşıdakı dərslər</h3>
        {upcoming.length === 0 ? (
          <p className="muted small">Hələ sifariş yoxdur.</p>
        ) : (
          <table className="list">
            <tbody>
              {upcoming.map((b) => (
                <tr key={b.id}>
                  <td>{formatDateTime(b.starts_at)}</td>
                  <td>{b.profiles?.full_name}</td>
                  <td>{durationLabel(b.duration_min)}</td>
                  <td className="price">{money(b.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel stack">
        <h3>Boş vaxtlarım</h3>
        <AddSlotForm />
        {(slots ?? []).length === 0 ? (
          <p className="muted small">Tələbələrin yazıla bilməsi üçün boş vaxt əlavə edin.</p>
        ) : (
          <div className="filters">
            {slots!.map((s) => (
              <span key={s.id} className="chip">
                {formatDateTime(s.starts_at)}
                {s.booked ? (
                  <span className="small muted">· tutulub</span>
                ) : (
                  <form action={deleteSlot} style={{ display: "inline" }}>
                    <input type="hidden" name="slot_id" value={s.id} />
                    <button type="submit" aria-label="Vaxtı sil" style={{ border: 0, background: "none", color: "inherit", padding: 0 }}>
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
