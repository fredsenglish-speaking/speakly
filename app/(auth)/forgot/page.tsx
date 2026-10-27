import { getT } from "@/lib/i18n/server";
import { ForgotForm } from "../PasswordForms";

export async function generateMetadata() {
  return { title: (await getT()).auth.forgotTitle };
}

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  const t = await getT();
  return (
    <section className="panel stack narrow">
      <h2>{t.auth.forgotTitle}</h2>
      {expired && <p className="notice">{t.auth.linkExpired}</p>}
      <ForgotForm />
    </section>
  );
}
