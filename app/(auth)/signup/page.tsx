import { AuthForm } from "../AuthForm";

export const metadata = { title: "Qeydiyyat" };

export default function SignupPage() {
  return (
    <section className="panel stack narrow">
      <h2>Qeydiyyat</h2>
      <AuthForm mode="signup" />
    </section>
  );
}
