import { test } from "node:test";
import assert from "node:assert/strict";
import { bakuLocalToIso, levelForScore, shortName, topicTitle } from "./levels.ts";

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
