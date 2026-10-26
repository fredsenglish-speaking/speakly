// Turns students and their activity into the rows of the admin student list and its Excel file.
import type { StudentDetails } from "./studentDetails.ts";

export type ReportStudent = {
  id: string;
  full_name: string;
  email: string;
  level: string | null;
  created_at: string;
  details: Partial<StudentDetails> | null;
};
export type ReportRoom = {
  host_id: string;
  guest_id: string | null;
  host_paid: boolean;
  guest_paid: boolean;
  cancelled: boolean;
  starts_at: string;
};
export type ReportResult = { student_id: string; lesson_id: number; updated_at: string };
export type ReportLesson = { id: number; level: string };

export type StudentStats = {
  /** Speaking club sessions the student paid for and that took place in the last 30 days. */
  clubMonth: number;
  /** Lessons finished (final test done) in the last 30 days. */
  lessonsMonth: number;
  lessonsTotal: number;
  /** Levels where every lesson is finished, e.g. ["A1", "A2"]. */
  levelsDone: string[];
};

const DAY = 24 * 3600 * 1000;

export function studentStats(
  students: ReportStudent[],
  rooms: ReportRoom[],
  results: ReportResult[],
  lessons: ReportLesson[],
  now = new Date(),
): Map<string, StudentStats> {
  const since = now.getTime() - 30 * DAY;
  const stats = new Map<string, StudentStats>(
    students.map((s) => [s.id, { clubMonth: 0, lessonsMonth: 0, lessonsTotal: 0, levelsDone: [] }]),
  );
  for (const r of rooms) {
    const t = new Date(r.starts_at).getTime();
    if (r.cancelled || !r.guest_id || t < since || t > now.getTime()) continue;
    if (r.host_paid) {
      const s = stats.get(r.host_id);
      if (s) s.clubMonth++;
    }
    if (r.guest_paid) {
      const s = stats.get(r.guest_id);
      if (s) s.clubMonth++;
    }
  }
  const levelOf = new Map(lessons.map((l) => [l.id, l.level]));
  const perLevel = new Map<string, number>();
  for (const l of lessons) perLevel.set(l.level, (perLevel.get(l.level) ?? 0) + 1);
  const done = new Map<string, Map<string, number>>();
  for (const r of results) {
    const s = stats.get(r.student_id);
    const level = levelOf.get(r.lesson_id);
    if (!s || !level) continue;
    s.lessonsTotal++;
    if (new Date(r.updated_at).getTime() >= since) s.lessonsMonth++;
    const byLevel = done.get(r.student_id) ?? new Map<string, number>();
    byLevel.set(level, (byLevel.get(level) ?? 0) + 1);
    done.set(r.student_id, byLevel);
  }
  for (const [id, byLevel] of done) {
    const s = stats.get(id)!;
    s.levelsDone = [...perLevel.keys()].filter((l) => (byLevel.get(l) ?? 0) >= perLevel.get(l)!).sort();
  }
  return stats;
}

/** How many students named each teacher. Spelling and capitals are ignored when grouping. */
export function teacherCounts(students: ReportStudent[]): { teacher: string; count: number }[] {
  const groups = new Map<string, { teacher: string; count: number }>();
  for (const s of students) {
    const name = (s.details?.teacher_name ?? "").trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLocaleLowerCase("az");
    const g = groups.get(key) ?? { teacher: name, count: 0 };
    g.count++;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.teacher.localeCompare(b.teacher));
}

/** Whole years between a YYYY-MM-DD birth date and now. */
export function ageOn(birth: string | undefined | null, now = new Date()): number | null {
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const [y, m, d] = birth.split("-").map(Number);
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) age--;
  return age;
}
