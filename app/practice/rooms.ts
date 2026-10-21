import "server-only";

export const ROOM_COLUMNS =
  "id, level, starts_at, host_id, guest_id, host_paid, guest_paid, cancelled, meeting_url, " +
  "practice_topics(id, title, title_en, title_ru, questions), " +
  "host:profiles!practice_rooms_host_id_fkey(full_name), guest:profiles!practice_rooms_guest_id_fkey(full_name)";

export type Room = {
  id: string;
  level: string;
  starts_at: string;
  host_id: string;
  guest_id: string | null;
  host_paid: boolean;
  guest_paid: boolean;
  cancelled: boolean;
  meeting_url: string;
  practice_topics: { id: number; title: string; title_en: string; title_ru: string; questions: string[] };
  host: { full_name: string } | null;
  guest: { full_name: string } | null;
};

export type RoomStatus = "cancelled" | "waitingPartner" | "waitingPayment" | "ready";

export function roomStatus(r: Room): RoomStatus {
  if (r.cancelled) return "cancelled";
  if (!r.guest_id) return r.host_paid ? "waitingPartner" : "waitingPayment";
  return r.host_paid && r.guest_paid ? "ready" : "waitingPayment";
}
