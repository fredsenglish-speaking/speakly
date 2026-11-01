import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { formatDateTime, money } from "@/lib/levels";
import { cancelPayment, markPaid } from "@/lib/payments";
import { allEmails } from "@/lib/studentData";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentCode } from "@/lib/whatsapp";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].admin.orders.title };
}

const CONFIRMED_BY = "confirmed-by:";

/**
 * Confirm or cancel one certificate order. Admins only, on the server: the
 * student can never mark their own order paid. markPaid only moves a pending
 * order to paid, so pressing twice never makes a second certificate.
 */
async function reviewOrder(form: FormData) {
  "use server";
  const user = await requireUser("/admin/certificates");
  if (user.role !== "admin") redirect("/");
  const id = String(form.get("payment_id"));
  const { data: order } = await createAdminClient()
    .from("payments")
    .select("id")
    .eq("id", id)
    .eq("kind", "certificate")
    .maybeSingle();
  if (!order) return;
  // Who confirmed is kept with the payment (provider_ref), when in paid_at.
  if (form.get("decision") === "confirm") await markPaid(id, `${CONFIRMED_BY}${user.id}`);
  else await cancelPayment(id);
  revalidatePath("/admin/certificates");
}

type OrderRow = {
  id: string;
  user_id: string;
  ref_id: string;
  amount: number;
  status: string;
  provider: string;
  provider_ref: string | null;
  created_at: string;
  paid_at: string | null;
  profiles: { full_name: string } | null;
};

const FILTERS = ["pending", "paid", "failed"] as const;

export default async function CertificateOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser("/admin/certificates");
  if (user.role !== "admin") redirect("/");
  const { status } = await searchParams;
  const filter = FILTERS.find((f) => f === status) ?? null;
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const o = t.admin.orders;
  const db = createAdminClient();

  let query = db
    .from("payments")
    .select("id, user_id, ref_id, amount, status, provider, provider_ref, created_at, paid_at, profiles(full_name)")
    .eq("kind", "certificate")
    .order("created_at", { ascending: false })
    .limit(300);
  if (filter) query = query.eq("status", filter);
  const { data } = await query;
  const orders = (data ?? []) as unknown as OrderRow[];

  const attemptIds = [...new Set(orders.map((r) => r.ref_id))];
  const adminIds = [
    ...new Set(orders.map((r) => r.provider_ref).filter((r): r is string => !!r?.startsWith(CONFIRMED_BY)).map((r) => r.slice(CONFIRMED_BY.length))),
  ];
  const [{ data: attempts }, { data: certs }, { data: admins }, emails] = await Promise.all([
    attemptIds.length ? db.from("test_attempts").select("id, level").in("id", attemptIds) : Promise.resolve({ data: [] }),
    attemptIds.length ? db.from("certificates").select("attempt_id, code").in("attempt_id", attemptIds) : Promise.resolve({ data: [] }),
    adminIds.length ? db.from("profiles").select("id, full_name").in("id", adminIds) : Promise.resolve({ data: [] }),
    allEmails(db),
  ]);
  const levelOf = new Map((attempts ?? []).map((a: { id: string; level: string | null }) => [a.id, a.level]));
  const certOf = new Map((certs ?? []).map((c: { attempt_id: string; code: string }) => [c.attempt_id, c.code]));
  const adminName = new Map((admins ?? []).map((a: { id: string; full_name: string }) => [a.id, a.full_name]));

  return (
    <section className="stack">
      <div className="row between">
        <h2>{o.title}</h2>
        <Link href="/admin" className="btn ghost small">← {t.admin.title}</Link>
      </div>
      <p className="muted">{o.lead}</p>
      <nav className="row" style={{ gap: 6 }}>
        <Link href="/admin/certificates" className={filter ? "btn ghost small" : "btn small"}>{o.filterAll}</Link>
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/certificates?status=${f}`} className={filter === f ? "btn small" : "btn ghost small"}>
            {o.statuses[f]}
          </Link>
        ))}
      </nav>

      <div className="panel" style={{ overflowX: "auto" }}>
        {orders.length === 0 ? (
          <p className="muted small">{o.none}</p>
        ) : (
          <table className="list orders">
            <thead>
              <tr>
                <th>{o.order}</th>
                <th>{o.name}</th>
                <th>{o.email}</th>
                <th>{o.level}</th>
                <th>{o.amount}</th>
                <th>{o.date}</th>
                <th>{o.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((r) => {
                const by = r.provider_ref?.startsWith(CONFIRMED_BY) ? r.provider_ref.slice(CONFIRMED_BY.length) : null;
                const code = certOf.get(r.ref_id);
                return (
                  <tr key={r.id}>
                    <td className="price">{paymentCode(r.id)}</td>
                    <td>{r.profiles?.full_name || t.admin.unnamed}</td>
                    <td className="small">{emails.get(r.user_id) ?? ""}</td>
                    <td>{levelOf.get(r.ref_id) ?? "—"}</td>
                    <td className="price">{money(Number(r.amount))}</td>
                    <td className="small">{formatDateTime(r.created_at, locale)}</td>
                    <td>
                      <span className={`order-status ${r.status}`}>{o.statuses[r.status] ?? r.status}</span>
                      {r.status === "paid" && r.paid_at && (
                        <div className="small muted">
                          {by ? o.confirmedBy(adminName.get(by) || t.admin.unnamed, formatDateTime(r.paid_at, locale)) : formatDateTime(r.paid_at, locale)}
                        </div>
                      )}
                    </td>
                    <td>
                      {r.status === "pending" && (
                        <form action={reviewOrder} className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                          <input type="hidden" name="payment_id" value={r.id} />
                          <button type="submit" name="decision" value="confirm" className="btn small">{o.confirm}</button>
                          <button type="submit" name="decision" value="cancel" className="btn ghost small">{o.cancel}</button>
                        </form>
                      )}
                      {r.status === "paid" && code && (
                        <Link href={`/certificate/${code}`} className="btn ghost small">{o.certificate}</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
