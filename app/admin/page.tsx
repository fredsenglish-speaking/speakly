import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { LevelChip } from "@/components/LevelChip";
import { requireUser } from "@/lib/auth";
import { formatDate, money } from "@/lib/levels";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "İdarə" };

async function setApproved(form: FormData) {
  "use server";
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/");
  await createAdminClient()
    .from("tutors")
    .update({ approved: form.get("approved") === "true" })
    .eq("id", String(form.get("tutor_id")));
  revalidatePath("/admin");
}

type Row = {
  id: string;
  approved: boolean;
  bio: string;
  levels: string[];
  created_at: string;
  profiles: { full_name: string } | null;
};

export default async function AdminPage() {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/");
  const db = createAdminClient();
  const [{ data }, { data: paid }] = await Promise.all([
    db.from("tutors").select("id, approved, bio, levels, created_at, profiles(full_name)").order("created_at", { ascending: false }),
    db.from("payments").select("kind, amount").eq("status", "paid"),
  ]);
  const tutors = (data ?? []) as unknown as Row[];
  const totals = { test: 0, certificate: 0, booking: 0, lesson: 0 } as Record<string, number>;
  for (const p of paid ?? []) totals[p.kind] += Number(p.amount);

  return (
    <section className="stack">
      <h2>İdarə paneli</h2>
      <div className="steps">
        <div className="step"><b>Testlər</b><h3 className="price">{money(totals.test)}</h3></div>
        <div className="step"><b>Sertifikatlar</b><h3 className="price">{money(totals.certificate)}</h3></div>
        <div className="step"><b>Speaking dərsləri</b><h3 className="price">{money(totals.booking)}</h3></div>
        <div className="step"><b>Lessons</b><h3 className="price">{money(totals.lesson)}</h3></div>
      </div>
      <div className="panel stack">
        <h3>Müəllimlər</h3>
        {tutors.length === 0 && <p className="muted small">Hələ müəllim qeydiyyatdan keçməyib.</p>}
        {tutors.map((t) => (
          <div key={t.id} className="row between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            <div className="stack" style={{ gap: 4, minWidth: 0, flex: 1 }}>
              <strong>{t.profiles?.full_name || "Adsız"}</strong>
              <span className="small muted">Qeydiyyat: {formatDate(t.created_at)}</span>
              <div className="row" style={{ gap: 4 }}>
                {t.levels.map((l) => <LevelChip key={l} level={l} />)}
              </div>
              {t.bio && <p className="small">{t.bio}</p>}
            </div>
            <form action={setApproved}>
              <input type="hidden" name="tutor_id" value={t.id} />
              <input type="hidden" name="approved" value={String(!t.approved)} />
              <button type="submit" className={t.approved ? "btn ghost small" : "btn small"}>
                {t.approved ? "Siyahıdan çıxar" : "Təsdiqlə"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
