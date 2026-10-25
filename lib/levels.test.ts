import { test } from "node:test";
import assert from "node:assert/strict";
import { bakuLocalToIso, levelForAnswers, levelForScore, shortName, topicTitle } from "./levels.ts";

test("levelForScore bands for a 24 question test", () => {
  assert.equal(levelForScore(0, 24), "A1");
  assert.equal(levelForScore(5, 24), "A1");
  assert.equal(levelForScore(6, 24), "A2");
  assert.equal(levelForScore(10, 24), "A2");
  assert.equal(levelForScore(11, 24), "B1");
  assert.equal(levelForScore(14, 24), "B1");
  assert.equal(levelForScore(15, 24), "B2");
  assert.equal(levelForScore(17, 24), "B2");
  assert.equal(levelForScore(18, 24), "C1");
  assert.equal(levelForScore(21, 24), "C1");
  assert.equal(levelForScore(22, 24), "C2");
  assert.equal(levelForScore(24, 24), "C2");
});

/** 5 answers per level, with the given number right at each level from A1 up. */
function answers(...right: number[]) {
  return ["A1", "A2", "B1", "B2", "C1", "C2"].flatMap((level, i) =>
    Array.from({ length: 5 }, (_, k) => ({ level, correct: k < (right[i] ?? 0) })),
  );
}

test("levelForAnswers gives the highest level passed with 3 of 5", () => {
  assert.equal(levelForAnswers(answers()), "A1");
  assert.equal(levelForAnswers(answers(5, 2)), "A1");
  assert.equal(levelForAnswers(answers(5, 3, 2)), "A2");
  assert.equal(levelForAnswers(answers(5, 5, 4, 3, 1, 0)), "B2");
  assert.equal(levelForAnswers(answers(5, 5, 5, 5, 3, 2)), "C1");
  assert.equal(levelForAnswers(answers(5, 5, 5, 5, 5, 3)), "C2");
});

test("levelForAnswers stops at the first failed level", () => {
  assert.equal(levelForAnswers(answers(5, 2, 5, 5, 5, 5)), "A1");
  assert.equal(levelForAnswers(answers(5, 5, 5, 1, 5, 5)), "B1");
});

test("levelForAnswers falls back to score bands for untagged questions", () => {
  const untagged = Array.from({ length: 24 }, (_, i) => ({ level: null, correct: i < 18 }));
  assert.equal(levelForAnswers(untagged), "C1");
});

test("levelForScore handles an empty test", () => {
  assert.equal(levelForScore(0, 0), "A1");
});

test("bakuLocalToIso converts Baku time to UTC", () => {
  assert.equal(bakuLocalToIso("2026-10-21T19:00"), "2026-10-21T15:00:00.000Z");
  assert.equal(bakuLocalToIso("garbage"), null);
});

test("shortName keeps the first name and the initial of the surname", () => {
  assert.equal(shortName("Aysel Məmmədova"), "Aysel M.");
  assert.equal(shortName("  Yegana   bayramova "), "Yegana B.");
  assert.equal(shortName("Kamran"), "Kamran");
  assert.equal(shortName(""), "");
});

test("topicTitle picks the visitor's language", () => {
  const t = { title: "Ailə", title_en: "Family", title_ru: "Семья" };
  assert.equal(topicTitle(t, "az"), "Ailə");
  assert.equal(topicTitle(t, "en"), "Family");
  assert.equal(topicTitle(t, "ru"), "Семья");
});
