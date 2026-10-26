"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/client";
import { GOALS, HEARD_FROM, STUDENT_LEVELS, STUDY_PLACES } from "@/lib/studentDetails";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});
  const t = useT();
  const [role, setRole] = useState<"student" | "tutor">("student");

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
                <input type="radio" name="role" value="student" checked={role === "student"} onChange={() => setRole("student")} />
                <strong>{t.auth.student}</strong>
                <span className="small muted">{t.auth.studentHint}</span>
              </label>
              <label className="choice">
                <input type="radio" name="role" value="tutor" checked={role === "tutor"} onChange={() => setRole("tutor")} />
                <strong>{t.auth.tutor}</strong>
                <span className="small muted">{t.auth.tutorHint}</span>
              </label>
            </div>
          </div>
          {role === "student" && <StudentQuestions />}
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

/** The questions only students answer at sign-up. All are required. */
function StudentQuestions() {
  const t = useT();
  const D = t.auth.details;
  const select = (name: string, label: string, options: readonly string[], labelOf: (o: string) => string) => (
    <label className="field">
      {label}
      <select name={name} required defaultValue="">
        <option value="" disabled>
          {D.choose}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labelOf(o)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <fieldset className="stack signup-details">
      <legend>{D.title}</legend>
      <label className="field">
        {D.phone}
        <input type="tel" name="phone" required autoComplete="tel" placeholder={D.phoneHint} pattern="[+0-9 ()\-]{7,20}" />
      </label>
      <label className="field">
        {D.birthDate}
        <input type="date" name="birth_date" required autoComplete="bday" />
      </label>
      <label className="field">
        {D.city}
        <input type="text" name="city" required minLength={2} placeholder={D.cityHint} />
      </label>
      {select("english_level", D.level, STUDENT_LEVELS, (o) => (o === "unknown" ? D.levelUnknown : o))}
      {select("goal", D.goal, GOALS, (o) => D.goals[o as keyof typeof D.goals])}
      {select("heard_from", D.heardFrom, HEARD_FROM, (o) => D.heard[o as keyof typeof D.heard])}
      <label className="field">
        {D.teacher}
        <input type="text" name="teacher_name" required minLength={2} placeholder={D.teacherHint} />
      </label>
      {select("study_place", D.studyPlace, STUDY_PLACES, (o) => D.places[o as keyof typeof D.places])}
    </fieldset>
  );
}
