import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type SchoolTeacher = { id: number; name: string };

/** The teachers students can pick at sign-up, alphabetically. */
export async function loadSchoolTeachers(): Promise<SchoolTeacher[]> {
  const { data } = await createAdminClient().from("school_teachers").select("id, name");
  return (data ?? []).sort((a, b) => a.name.localeCompare(b.name, "az"));
}
