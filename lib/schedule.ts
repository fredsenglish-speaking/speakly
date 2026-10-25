/**
 * Speaking club timetable: the school runs a room for every level every half
 * hour from 09:00 until midnight (Baku time). Each slot has a fixed topic, so
 * students only pick a time.
 */
export const SLOT_MINUTES = 30;
export const FIRST_SLOT_HOUR = 9;
export const LAST_SLOT_HOUR = 23; // the 23:30 slot ends at 00:00
export const SCHEDULE_DAYS = 7;

const SLOT_MS = SLOT_MINUTES * 60 * 1000;
const BAKU_OFFSET_MS = 4 * 60 * 60 * 1000; // Azerbaijan is UTC+4 all year

/** Today's date in Baku plus `offset` days, as YYYY-MM-DD. */
export function bakuDate(offset = 0, now = Date.now()): string {
  return new Date(now + BAKU_OFFSET_MS + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** All slot start times of one Baku day that have not started yet. */
export function slotsForDay(offset: number, now = Date.now()): string[] {
  const day = bakuDate(offset, now);
  const slots: string[] = [];
  for (let h = FIRST_SLOT_HOUR; h <= LAST_SLOT_HOUR; h++) {
    for (const m of [0, 30]) {
      const start = new Date(`${day}T${String(h).padStart(2, "0")}:${m ? "30" : "00"}:00+04:00`);
      if (start.getTime() > now) slots.push(start.toISOString());
    }
  }
  return slots;
}

/** True when `iso` is a future slot of the timetable within the bookable days. */
export function isOpenSlot(iso: string, now = Date.now()): boolean {
  for (let d = 0; d < SCHEDULE_DAYS; d++) if (slotsForDay(d, now).includes(iso)) return true;
  return false;
}

/** The topic of a slot: topics take turns, so each time of day gets a different one over the week. */
export function topicForSlot<T>(iso: string, topics: T[]): T | undefined {
  if (topics.length === 0) return undefined;
  return topics[Math.floor(new Date(iso).getTime() / SLOT_MS) % topics.length];
}

/** "09:30" in Baku time. */
export function slotTime(iso: string): string {
  return new Date(new Date(iso).getTime() + BAKU_OFFSET_MS).toISOString().slice(11, 16);
}
