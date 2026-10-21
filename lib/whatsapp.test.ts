import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentCode, whatsappDigits, whatsappLink } from "./whatsapp.ts";

test("whatsappDigits accepts the usual ways of writing a number", () => {
  assert.equal(whatsappDigits("+994 50 123 45 67"), "994501234567");
  assert.equal(whatsappDigits("050-123-45-67"), "994501234567");
  assert.equal(whatsappDigits("994501234567"), "994501234567");
  assert.equal(whatsappDigits(""), null);
  assert.equal(whatsappDigits(undefined), null);
  assert.equal(whatsappDigits("123"), null);
});

test("whatsappLink encodes the message", () => {
  assert.equal(whatsappLink("994501234567", "Salam! Kod: AB 1"), "https://wa.me/994501234567?text=Salam!%20Kod%3A%20AB%201");
});

test("paymentCode is the first six hex digits", () => {
  assert.equal(paymentCode("3f9a1c2e-0000-4000-8000-000000000000"), "3F9A1C");
});
