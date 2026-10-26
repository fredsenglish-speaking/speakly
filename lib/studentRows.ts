// Labels the student report for one language: the same columns on the admin page and in the Excel file.
import type { Dictionary } from "./i18n/index.ts";
import { ageOn, type ReportStudent, type StudentStats } from "./studentReport.ts";

export function studentColumns(t: Dictionary): string[] {
  const c = t.admin.students.cols;
  return [
    c.registered, c.name, c.email, c.phone, c.birthDate, c.age, c.city, c.ownLevel, c.testLevel,
    c.goal, c.heardFrom, c.teacher, c.studyPlace, c.clubMonth, c.lessonsMonth, c.lessonsTotal, c.levelsDone,
  ];
}

export function studentRow(s: ReportStudent, st: StudentStats | undefined, t: Dictionary, now = new Date()): (string | number)[] {
  const D = t.auth.details;
  const d = s.details ?? {};
  const label = <T extends Record<string, string>>(map: T, key: string | undefined) => (key && key in map ? map[key] : key ?? "");
  const age = ageOn(d.birth_date, now);
  return [
    s.created_at.slice(0, 10),
    s.full_name,
    s.email,
    d.phone ?? (s.details ? "" : t.admin.students.noDetails),
    d.birth_date ?? "",
    age ?? "",
    d.city ?? "",
    d.english_level === "unknown" ? D.levelUnknown : d.english_level ?? "",
    s.level ?? "",
    label(D.goals, d.goal),
    label(D.heard, d.heard_from),
    d.teacher_name ?? "",
    label(D.places, d.study_place),
    st?.clubMonth ?? 0,
    st?.lessonsMonth ?? 0,
    st?.lessonsTotal ?? 0,
    st?.levelsDone.join(", ") ?? "",
  ];
}
