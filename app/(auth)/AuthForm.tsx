"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/client";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});
  const t = useT();

  if (state.message) return <p className="notice">{state.message}</p>;

  return (
    <form action={action} className="stack">
      {mode === "signup" && (
        <>
          <label className="field">
            {t.auth.fullName}
            <input type="text" name="full_name" id="full_name" required autoComplete="name" />
          </label>
          <div className="stack" style={{ gap: 6 }}>
            <span className="small muted">{t.auth.iAm}</span>
            <div className="choices">
              <label className="choice">
                <input type="radio" name="role" value="student" defaultChecked />
                <strong>{t.auth.student}</strong>
                <span className="small muted">{t.auth.studentHint}</span>
              </label>
              <label className="choice">
                <input type="radio" name="role" value="tutor" />
                <strong>{t.auth.tutor}</strong>
                <span className="small muted">{t.auth.tutorHint}</span>
              </label>
            </div>
          </div>
        </>
      )}
      <label className="field">
        {t.auth.email}
        <input type="email" name="email" id="email" required autoComplete="email" />
      </label>
      <label className="field">
        {t.auth.password}
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
      <SubmitButton className="btn self-start">{mode === "login" ? t.auth.loginButton : t.auth.signupButton}</SubmitButton>
      <p className="small muted">
        {mode === "login" ? (
          <>
            {t.auth.noAccount} <Link href="/signup">{t.auth.signupLink}</Link>
          </>
        ) : (
          <>
            {t.auth.haveAccount} <Link href="/login">{t.auth.loginLink}</Link>
          </>
        )}
      </p>
    </form>
  );
}
