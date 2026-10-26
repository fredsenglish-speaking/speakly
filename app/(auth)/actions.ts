"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { parseStudentDetails } from "@/lib/studentDetails";

export type AuthState = { error?: string; message?: string };

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) {
    const t = (await getT()).auth;
    return { error: error.code === "email_not_confirmed" ? t.errNotConfirmed : t.errWrong };
  }
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const fullName = String(form.get("full_name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const role = form.get("role") === "tutor" ? "tutor" : "student";
  const t = await getT();
  if (!fullName) return { error: t.auth.errName };
  if (password.length < 8) return { error: t.auth.errPassword };
  let details = {};
  if (role === "student") {
    const parsed = parseStudentDetails((name) => form.get(name));
    if ("error" in parsed) return { error: t.auth.details.errors[parsed.error] };
    details = parsed.details;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? ""),
    password,
    options: {
      data: { full_name: fullName, role, ...details },
      emailRedirectTo: `${await siteUrl()}/auth/confirm`,
    },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: t.auth.confirmEmail };
  redirect(role === "tutor" ? "/tutor/profile" : "/test");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
