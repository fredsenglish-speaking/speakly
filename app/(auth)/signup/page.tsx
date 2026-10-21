import { getT } from "@/lib/i18n/server";
import { AuthForm } from "../AuthForm";

export async function generateMetadata() {
  return { title: (await getT()).auth.signupTitle };
}

export default async function SignupPage() {
  const t = await getT();
  return (
    <section className="panel stack narrow">
      <h2>{t.auth.signupTitle}</h2>
      <AuthForm mode="signup" />
    </section>
  );
}
