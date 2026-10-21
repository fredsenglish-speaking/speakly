import { test } from "node:test";
import assert from "node:assert/strict";
import { bakuLocalToIso, levelForScore, shortName, topicTitle } from "./levels.ts";

test("levelForScore bands for a 20 question test", () => {
  assert.equal(levelForScore(0, 20), "A1");
  assert.equal(levelForScore(5, 20), "A1");
  assert.equal(levelForScore(6, 20), "A2");
  assert.equal(levelForScore(10, 20), "B1");
  assert.equal(levelForScore(14, 20), "B2");
  assert.equal(levelForScore(17, 20), "B2");
  assert.equal(levelForScore(18, 20), "C1");
  assert.equal(levelForScore(20, 20), "C1");
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
