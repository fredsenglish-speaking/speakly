import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SubmitButton } from "@/components/SubmitButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { loadStudentReport } from "@/lib/studentData";
import { studentColumns, studentRow, teacherLabel } from "@/lib/studentRows";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].admin.students.title };
}

async function addTeacher(form: FormData) {
  "use server";
  const user = await requireUser("/admin/students");
  if (user.role !== "admin") redirect("/");
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  if (name.length >= 2) await createAdminClient().from("school_teachers").upsert({ name }, { onConflict: "name", ignoreDuplicates: true });
  revalidatePath("/admin/students");
}

async function removeTeacher(form: FormData) {
  "use server";
  const user = await requireUser("/admin/students");
  if (user.role !== "admin") redirect("/");
  // Students who already chose this teacher keep the name on their record.
  await createAdminClient().from("school_teachers").delete().eq("id", Number(form.get("id")));
  revalidatePath("/admin/students");
}

export default async function AdminStudentsPage() {
  const user = await requireUser("/admin/students");
  if (user.role !== "admin") redirect("/");
  const t = DICTIONARIES[await getLocale()];
  const S = t.admin.students;
  const { students, stats, teachers, listed } = await loadStudentReport();
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
      <div className="panel stack">
        <h3>{S.teacherList}</h3>
        <p className="small muted">{S.teacherListHint}</p>
        <form action={addTeacher} className="row">
          <input type="text" name="name" required minLength={2} placeholder={S.newTeacher} style={{ maxWidth: 320 }} />
          <SubmitButton className="btn small">{S.addTeacher}</SubmitButton>
        </form>
        {listed.length === 0 ? (
          <p className="small muted">{S.noTeachersYet}</p>
        ) : (
          <table className="list">
            <tbody>
              {listed.map((x) => (
                <tr key={x.id}>
                  <td>{x.name}</td>
                  <td style={{ textAlign: "right" }}>
                    <form action={removeTeacher}>
                      <input type="hidden" name="id" value={x.id} />
                      <SubmitButton className="btn ghost small">{S.removeTeacher}</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {teachers.length > 0 && (
        <div className="panel stack">
          <h3>{S.byTeacher}</h3>
          <table className="list">
            <tbody>
              {teachers.map((x) => (
                <tr key={x.teacher}>
                  <td>{teacherLabel(x.teacher, t)}</td>
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
