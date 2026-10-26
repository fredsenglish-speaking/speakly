import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { studentStats, teacherCounts, type ReportStudent } from "@/lib/studentReport";

/** Every student with their sign-up answers and activity. Admin only: the caller must check the role. */
export async function loadStudentReport() {
  const db = createAdminClient();
  const [{ data: profiles }, { data: rooms }, { data: results }, { data: lessons }, emails] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name, level, created_at, student_details(phone, birth_date, city, english_level, goal, heard_from, teacher_name, study_place, occupation, occupation_level, occupation_place)")
      .eq("role", "student")
      .order("created_at", { ascending: false }),
    db.from("practice_rooms").select("host_id, guest_id, host_paid, guest_paid, cancelled, starts_at"),
    db.from("lesson_results").select("student_id, lesson_id, updated_at"),
    db.from("lessons").select("id, level"),
    allEmails(db),
  ]);
  const students: ReportStudent[] = (profiles ?? []).map((p) => {
    const d = p.student_details as unknown;
    return {
      id: p.id,
      full_name: p.full_name,
      level: p.level,
      created_at: p.created_at,
      email: emails.get(p.id) ?? "",
      details: (Array.isArray(d) ? d[0] : d) ?? null,
    };
  });
  return {
    students,
    stats: studentStats(students, rooms ?? [], results ?? [], lessons ?? []),
    teachers: teacherCounts(students),
  };
}

/** Email of every account, by user id (emails live in Supabase Auth, not in profiles). */
export async function allEmails(db: ReturnType<typeof createAdminClient>) {
  const emails = new Map<string, string>();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    for (const u of data.users) emails.set(u.id, u.email ?? "");
    if (data.users.length < 1000) break;
  }
  return emails;
}
