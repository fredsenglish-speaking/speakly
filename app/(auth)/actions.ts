"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: "E-poçt və ya şifrə yanlışdır." };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const fullName = String(form.get("full_name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const role = form.get("role") === "tutor" ? "tutor" : "student";
  if (!fullName) return { error: "Adınızı yazın." };
  if (password.length < 8) return { error: "Şifrə ən azı 8 simvol olmalıdır." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? ""),
    password,
    options: {
      data: { full_name: fullName, role },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Qeydiyyat tamamlandı. E-poçtunuza gələn linklə hesabınızı təsdiqləyin." };
  redirect(role === "tutor" ? "/tutor/profile" : "/test");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
