import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/levels";
import { PAYMENT_KINDS } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { allEmails } from "@/lib/studentData";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].admin.users.title };
}

const ROLES = ["student", "tutor", "admin"] as const;

async function setFreeAccess(form: FormData) {
  "use server";
  const user = await requireUser("/admin/users");
  if (user.role !== "admin") redirect("/");
  const kinds = form.getAll("kind").map(String).filter((k) => (PAYMENT_KINDS as string[]).includes(k));
  await createAdminClient().from("profiles").update({ free_access: kinds }).eq("id", String(form.get("user_id")));
  revalidatePath("/admin/users");
}

type Person = { id: string; full_name: string; role: string; created_at: string; free_access: string[] | null };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const user = await requireUser("/admin/users");
  if (user.role !== "admin") redirect("/");
  const params = await searchParams;
  const role = (ROLES as readonly string[]).includes(params.role ?? "") ? params.role! : null;
  const q = (params.q ?? "").trim().toLocaleLowerCase("az");
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const U = t.admin.users;
  const db = createAdminClient();

  let query = db.from("profiles").select("id, full_name, role, created_at, free_access").order("created_at", { ascending: false });
  if (role) query = query.eq("role", role);
  const [{ data }, emails] = await Promise.all([query, allEmails(db)]);
  const people = ((data ?? []) as Person[]).filter(
    (p) => !q || p.full_name.toLocaleLowerCase("az").includes(q) || (emails.get(p.id) ?? "").toLowerCase().includes(q),
  );
  const href = (r: string | null) => `/admin/users?${new URLSearchParams({ ...(r ? { role: r } : {}), ...(q ? { q } : {}) })}`;

  return (
    <section className="stack">
      <Link href="/admin" className="btn ghost self-start">
        ← {t.admin.title}
      </Link>
      <h2>{U.title}</h2>
      <p className="muted small" style={{ maxWidth: "70ch" }}>
        {U.intro}
      </p>
      <form className="row" action="/admin/users">
        {role && <input type="hidden" name="role" value={role} />}
        <input type="text" name="q" defaultValue={params.q ?? ""} placeholder={U.search} style={{ maxWidth: 280 }} />
        <button type="submit" className="btn ghost small">
          {U.find}
        </button>
      </form>
      <nav className="filters">
        <Link href={href(null)} className="chip" aria-current={!role}>
          {t.common.all}
        </Link>
        {ROLES.map((r) => (
          <Link key={r} href={href(r)} className="chip" aria-current={role === r}>
            {U.roles[r]}
          </Link>
        ))}
      </nav>
      <p className="small muted">{U.count(people.length)}</p>
      {people.length === 0 ? (
        <p className="muted">{U.empty}</p>
      ) : (
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>{U.name}</th>
                <th>{U.email}</th>
                <th>{U.role}</th>
                <th>{U.registered}</th>
                <th>{U.freeAccess}</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td>{p.full_name || t.admin.unnamed}</td>
                  <td>{emails.get(p.id)}</td>
                  <td>{U.roles[p.role as (typeof ROLES)[number]] ?? p.role}</td>
                  <td>{formatDate(p.created_at, locale)}</td>
                  <td>
                    {p.role === "admin" ? (
                      <span className="small muted">{U.allFree}</span>
                    ) : (
                      <form action={setFreeAccess} className="free-access">
                        <input type="hidden" name="user_id" value={p.id} />
                        {PAYMENT_KINDS.map((k) => (
                          <label key={k} className="small">
                            <input type="checkbox" name="kind" value={k} defaultChecked={(p.free_access ?? []).includes(k)} /> {t.pay.kinds[k]}
                          </label>
                        ))}
                        <SubmitButton className="btn small">{t.common.save}</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
