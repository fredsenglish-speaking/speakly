import { test } from "node:test";
import assert from "node:assert/strict";
import { isOnline } from "./presence.ts";

test("isOnline is true only within the last two minutes", () => {
  const now = Date.parse("2026-10-22T12:00:00Z");
  assert.equal(isOnline("2026-10-22T11:59:00Z", now), true);
  assert.equal(isOnline("2026-10-22T11:57:59Z", now), false);
  assert.equal(isOnline(null, now), false);
  assert.equal(isOnline("not a date", now), false);
});
