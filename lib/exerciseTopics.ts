// The exercise texts, kept apart from lib/exercises.ts so they stay out of the browser bundle.
import { parseExercises, type Exercise } from "./exercises.ts";
import a1 from "./exercises/a1.ts";
import a2 from "./exercises/a2.ts";
import b1 from "./exercises/b1.ts";
import b2 from "./exercises/b2.ts";
import c1 from "./exercises/c1.ts";
import c2 from "./exercises/c2.ts";

let all: Map<string, Exercise[]> | null = null;

/** Every lesson topic's tasks, by lesson slug. */
export function allExercises(): Map<string, Exercise[]> {
  all ??= parseExercises([a1, a2, b1, b2, c1, c2].join("\n"));
  return all;
}

export function exercisesFor(slug: string): Exercise[] {
  return allExercises().get(slug) ?? [];
}
