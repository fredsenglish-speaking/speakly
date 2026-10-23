import { test } from "node:test";
import assert from "node:assert/strict";
import { gapAnswer, gapSentence, seededShuffle, vocabFinal, vocabPractice, type VocabItem } from "./vocabQuiz.ts";

const words: VocabItem[] = ["teacher", "student", "doctor", "friend", "brother"].map((w, i) => ({
  id: i + 1,
  kind: "word",
  term: w,
  az: `az-${w}`,
  ru: `ru-${w}`,
  example: `My [${w}] is here.`,
}));
const phrasals: VocabItem[] = ["come in", "sit down", "stand up", "wake up"].map((p, i) => ({
  id: 10 + i,
  kind: "phrasal",
  term: p,
  az: `az-${p}`,
  ru: `ru-${p}`,
  example: `Please [${p}] now.`,
}));
const vocab = [...words, ...phrasals];
const meaningOf = (t: string) => `What is ${t}?`;

test("gap helpers", () => {
  assert.equal(gapAnswer("Please [come in] now."), "come in");
  assert.equal(gapSentence("Please [come in] now."), "Please _____ now.");
});

test("seededShuffle is stable and keeps every item", () => {
  const a = seededShuffle([1, 2, 3, 4, 5], "x");
  assert.deepEqual(a, seededShuffle([1, 2, 3, 4, 5], "x"));
  assert.deepEqual([...a].sort(), [1, 2, 3, 4, 5]);
});

test("vocabulary test asks meanings in az/ru and gaps in en", () => {
  const az = vocabPractice(vocab, "az", meaningOf);
  assert.equal(az.length, vocab.length);
  assert.equal(az[0].question, "What is teacher?");
  assert.equal(az[0].options[az[0].correct], "az-teacher");
  assert.equal(az[0].options.length, 4);
  assert.equal(new Set(az[0].options).size, 4);
  const p = az[5];
  assert.equal(p.question, "Please _____ now.");
  assert.equal(p.options[p.correct], "come in");
  assert.ok(p.options.every((o) => phrasals.some((x) => x.term === o)));
  const en = vocabPractice(vocab, "en", meaningOf);
  assert.equal(en[0].options[en[0].correct], "teacher");
  assert.equal(vocabPractice(vocab, "ru", meaningOf)[0].options[0].startsWith("ru-"), true);
});

test("final test takes up to 7 words and 3 phrasal verbs", () => {
  const f = vocabFinal(vocab, "az", meaningOf);
  assert.equal(f.length, 5 + 3);
  assert.equal(new Set(f.map((q) => q.key)).size, f.length);
  f.forEach((q) => assert.ok(q.correct >= 0));
});
