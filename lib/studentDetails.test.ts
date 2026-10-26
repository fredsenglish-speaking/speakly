import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStudentDetails } from "./studentDetails.ts";

const good: Record<string, string> = {
  phone: "+994 50 123-45-67",
  birth_date: "2005-04-12",
  city: "Bakı",
  english_level: "unknown",
  goal: "exam",
  heard_from: "teacher",
  teacher_name: "Ms Jane",
  study_place: "uk",
};
const today = new Date("2026-10-26T00:00:00Z");
const parse = (over: Record<string, string> = {}) => parseStudentDetails((k) => ({ ...good, ...over })[k], today);

test("a full form is accepted and the phone is cleaned", () => {
  const r = parse();
  assert.ok("details" in r);
  assert.equal(r.details.phone, "+994501234567");
  assert.equal(r.details.study_place, "uk");
});

test("every question is required", () => {
  for (const key of Object.keys(good)) {
    const r = parse({ [key]: "" });
    assert.deepEqual(r, { error: key }, key);
  }
});

test("odd answers are rejected", () => {
  assert.deepEqual(parse({ phone: "12ab" }), { error: "phone" });
  assert.deepEqual(parse({ birth_date: "2025-01-01" }), { error: "birth_date" });
  assert.deepEqual(parse({ goal: "fun" }), { error: "goal" });
  assert.deepEqual(parse({ study_place: "mars" }), { error: "study_place" });
});
