import { test } from "node:test";
import assert from "node:assert/strict";
import { allExercises } from "./exerciseTopics.ts";
import { EXERCISE_KINDS, isGapRight, isOrderRight, orderLine, parseExercises } from "./exercises.ts";
import { LEVELS } from "./levels.ts";

const sample = `
# a1-to-be
mc | I ___ a student. | am | is | are
gap | They ___ (not) here. | aren't; are not
tf | He are my brother. | He is my brother.
tf | I am happy. | ok
order | If it rains, we stay home.; We stay home if it rains.
`;

test("parses every kind of task", () => {
  const tasks = parseExercises(sample).get("a1-to-be")!;
  assert.deepEqual(tasks.map((t) => t.kind), ["mc", "gap", "tf", "tf", "order"]);
  const mc = tasks[0];
  assert.ok(mc.kind === "mc" && mc.options[mc.correct] === "am");
  const [, , wrong, right] = tasks;
  assert.ok(wrong.kind === "tf" && !wrong.correct && wrong.fixed === "He is my brother.");
  assert.ok(right.kind === "tf" && right.correct);
});

test("gap answers ignore case, spaces, apostrophe style and alternatives", () => {
  const gap = parseExercises(sample).get("a1-to-be")![1];
  assert.ok(gap.kind === "gap");
  assert.ok(isGapRight(gap, " Aren’t "));
  assert.ok(isGapRight(gap, "are  not"));
  assert.ok(!isGapRight(gap, "is"));
});

test("word order accepts any listed order and ignores commas", () => {
  const order = parseExercises(sample).get("a1-to-be")![4];
  assert.ok(order.kind === "order");
  assert.deepEqual([...order.words].sort(), ["if", "home", "it", "rains,", "stay", "we"].sort());
  assert.notEqual(order.words.join(" "), "if it rains, we stay home");
  assert.ok(isOrderRight(order, ["If", "it", "rains,", "we", "stay", "home"]));
  assert.ok(isOrderRight(order, ["we", "stay", "home", "If", "it", "rains,"]));
  assert.ok(!isOrderRight(order, ["we", "home", "stay", "If", "it", "rains,"]));
  assert.equal(orderLine(order, [order.words.indexOf("we"), order.words.indexOf("stay")]), "We stay");
});

test("rejects broken lines", () => {
  assert.throws(() => parseExercises("mc | a | b"));
  assert.throws(() => parseExercises("# x\ngap | no gap here | a"));
  assert.throws(() => parseExercises("# x\nquiz | a | b"));
});

test("all content parses, with 4 of each kind per topic and no duplicate options", () => {
  const all = allExercises();
  for (const level of LEVELS) {
    assert.ok([...all.keys()].some((slug) => slug.startsWith(level.toLowerCase() + "-")), `no topics for ${level}`);
  }
  for (const [slug, tasks] of all) {
    for (const kind of EXERCISE_KINDS) {
      assert.equal(tasks.filter((t) => t.kind === kind).length, 4, `${slug}: ${kind}`);
    }
    for (const t of tasks) {
      if (t.kind === "mc") assert.equal(new Set(t.options).size, t.options.length, `${slug}: ${t.question}`);
      if (t.kind === "order") assert.ok(isOrderRight(t, t.sentence.replace(/[.!?]+$/, "").split(/\s+/)), t.sentence);
      if (t.kind === "tf" && !t.correct) assert.notEqual(t.fixed, t.sentence, slug);
    }
  }
});
