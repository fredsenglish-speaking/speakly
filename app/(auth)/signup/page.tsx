import { getT } from "@/lib/i18n/server";
import { loadSchoolTeachers } from "@/lib/schoolTeachers";
import { AuthForm } from "../AuthForm";

export async function generateMetadata() {
  return { title: (await getT()).auth.signupTitle };
}

export default async function SignupPage() {
  const [t, teachers] = await Promise.all([getT(), loadSchoolTeachers()]);
  return (
    <section className="panel stack narrow">
      <h2>{t.auth.signupTitle}</h2>
      <AuthForm mode="signup" teachers={teachers.map((x) => x.name)} />
    </section>
  );
}
