/** Turns a phone number as people write it (+994 50 123 45 67, 050-123-45-67) into wa.me digits. */
export function whatsappDigits(raw: string | undefined | null): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  // A local Azerbaijani number (0XX XXX XX XX) gets the country code.
  if (digits.length === 10 && digits.startsWith("0")) return `994${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** Short code the student and the admin can both read out, e.g. "3F9A1C". */
export function paymentCode(paymentId: string): string {
  return paymentId.replace(/-/g, "").slice(0, 6).toUpperCase();
}
