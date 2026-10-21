export const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type Level = (typeof LEVELS)[number];

export const TEST_PRICE = 3;
export const CERTIFICATE_PRICE = 5;

export const LESSON_PRICE: Record<Level, number> = {
  A1: 7,
  A2: 9,
  B1: 12,
  B2: 15,
  C1: 18,
};

export const DURATIONS = [15, 30, 60] as const;
export type Duration = (typeof DURATIONS)[number];

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

export function isDuration(value: number): value is Duration {
  return (DURATIONS as readonly number[]).includes(value);
}

/**
 * Maps a test score to a level. The bands are proportional to the number
 * of questions, so the test can grow without changing this function.
 */
export function levelForScore(score: number, total: number): Level {
  if (total <= 0) return "A1";
  const share = score / total;
  if (share < 0.3) return "A1";
  if (share < 0.5) return "A2";
  if (share < 0.7) return "B1";
  if (share < 0.9) return "B2";
  return "C1";
}

export function durationLabel(minutes: number): string {
  return minutes === 60 ? "1 saat" : `${minutes} dəq`;
}

export function money(amount: number | string): string {
  const n = Number(amount);
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

const BAKU = "Asia/Baku";

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: BAKU,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: BAKU,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** Azerbaijan is UTC+4 all year, so a datetime-local value maps to a fixed offset. */
export function bakuLocalToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00+04:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
