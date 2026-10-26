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
  occupation: "pupil",
  occupation_level: "9",
  occupation_place: "20 nömrəli məktəb",
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

test("the extra questions follow the occupation", () => {
  assert.deepEqual(parse({ occupation_level: "12" }), { error: "occupation_level" });
  const uni = parse({ occupation: "student", occupation_level: "master", occupation_place: "BDU" });
  assert.ok("details" in uni && uni.details.occupation_level === "master");
  assert.deepEqual(parse({ occupation: "working", occupation_level: "" }), { error: "occupation_level" });
  const other = parse({ occupation: "other", occupation_level: "ignored", occupation_place: "Evdar qadınam" });
  assert.ok("details" in other && other.details.occupation_level === "");
  assert.deepEqual(parse({ occupation: "other", occupation_place: "" }), { error: "occupation_place" });
});
