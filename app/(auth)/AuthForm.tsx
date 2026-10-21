"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});

  if (state.message) return <p className="notice">{state.message}</p>;

  return (
    <form action={action} className="stack">
      {mode === "signup" && (
        <>
          <label className="field">
            Ad və soyad
            <input type="text" name="full_name" id="full_name" required autoComplete="name" />
          </label>
          <div className="stack" style={{ gap: 6 }}>
            <span className="small muted">Mən…</span>
            <div className="choices">
              <label className="choice">
                <input type="radio" name="role" value="student" defaultChecked />
                <strong>Tələbəyəm</strong>
                <span className="small muted">İngiliscə danışmaq istəyirəm</span>
              </label>
              <label className="choice">
                <input type="radio" name="role" value="tutor" />
                <strong>Müəlliməm</strong>
                <span className="small muted">Dərs vermək istəyirəm</span>
              </label>
            </div>
          </div>
        </>
      )}
      <label className="field">
        E-poçt
        <input type="email" name="email" id="email" required autoComplete="email" />
      </label>
      <label className="field">
        Şifrə
        <input
          type="password"
          name="password"
          id="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </label>
      <input type="hidden" name="next" value={next ?? ""} />
      {state.error && <p className="error">{state.error}</p>}
      <SubmitButton className="btn self-start">{mode === "login" ? "Daxil ol" : "Qeydiyyatdan keç"}</SubmitButton>
      <p className="small muted">
        {mode === "login" ? (
          <>
            Hesabınız yoxdur? <Link href="/signup">Qeydiyyat</Link>
          </>
        ) : (
          <>
            Hesabınız var? <Link href="/login">Daxil olun</Link>
          </>
        )}
      </p>
    </form>
  );
}
