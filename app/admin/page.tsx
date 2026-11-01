import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { LevelChip } from "@/components/LevelChip";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime, levelFromPurchaseRef, money } from "@/lib/levels";
import { cancelPayment, markPaid } from "@/lib/payments";
import { paymentCode } from "@/lib/whatsapp";
import { createAdminClient } from "@/lib/supabase/admin";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].admin.title };
}

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

async function reviewPayment(form: FormData) {
  "use server";
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/");
  const id = String(form.get("payment_id"));
  if (form.get("decision") === "confirm") await markPaid(id, `confirmed-by:${user.id}`);
  else await cancelPayment(id);
  revalidatePath("/admin");
}

type PendingRow = {
  id: string;
  kind: string;
  ref_id: string;
  amount: number;
  created_at: string;
  profiles: { full_name: string } | null;
};

type Row = {
  id: string;
  approved: boolean;
  bio: string;
  levels: string[];
  created_at: string;
  profiles: { full_name: string } | null;
};

/**
 * Revenue totals count only payments confirmed from this moment on (Ms Jane, 2026-11-01):
 * everything before it was testing. The old payments stay in the database, they are just not counted.
 */
const REVENUE_FROM = "2026-11-01T12:30:00Z"; // 16:30 Baku time

export default async function AdminPage() {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/");
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const db = createAdminClient();
  const [{ data }, { data: paid }, { data: pendingRows }] = await Promise.all([
    db.from("tutors").select("id, approved, bio, levels, created_at, profiles(full_name)").order("created_at", { ascending: false }),
    db.from("payments").select("kind, amount").eq("status", "paid").gte("paid_at", REVENUE_FROM),
    db
      .from("payments")
      .select("id, kind, ref_id, amount, created_at, profiles(full_name)")
      .eq("status", "pending")
      .order("created_at"),
  ]);
  const pending = (pendingRows ?? []) as unknown as PendingRow[];
  const tutors = (data ?? []) as unknown as Row[];
  const totals = { test: 0, certificate: 0, booking: 0, lesson: 0, practice: 0 } as Record<string, number>;
  for (const p of paid ?? []) totals[p.kind] += Number(p.amount);
  const wholeLevelLabel = (ref: string) => {
    const level = levelFromPurchaseRef(ref);
    return level ? `${t.pay.kinds.lesson} (${t.pay.wholeLevel(level)})` : null;
  };

  return (
    <section className="stack">
      <div className="row between">
        <h2>{t.admin.title}</h2>
        <div className="row">
          <Link href="/admin/certificates" className="btn small">🎓 {t.admin.orders.link}</Link>
          <Link href="/admin/users" className="btn ghost small">🔑 {t.admin.users.link}</Link>
          <Link href="/admin/students" className="btn ghost small">👥 {t.admin.students.link}</Link>
          <Link href="/admin/lessons" className="btn ghost small">🎬 {t.admin.videos}</Link>
        </div>
      </div>
      <p className="small muted">{t.admin.revenueSince(formatDateTime(REVENUE_FROM, locale))}</p>
      <div className="steps five">
        <div className="step"><b>{t.admin.tests}</b><h3 className="price">{money(totals.test)}</h3></div>
        <div className="step"><b>{t.admin.certificates}</b><h3 className="price">{money(totals.certificate)}</h3></div>
        <div className="step"><b>{t.admin.bookings}</b><h3 className="price">{money(totals.booking)}</h3></div>
        <div className="step"><b>{t.admin.lessons}</b><h3 className="price">{money(totals.lesson)}</h3></div>
        <div className="step"><b>{t.admin.practice}</b><h3 className="price">{money(totals.practice)}</h3></div>
      </div>
      <div className="panel stack">
        <h3>{t.admin.pending}</h3>
        {pending.length === 0 && <p className="muted small">{t.admin.noPending}</p>}
        {pending.map((p) => (
          <div key={p.id} className="row between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
              <strong>{p.profiles?.full_name || t.admin.unnamed}</strong>
              <span className="small">
                {wholeLevelLabel(p.ref_id) ?? t.pay.kinds[p.kind]} · <span className="price">{money(Number(p.amount))}</span> · {t.pay.code}:{" "}
                <span className="price">{paymentCode(p.id)}</span>
              </span>
              <span className="small muted">{formatDateTime(p.created_at, locale)}</span>
            </div>
            <form action={reviewPayment} className="row" style={{ gap: 6 }}>
              <input type="hidden" name="payment_id" value={p.id} />
              <button type="submit" name="decision" value="confirm" className="btn small">{t.admin.confirm}</button>
              <button type="submit" name="decision" value="reject" className="btn ghost small">{t.admin.reject}</button>
            </form>
          </div>
        ))}
      </div>
      <div className="panel stack">
        <h3>{t.admin.tutors}</h3>
        {tutors.length === 0 && <p className="muted small">{t.admin.noTutors}</p>}
        {tutors.map((row) => (
          <div key={row.id} className="row between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            <div className="stack" style={{ gap: 4, minWidth: 0, flex: 1 }}>
              <strong>{row.profiles?.full_name || t.admin.unnamed}</strong>
              <span className="small muted">{t.admin.registered}: {formatDate(row.created_at, locale)}</span>
              <div className="row" style={{ gap: 4 }}>
                {row.levels.map((l) => <LevelChip key={l} level={l} />)}
              </div>
              {row.bio && <p className="small">{row.bio}</p>}
            </div>
            <form action={setApproved}>
              <input type="hidden" name="tutor_id" value={row.id} />
              <input type="hidden" name="approved" value={String(!row.approved)} />
              <button type="submit" className={row.approved ? "btn ghost small" : "btn small"}>
                {row.approved ? t.admin.remove : t.admin.approve}
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
