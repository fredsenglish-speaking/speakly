import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { ResetForm } from "../PasswordForms";

export async function generateMetadata() {
  return { title: (await getT()).auth.resetTitle };
}

export default async function ResetPasswordPage() {
  // The link from the e-mail signs the person in; without that session there is nothing to reset.
  if (!(await getCurrentUser())) redirect("/forgot?expired=1");
  const t = await getT();
  return (
    <section className="panel stack narrow">
      <h2>{t.auth.resetTitle}</h2>
      <ResetForm />
    </section>
  );
}
