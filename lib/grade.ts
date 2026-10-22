export type Grade = "excellent" | "good" | "average" | "weak";

/** Lesson grade from the share of correct test answers: 90%+, 75%+, 50%+, below 50%. */
export function gradeFor(right: number, total: number): Grade {
  if (total <= 0) return "weak";
  const pct = (right / total) * 100;
  if (pct >= 90) return "excellent";
  if (pct >= 75) return "good";
  if (pct >= 50) return "average";
  return "weak";
}
