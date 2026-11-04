import { CERTIFICATE_PRICE, LESSON_PRICE, LEVEL_PRICE, LEVELS, PRACTICE_MINUTES, PRACTICE_PRICE, money } from "@/lib/levels";

/** Prices quoted in the About, FAQ and Terms texts, taken from lib/levels so the pages never drift from the real prices. */
export function priceFacts() {
  return {
    cert: money(CERTIFICATE_PRICE),
    club: money(PRACTICE_PRICE),
    min: PRACTICE_MINUTES,
    lesson: money(Math.min(...LEVELS.map((l) => LESSON_PRICE[l]))),
    level: money(Math.min(...LEVELS.map((l) => LEVEL_PRICE[l]))),
  };
}
