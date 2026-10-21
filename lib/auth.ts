import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Level } from "./levels";

export type Profile = {
  id: string;
  full_name: string;
  role: "student" | "tutor" | "admin";
  level: Level | null;
};

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("id, full_name, role, level").eq("id", user.id).single();
  return (data as Profile | null) ?? null;
}

export async function requireUser(next: string): Promise<Profile> {
  const profile = await getCurrentUser();
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return profile;
}

export async function requireTutor(): Promise<Profile> {
  const profile = await requireUser("/tutor");
  if (profile.role !== "tutor" && profile.role !== "admin") redirect("/dashboard");
  return profile;
}
