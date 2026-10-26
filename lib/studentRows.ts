// Labels the student report for one language: the same columns on the admin page and in the Excel file.
import type { Dictionary } from "./i18n/index.ts";
import { NO_TEACHER } from "./studentDetails.ts";
import { ageOn, type ReportStudent, type StudentStats } from "./studentReport.ts";

export function studentColumns(t: Dictionary): string[] {
  const c = t.admin.students.cols;
  return [
    c.registered, c.name, c.email, c.phone, c.birthDate, c.age, c.city, c.ownLevel, c.testLevel,
    c.occupation, c.occupationLevel, c.occupationPlace, c.goal, c.heardFrom, c.teacher, c.studyPlace, c.clubMonth, c.lessonsMonth, c.lessonsTotal, c.levelsDone,
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
    label(D.occupations, d.occupation),
    occupationLevel(d.occupation, d.occupation_level, D),
    d.occupation_place ?? "",
    label(D.goals, d.goal),
    label(D.heard, d.heard_from),
    teacherLabel(d.teacher_name ?? "", t),
    label(D.places, d.study_place),
    st?.clubMonth ?? 0,
    st?.lessonsMonth ?? 0,
    st?.lessonsTotal ?? 0,
    st?.levelsDone.join(", ") ?? "",
  ];
}

function occupationLevel(occupation: string | undefined, level: string | undefined, D: Dictionary["auth"]["details"]): string {
  if (!level) return "";
  if (occupation === "pupil") return D.gradeOf(level);
  if (occupation === "student") return D.courseOf(level);
  return level;
}

/** A teacher name as shown to the admin: "none" becomes "I don't have a teacher". */
export function teacherLabel(name: string, t: Dictionary): string {
  return name === NO_TEACHER ? t.auth.details.noTeacher : name;
}
