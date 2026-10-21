import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

export type PaymentKind = "test" | "certificate" | "booking" | "lesson";

export type Payment = {
  id: string;
  user_id: string;
  kind: PaymentKind;
  ref_id: string;
  amount: number;
  status: string;
};

export const PAYMENT_COLUMNS = "id, user_id, kind, ref_id, amount, status";

export function paymentProvider() {
  return process.env.PAYMENT_PROVIDER?.trim() || "mock";
}

/**
 * Starts a payment and returns where to send the user next.
 *
 * With PAYMENT_PROVIDER=mock the payment is marked paid straight away, so the
 * whole site can be tested without a bank. With PAYMENT_PROVIDER=whatsapp the
 * student is sent to /pay/<id>, writes to the school on WhatsApp, and the
 * admin confirms the payment by hand in /admin (which calls `markPaid`).
 */
export async function startPayment(opts: {
  userId: string;
  kind: PaymentKind;
  refId: string;
  amount: number;
  successPath: string;
}): Promise<string> {
  const provider = paymentProvider();
  const db = createAdminClient();

  if (provider === "whatsapp") {
    // Pressing "buy" twice should not give the admin two payments to check.
    const { data: open } = await db
      .from("payments")
      .select("id")
      .eq("user_id", opts.userId)
      .eq("kind", opts.kind)
      .eq("ref_id", opts.refId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (open) return `/pay/${open.id}`;
  }

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
  if (provider === "whatsapp") return `/pay/${data.id}`;

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
    .select(PAYMENT_COLUMNS)
    .single<Payment>();
  if (!payment) return; // already handled

  await fulfil(payment);
}

/** Cancels a payment that was never made, and frees a held class slot. */
export async function cancelPayment(paymentId: string): Promise<void> {
  const db = createAdminClient();
  const { data: payment } = await db
    .from("payments")
    .update({ status: "failed" })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select(PAYMENT_COLUMNS)
    .single<Payment>();
  if (payment?.kind !== "booking") return;

  const { data: booking } = await db
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", payment.ref_id)
    .eq("status", "pending_payment")
    .select("slot_id")
    .single();
  if (booking?.slot_id) await db.from("tutor_slots").update({ booked: false }).eq("id", booking.slot_id);
}

/** Where the student goes once the payment is through. */
export async function successPathFor(p: Pick<Payment, "kind" | "ref_id">): Promise<string> {
  switch (p.kind) {
    case "test":
      return "/test";
    case "certificate":
      return `/test/result/${p.ref_id}`;
    case "booking":
      return "/dashboard";
    case "lesson": {
      const { data } = await createAdminClient().from("lessons").select("slug").eq("id", Number(p.ref_id)).single();
      return data ? `/lessons/${data.slug}` : "/lessons";
    }
  }
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
