import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { requireUser } from "@/lib/auth";
import { levelFromPurchaseRef, money } from "@/lib/levels";
import { PAYMENT_COLUMNS, successPathFor, type Payment } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";
import { paymentCode, whatsappDigits, whatsappLink } from "@/lib/whatsapp";

export async function generateMetadata() {
  return { title: (await getT()).pay.title };
}

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/pay/${id}`);
  const t = (await getT()).pay;
  const { data } = await createAdminClient()
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const payment = data as Payment;

  const level = levelFromPurchaseRef(payment.ref_id);
  const kind = level ? `${t.kinds[payment.kind]} (${t.wholeLevel(level)})` : t.kinds[payment.kind];
  const amount = money(Number(payment.amount));
  const code = paymentCode(payment.id);
  const number = whatsappDigits(process.env.WHATSAPP_NUMBER);
  const isCertificate = payment.kind === "certificate";
  // A certificate order names the test level, so the admin knows what is being paid for.
  const { data: attempt } = isCertificate
    ? await createAdminClient().from("test_attempts").select("level").eq("id", payment.ref_id).eq("student_id", user.id).maybeSingle()
    : { data: null };
  const text =
    isCertificate && attempt?.level
      ? t.certMessage({ code, name: user.full_name, level: String(attempt.level), amount })
      : t.message({ kind, amount, code, name: user.full_name });

  return (
    <section className="panel stack narrow">
      <h2>{t.title}</h2>
      <table className="list">
        <tbody>
          <tr><td className="muted">{t.what}</td><td>{kind}</td></tr>
          <tr><td className="muted">{t.amount}</td><td className="price">{amount}</td></tr>
          <tr><td className="muted">{t.code}</td><td className="price">{code}</td></tr>
        </tbody>
      </table>

      {payment.status === "paid" && (
        <>
          <p className="notice">{t.paid}</p>
          <Link href={await successPathFor(payment)} className="btn self-start">{t.continue}</Link>
        </>
      )}

      {payment.status === "pending" && (
        <>
          <p>{isCertificate ? t.certHowTo : t.howTo}</p>
          {number ? (
            <a
              className="btn gold self-start"
              href={whatsappLink(number, text)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.whatsapp}
            </a>
          ) : (
            <p className="error">{t.noNumber}</p>
          )}
          <p className="small muted">{t.pending}</p>
          <Link href={`/pay/${payment.id}`} className="btn ghost small self-start">{t.check}</Link>
          <AutoRefresh />
        </>
      )}

      {payment.status !== "paid" && payment.status !== "pending" && <p className="error">{t.cancelled}</p>}
    </section>
  );
}
