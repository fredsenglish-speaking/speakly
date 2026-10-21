import Link from "next/link";
import { money } from "@/lib/levels";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

/** Notice listing the student's payments still waiting for the admin to confirm them. */
export async function PendingPayments({ userId, kind }: { userId: string; kind?: string }) {
  const t = (await getT()).pay;
  let query = (await createClient())
    .from("payments")
    .select("id, kind, amount")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (kind) query = query.eq("kind", kind);
  const { data } = await query;
  if (!data?.length) return null;

  return (
    <div className="notice stack" style={{ gap: 6 }}>
      <strong>{t.waiting}</strong>
      {data.map((p) => (
        <span key={p.id} className="row between">
          <span>{t.kinds[p.kind]} · <span className="price">{money(Number(p.amount))}</span></span>
          <Link href={`/pay/${p.id}`}>{t.open}</Link>
        </span>
      ))}
    </div>
  );
}
