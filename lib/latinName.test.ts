import { test } from "node:test";
import assert from "node:assert/strict";
import { latinName } from "./latinName.ts";

test("latinName writes Azerbaijani names in English letters", () => {
  assert.equal(latinName("Aysel Məmmədova"), "Aysel Mammadova");
  assert.equal(latinName("Şəhla Çələbiyeva"), "Shahla Chalabiyeva");
  assert.equal(latinName("Gülnar Ağayeva"), "Gulnar Aghayeva");
  assert.equal(latinName("İlkin Hüseynli"), "Ilkin Huseynli");
  assert.equal(latinName("Xəyal Rzayev"), "Xayal Rzayev");
});

test("latinName writes Russian names in English letters", () => {
  assert.equal(latinName("Анна Иванова"), "Anna Ivanova");
  assert.equal(latinName("Юлия Щербакова"), "Yuliya Shcherbakova");
  assert.equal(latinName("Пётр Хрущёв"), "Pyotr Khrushchyov");
});

test("latinName leaves English names alone", () => {
  assert.equal(latinName("  Yegana   Bayramova "), "Yegana Bayramova");
  assert.equal(latinName("José O'Neil"), "Jose O'Neil");
});
