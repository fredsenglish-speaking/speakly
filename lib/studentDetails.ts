// The extra questions a student answers at sign-up. Answers are stored as codes; labels live in the dictionaries.
import { LEVELS } from "./levels.ts";

export const STUDENT_LEVELS = [...LEVELS, "unknown"] as const;
export const GOALS = ["speaking", "exam", "work", "travel", "study", "other"] as const;
export const HEARD_FROM = ["instagram", "facebook", "tiktok", "google", "friend", "teacher", "other"] as const;
export const STUDY_PLACES = ["azerbaijan", "turkey", "uk", "usa", "canada", "germany", "russia", "other", "unsure"] as const;

export type StudentDetails = {
  phone: string;
  birth_date: string;
  city: string;
  english_level: (typeof STUDENT_LEVELS)[number];
  goal: (typeof GOALS)[number];
  heard_from: (typeof HEARD_FROM)[number];
  teacher_name: string;
  study_place: (typeof STUDY_PLACES)[number];
};

export type DetailsError = "phone" | "birth_date" | "city" | "english_level" | "goal" | "heard_from" | "teacher_name" | "study_place";

function pick<T extends readonly string[]>(list: T, value: string): T[number] | null {
  return (list as readonly string[]).includes(value) ? (value as T[number]) : null;
}

/** Reads and checks the sign-up answers. Every question must be answered. */
export function parseStudentDetails(
  get: (name: string) => unknown,
  today = new Date(),
): { details: StudentDetails } | { error: DetailsError } {
  const text = (name: string) => String(get(name) ?? "").trim().slice(0, 200);

  const phone = text("phone").replace(/[\s()-]/g, "");
  if (!/^\+?\d{7,15}$/.test(phone)) return { error: "phone" };

  const birth = text("birth_date");
  const born = new Date(`${birth}T00:00:00Z`);
  const age = (today.getTime() - born.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || Number.isNaN(age) || age < 3 || age > 100) return { error: "birth_date" };

  const city = text("city");
  if (city.length < 2) return { error: "city" };
  const english_level = pick(STUDENT_LEVELS, text("english_level"));
  if (!english_level) return { error: "english_level" };
  const goal = pick(GOALS, text("goal"));
  if (!goal) return { error: "goal" };
  const heard_from = pick(HEARD_FROM, text("heard_from"));
  if (!heard_from) return { error: "heard_from" };
  const teacher_name = text("teacher_name");
  if (teacher_name.length < 2) return { error: "teacher_name" };
  const study_place = pick(STUDY_PLACES, text("study_place"));
  if (!study_place) return { error: "study_place" };

  return { details: { phone, birth_date: birth, city, english_level, goal, heard_from, teacher_name, study_place } };
}
