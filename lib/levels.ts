export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];

/** CEFR level names; kept in English everywhere, like on the certificate. */
export const LEVEL_NAME: Record<Level, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-Intermediate",
  C1: "Advanced",
  C2: "Proficiency",
};

export const TEST_PRICE = 3;
export const CERTIFICATE_PRICE = 5;

export const LESSON_PRICE: Record<Level, number> = {
  A1: 7,
  A2: 9,
  B1: 12,
  B2: 15,
  C1: 18,
  C2: 21,
};

/** Speaking club: two students of the same level practise one topic together. */
export const PRACTICE_PRICE = 2;
export const PRACTICE_MINUTES = 40;

/** Speaking club with the AI video teacher, by length in minutes. */
export const AI_CHAT_PRICE = { 15: 8, 30: 15, 60: 25 } as const;

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
  if (share < 0.25) return "A1";
  if (share < 0.42) return "A2";
  if (share < 0.59) return "B1";
  if (share < 0.75) return "B2";
  if (share < 0.9) return "C1";
  return "C2";
}

export function durationLabel(minutes: number, t: { common: { hour: string; min: string } }): string {
  return minutes === 60 ? t.common.hour : `${minutes} ${t.common.min}`;
}

export function money(amount: number | string): string {
  const n = Number(amount);
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

const BAKU = "Asia/Baku";
const INTL: Record<string, string> = { az: "az-AZ", en: "en-GB", ru: "ru-RU" };

export function formatDateTime(iso: string, locale = "az"): string {
  return new Intl.DateTimeFormat(INTL[locale] ?? "az-AZ", {
    timeZone: BAKU,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string, locale = "az"): string {
  return new Intl.DateTimeFormat(INTL[locale] ?? "az-AZ", {
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

/** "Aysel Məmmədova" → "Aysel M." so students see each other without full names. */
export function shortName(fullName: string): string {
  const [first = "", second = ""] = fullName.trim().split(/\s+/);
  return second ? `${first} ${second[0].toUpperCase()}.` : first;
}

/** Practice topic titles are stored in Azerbaijani with English and Russian versions. */
export function topicTitle(t: { title: string; title_en: string; title_ru: string }, locale: string): string {
  return (locale === "en" && t.title_en) || (locale === "ru" && t.title_ru) || t.title;
}

type LocalizedLesson = {
  title: string;
  summary?: string;
  title_en?: string | null;
  title_ru?: string | null;
  summary_en?: string | null;
  summary_ru?: string | null;
};

/** Lesson titles and summaries are stored in Azerbaijani with optional English and Russian versions. */
export function lessonText(l: LocalizedLesson, locale: string): { title: string; summary: string } {
  const pick = (base: string | undefined, en?: string | null, ru?: string | null) =>
    (locale === "en" && en) || (locale === "ru" && ru) || base || "";
  return { title: pick(l.title, l.title_en, l.title_ru), summary: pick(l.summary, l.summary_en, l.summary_ru) };
}
