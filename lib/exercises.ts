/**
 * Free practice exercises: four kinds of tasks for every lesson topic.
 *
 * The content lives in lib/exercises/{level}.ts (loaded by lib/exerciseTopics.ts) as plain text, one task per line:
 *
 *   # a1-to-be                              starts the tasks of the lesson with this slug
 *   mc | I ___ a student. | am | is | are   choose the answer; the first option is the right one
 *   gap | She ___ my sister. | is           type the missing word; alternatives split by ";"
 *   tf | He are my brother. | He is my brother.   correct or wrong; "ok" when the sentence is right
 *   order | My brother is a doctor.         put the words in order; other right orders after ";"
 */

import { seededShuffle } from "./vocabQuiz.ts";

export const EXERCISE_KINDS = ["mc", "gap", "tf", "order"] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

export type Exercise =
  | { kind: "mc"; key: string; question: string; options: string[]; correct: number }
  | { kind: "gap"; key: string; question: string; answers: string[] }
  | { kind: "tf"; key: string; sentence: string; correct: boolean; fixed: string }
  | { kind: "order"; key: string; sentence: string; also: string[]; words: string[] };

/** Lower case, straight apostrophes, single spaces and no end punctuation, for comparing answers. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:]+$/g, "")
    .trim();
}

export function sentenceWords(sentence: string): string[] {
  return sentence.replace(/[.!?]+$/, "").trim().split(/\s+/);
}

export function parseExercises(text: string): Map<string, Exercise[]> {
  const topics = new Map<string, Exercise[]>();
  let list: Exercise[] | null = null;
  let slug = "";
  text.split("\n").forEach((raw, lineNo) => {
    const line = raw.trim();
    if (!line || line.startsWith("//")) return;
    if (line.startsWith("#")) {
      slug = line.slice(1).trim();
      list = topics.get(slug) ?? [];
      topics.set(slug, list);
      return;
    }
    if (!list) throw new Error(`Line ${lineNo + 1}: task before a "# slug" line`);
    const [kind, ...parts] = line.split("|").map((p) => p.trim());
    const key = `${slug}:${list.length}`;
    const bad = () => new Error(`Line ${lineNo + 1}: bad "${kind}" task: ${line}`);
    if (kind === "mc") {
      if (parts.length < 3) throw bad();
      const [question, ...options] = parts;
      const order = seededShuffle(options, key);
      list.push({ kind, key, question, options: order, correct: order.indexOf(options[0]) });
    } else if (kind === "gap") {
      if (parts.length !== 2 || !parts[0].includes("___")) throw bad();
      list.push({ kind, key, question: parts[0], answers: parts[1].split(";").map((a) => a.trim()) });
    } else if (kind === "tf") {
      if (parts.length !== 2) throw bad();
      const ok = parts[1].toLowerCase() === "ok";
      list.push({ kind, key, sentence: parts[0], correct: ok, fixed: ok ? parts[0] : parts[1] });
    } else if (kind === "order") {
      if (parts.length !== 1) throw bad();
      const [sentence, ...also] = parts[0].split(";").map((p) => p.trim());
      const words = sentenceWords(sentence);
      // A capital letter would give away the first word, so it is shown in lower case ("I" stays).
      if (!/^I\b/.test(words[0])) words[0] = words[0].toLowerCase();
      let mixed = seededShuffle(words, key);
      // A shuffle that happens to keep the right order would give the answer away.
      if (mixed.join(" ") === words.join(" ")) mixed = [...words.slice(1), words[0]];
      list.push({ kind, key, sentence, also, words: mixed });
    } else {
      throw bad();
    }
  });
  return topics;
}

export function isGapRight(task: Extract<Exercise, { kind: "gap" }>, typed: string): boolean {
  return task.answers.some((a) => normalize(a) === normalize(typed));
}

/** The words picked so far, as a sentence starting with a capital letter. */
export function orderLine(task: Extract<Exercise, { kind: "order" }>, picked: number[]): string {
  const line = picked.map((j) => task.words[j]).join(" ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

export function isOrderRight(task: Extract<Exercise, { kind: "order" }>, picked: string[]): boolean {
  // Commas don't count, so "If it rains, we stay" and "We stay if it rains" can both be right.
  const plain = (s: string) => normalize(s.replace(/,/g, ""));
  return [task.sentence, ...task.also].some((s) => plain(s) === plain(picked.join(" ")));
}

