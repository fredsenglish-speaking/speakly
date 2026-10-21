import { getT } from "@/lib/i18n/server";
import { AuthForm } from "../AuthForm";

export async function generateMetadata() {
  return { title: (await getT()).auth.loginTitle };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; confirmed?: string }> }) {
  const { next, confirmed } = await searchParams;
  const t = await getT();
  return (
    <section className="panel stack narrow">
      <h2>{t.auth.loginTitle}</h2>
      {confirmed && <p className="notice">{t.auth.confirmed}</p>}
      <AuthForm mode="login" next={next} />
    </section>
  );
}
