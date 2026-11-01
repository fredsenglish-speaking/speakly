/**
 * Which payment flow the site uses.
 *
 * "mock" marks every payment paid at once (no money moves), so it is only for
 * local work and Vercel preview links. On the live site (VERCEL_ENV=production)
 * mock is never used, even if PAYMENT_PROVIDER says so by mistake: payments go
 * through WhatsApp and an admin confirms them by hand.
 */
export function resolvePaymentProvider(configured: string | undefined, vercelEnv: string | undefined): string {
  const wanted = configured?.trim().toLowerCase() || "";
  if (vercelEnv === "production") return wanted && wanted !== "mock" ? wanted : "whatsapp";
  return wanted || "mock";
}
