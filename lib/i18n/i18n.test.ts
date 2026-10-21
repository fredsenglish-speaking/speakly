import { test } from "node:test";
import assert from "node:assert/strict";
import { localeFromHeader } from "./index.ts";
import az from "./az.ts";
import en from "./en.ts";
import ru from "./ru.ts";

function keys(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

test("every language has the same keys", () => {
  assert.deepEqual(keys(en).sort(), keys(az).sort());
  assert.deepEqual(keys(ru).sort(), keys(az).sort());
});

test("localeFromHeader picks the first supported language", () => {
  assert.equal(localeFromHeader("ru-RU,ru;q=0.9,en;q=0.8"), "ru");
  assert.equal(localeFromHeader("de-DE,en;q=0.5"), "en");
  assert.equal(localeFromHeader("fr"), "az");
  assert.equal(localeFromHeader(null), "az");
});
