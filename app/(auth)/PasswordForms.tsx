"use client";

import { useActionState } from "react";
import { requestPasswordReset, updatePassword, type AuthState } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/client";

/** Asks Supabase to e-mail a link for setting a new password. */
export function ForgotForm() {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  const t = useT();
  if (state.message) return <p className="notice">{state.message}</p>;
  return (
    <form action={action} className="stack">
      <p className="muted">{t.auth.forgotHint}</p>
      <label className="field">
        {t.auth.email}
        <input type="email" name="email" required autoComplete="email" />
      </label>
      {state.error && <p className="error">{state.error}</p>}
      <SubmitButton className="btn self-start">{t.auth.forgotButton}</SubmitButton>
    </form>
  );
}

/** Shown after the e-mailed link has signed the person in. */
export function ResetForm() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, {});
  const t = useT();
  return (
    <form action={action} className="stack">
      <label className="field">
        {t.auth.newPassword}
        <input type="password" name="password" required minLength={8} autoComplete="new-password" />
      </label>
      {state.error && <p className="error">{state.error}</p>}
      <SubmitButton className="btn self-start">{t.auth.resetButton}</SubmitButton>
    </form>
  );
}
