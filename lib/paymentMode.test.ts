import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePaymentProvider } from "./paymentMode.ts";

test("the live site never uses mock payments", () => {
  assert.equal(resolvePaymentProvider(undefined, "production"), "whatsapp");
  assert.equal(resolvePaymentProvider("", "production"), "whatsapp");
  assert.equal(resolvePaymentProvider("mock", "production"), "whatsapp");
  assert.equal(resolvePaymentProvider(" MOCK ", "production"), "whatsapp");
  assert.equal(resolvePaymentProvider("whatsapp", "production"), "whatsapp");
});

test("previews and local work default to mock", () => {
  assert.equal(resolvePaymentProvider(undefined, "preview"), "mock");
  assert.equal(resolvePaymentProvider(undefined, undefined), "mock");
  assert.equal(resolvePaymentProvider("whatsapp", "preview"), "whatsapp");
});
