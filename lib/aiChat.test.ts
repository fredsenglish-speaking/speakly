import { test } from "node:test";
import assert from "node:assert/strict";
import { usedSeconds } from "./aiChat.ts";

test("usedSeconds adds the running part and never passes the paid time", () => {
  const now = Date.parse("2026-10-24T12:00:00Z");
  assert.equal(usedSeconds({ used_seconds: 100, started_at: null, minutes: 15 }, now), 100);
  assert.equal(usedSeconds({ used_seconds: 100, started_at: "2026-10-24T11:59:00Z", minutes: 15 }, now), 160);
  assert.equal(usedSeconds({ used_seconds: 0, started_at: "2026-10-24T10:00:00Z", minutes: 15 }, now), 900);
});
