import { test } from "node:test";
import assert from "node:assert/strict";
import { ageOn, studentStats, teacherCounts, type ReportStudent } from "./studentReport.ts";

const now = new Date("2026-10-26T12:00:00Z");
const student = (id: string, teacher = ""): ReportStudent => ({
  id,
  full_name: id,
  email: `${id}@x.az`,
  level: null,
  created_at: "2026-10-01T00:00:00Z",
  details: { teacher_name: teacher },
});

test("counts paid club sessions of the last 30 days and finished lessons and levels", () => {
  const students = [student("a"), student("b")];
  const room = { host_id: "a", guest_id: "b", host_paid: true, guest_paid: true, cancelled: false };
  const rooms = [
    { ...room, starts_at: "2026-10-20T10:00:00Z" },
    { ...room, starts_at: "2026-10-21T10:00:00Z", guest_paid: false },
    { ...room, starts_at: "2026-09-01T10:00:00Z" }, // too old
    { ...room, starts_at: "2026-10-22T10:00:00Z", cancelled: true },
    { ...room, starts_at: "2026-10-30T10:00:00Z" }, // not yet held
  ];
  const lessons = [
    { id: 1, level: "A1" },
    { id: 2, level: "A1" },
    { id: 3, level: "A2" },
  ];
  const results = [
    { student_id: "a", lesson_id: 1, updated_at: "2026-10-10T00:00:00Z" },
    { student_id: "a", lesson_id: 2, updated_at: "2026-08-10T00:00:00Z" },
    { student_id: "b", lesson_id: 3, updated_at: "2026-10-10T00:00:00Z" },
  ];
  const s = studentStats(students, rooms, results, lessons, now);
  assert.deepEqual(s.get("a"), { clubMonth: 2, lessonsMonth: 1, lessonsTotal: 2, levelsDone: ["A1"] });
  assert.deepEqual(s.get("b"), { clubMonth: 1, lessonsMonth: 1, lessonsTotal: 1, levelsDone: ["A2"] });
});

test("groups teachers ignoring capitals and extra spaces", () => {
  const list = teacherCounts([student("a", "Ms Jane"), student("b", " ms  jane "), student("c", "Aygün"), student("d")]);
  assert.deepEqual(list, [
    { teacher: "Ms Jane", count: 2 },
    { teacher: "Aygün", count: 1 },
  ]);
});

test("age in whole years", () => {
  assert.equal(ageOn("2005-10-27", now), 20);
  assert.equal(ageOn("2005-10-26", now), 21);
  assert.equal(ageOn("", now), null);
});

test("teachers on the list are counted even with no students", () => {
  const list = teacherCounts([student("a", "ms jane")], ["Ms Jane", "Aygün"]);
  assert.deepEqual(list, [
    { teacher: "Ms Jane", count: 1 },
    { teacher: "Aygün", count: 0 },
  ]);
});
