import { getCurrentUser } from "@/lib/auth";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { loadStudentReport } from "@/lib/studentData";
import { studentColumns, studentRow } from "@/lib/studentRows";
import { buildXlsx } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

/** The student list as an Excel file, built fresh on every download. */
export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("Forbidden", { status: 403 });
  const t = DICTIONARIES[await getLocale()];
  const S = t.admin.students;
  const { students, stats, teachers } = await loadStudentReport();
  const file = buildXlsx([
    { name: S.sheetStudents, header: studentColumns(t), rows: students.map((s) => studentRow(s, stats.get(s.id), t)) },
    { name: S.sheetTeachers, header: [S.teacherCol, S.studentsCol], rows: teachers.map((x) => [x.teacher, x.count]) },
  ]);
  const name = `speakly-students-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
