/** Someone counts as online if the site heard from them within this window. */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isOnline(lastSeen: string | null | undefined, now = Date.now()): boolean {
  if (!lastSeen) return false;
  const t = new Date(lastSeen).getTime();
  return Number.isFinite(t) && now - t < ONLINE_WINDOW_MS;
}
