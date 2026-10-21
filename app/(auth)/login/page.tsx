import { AuthForm } from "../AuthForm";

export const metadata = { title: "Daxil ol" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <section className="panel stack narrow">
      <h2>Daxil ol</h2>
      <AuthForm mode="login" next={next} />
    </section>
  );
}
