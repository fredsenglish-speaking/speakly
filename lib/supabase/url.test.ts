import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSupabaseUrl } from "./url.ts";

test("normalizeSupabaseUrl keeps only the project address", () => {
  assert.equal(normalizeSupabaseUrl("https://abcd.supabase.co"), "https://abcd.supabase.co");
  assert.equal(normalizeSupabaseUrl(" https://abcd.supabase.co/ "), "https://abcd.supabase.co");
  assert.equal(normalizeSupabaseUrl("https://abcd.supabase.co/rest/v1/"), "https://abcd.supabase.co");
  assert.equal(normalizeSupabaseUrl("https://supabase.com/dashboard/project/abcd/settings/api"), "https://abcd.supabase.co");
});
