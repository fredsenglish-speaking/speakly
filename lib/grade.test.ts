import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeFor } from "./grade.ts";

test("gradeFor uses 90 / 75 / 50 percent steps", () => {
  assert.equal(gradeFor(30, 30), "excellent");
  assert.equal(gradeFor(27, 30), "excellent");
  assert.equal(gradeFor(26, 30), "good");
  assert.equal(gradeFor(23, 30), "good");
  assert.equal(gradeFor(22, 30), "average");
  assert.equal(gradeFor(15, 30), "average");
  assert.equal(gradeFor(14, 30), "weak");
  assert.equal(gradeFor(0, 0), "weak");
});
