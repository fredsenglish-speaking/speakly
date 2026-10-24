/** Seconds of an AI conversation used so far, counting the part that is running now. */
export function usedSeconds(
  chat: { used_seconds: number; started_at: string | null; minutes: number },
  now = Date.now(),
): number {
  const running = chat.started_at ? (now - new Date(chat.started_at).getTime()) / 1000 : 0;
  return Math.min(chat.minutes * 60, chat.used_seconds + Math.max(0, Math.round(running)));
}
