import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { loadStudentReport } from "@/lib/studentData";
import { studentColumns, studentRow } from "@/lib/studentRows";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].admin.students.title };
}

export default async function AdminStudentsPage() {
  const user = await requireUser("/admin/students");
  if (user.role !== "admin") redirect("/");
  const t = DICTIONARIES[await getLocale()];
  const S = t.admin.students;
  const { students, stats, teachers } = await loadStudentReport();
  const columns = studentColumns(t);

  return (
    <section className="stack">
      <Link href="/admin" className="btn ghost self-start">
        ← {t.admin.title}
      </Link>
      <div className="row between">
        <h2>{S.title}</h2>
        <a href="/admin/students/excel" className="btn" download>
          ⬇ {S.download}
        </a>
      </div>
      <p className="muted small">
        {S.count(students.length)}. {S.downloadHint}
      </p>
      {teachers.length > 0 && (
        <div className="panel stack">
          <h3>{S.byTeacher}</h3>
          <table className="list">
            <tbody>
              {teachers.map((x) => (
                <tr key={x.teacher}>
                  <td>{x.teacher}</td>
                  <td style={{ textAlign: "right" }}>
                    <strong>{x.count}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {students.length === 0 ? (
        <p className="muted">{S.empty}</p>
      ) : (
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  {studentRow(s, stats.get(s.id), t).map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
