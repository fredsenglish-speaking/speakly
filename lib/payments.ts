import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

export type PaymentKind = "test" | "certificate" | "booking" | "lesson";

type Payment = {
  id: string;
  user_id: string;
  kind: PaymentKind;
  ref_id: string;
  amount: number;
  status: string;
};

/**
 * Starts a payment and returns where to send the user next.
 *
 * With PAYMENT_PROVIDER=mock the payment is marked paid straight away, so the
 * whole site can be tested without a bank. A real provider would instead
 * return its checkout page URL and call `markPaid` from its webhook.
 */
export async function startPayment(opts: {
  userId: string;
  kind: PaymentKind;
  refId: string;
  amount: number;
  successPath: string;
}): Promise<string> {
  const provider = process.env.PAYMENT_PROVIDER ?? "mock";
  const db = createAdminClient();
  const { data, error } = await db
    .from("payments")
    .insert({ user_id: opts.userId, kind: opts.kind, ref_id: opts.refId, amount: opts.amount, provider })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not create payment: ${error?.message}`);

  if (provider === "mock") {
    await markPaid(data.id, null);
    return opts.successPath;
  }

  throw new Error(`Payment provider "${provider}" is not set up yet`);
}

/** Marks a payment paid and gives the user what they bought. Safe to call twice. */
export async function markPaid(paymentId: string, providerRef: string | null): Promise<void> {
  const db = createAdminClient();
  const { data: payment } = await db
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString(), provider_ref: providerRef })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id, user_id, kind, ref_id, amount, status")
    .single<Payment>();
  if (!payment) return; // already handled

  await fulfil(payment);
}

async function fulfil(p: Payment) {
  const db = createAdminClient();
  switch (p.kind) {
    case "test": {
      await db.from("test_attempts").update({ paid: true }).eq("id", p.ref_id).eq("student_id", p.user_id);
      return;
    }
    case "certificate": {
      const { data: attempt } = await db
        .from("test_attempts")
        .select("id, level, student_id, profiles(full_name)")
        .eq("id", p.ref_id)
        .eq("student_id", p.user_id)
        .single();
      if (!attempt?.level) return;
      const profile = attempt.profiles as unknown as { full_name: string } | null;
      await db.from("certificates").upsert(
        {
          attempt_id: attempt.id,
          student_id: p.user_id,
          code: certificateCode(attempt.level),
          full_name: profile?.full_name || "",
          level: attempt.level,
        },
        { onConflict: "attempt_id", ignoreDuplicates: true },
      );
      return;
    }
    case "booking": {
      const { data: booking } = await db
        .from("bookings")
        .update({ status: "scheduled" })
        .eq("id", p.ref_id)
        .eq("student_id", p.user_id)
        .select("slot_id")
        .single();
      if (booking?.slot_id) await db.from("tutor_slots").update({ booked: true }).eq("id", booking.slot_id);
      return;
    }
    case "lesson": {
      await db
        .from("lesson_purchases")
        .upsert({ student_id: p.user_id, lesson_id: Number(p.ref_id) }, { ignoreDuplicates: true });
      return;
    }
  }
}

function certificateCode(level: string) {
  return `SPK-${level}-${randomBytes(4).toString("hex").toUpperCase()}`;
}
