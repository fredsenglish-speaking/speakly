import "server-only";
import { getCurrentUser } from "./auth";
import type { Level } from "./levels";

/**
 * Who sees which free materials: a student only their own level from the placement test,
 * tutors and admins every level, everyone else nothing until they take the test.
 */
export type MaterialsAccess = { kind: "all" } | { kind: "level"; level: Level } | { kind: "locked" };

export async function materialsAccess(): Promise<MaterialsAccess> {
  const user = await getCurrentUser();
  if (user?.role === "tutor" || user?.role === "admin") return { kind: "all" };
  if (user?.level) return { kind: "level", level: user.level };
  return { kind: "locked" };
}
