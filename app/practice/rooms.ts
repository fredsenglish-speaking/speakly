import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type Person = { id: string; full_name: string; avatar_url: string | null };
type Topic = { id: number; title: string; title_en: string; title_ru: string; questions: string[] };

export type Room = {
  id: string;
  level: string;
  starts_at: string;
  host_id: string;
  guest_id: string | null;
  invited_id: string | null;
  host_paid: boolean;
  guest_paid: boolean;
  cancelled: boolean;
  meeting_url: string;
  topic: Topic;
  host: Person | null;
  guest: Person | null;
  invited: Person | null;
};

const COLUMNS =
  "id, level, starts_at, host_id, guest_id, invited_id, host_paid, guest_paid, cancelled, meeting_url, topic_id";

type Filter = (q: ReturnType<ReturnType<ReturnType<typeof createAdminClient>["from"]>["select"]>) => typeof q;

/**
 * Loads rooms with their topic and people. Topics and profiles are fetched in
 * separate queries rather than as embedded joins, so a stale API schema cache
 * can't make every room disappear.
 */
export async function loadRooms(filter: Filter): Promise<Room[]> {
  const db = createAdminClient();
  const { data: rows, error } = await filter(db.from("practice_rooms").select(COLUMNS));
  if (error) {
    console.error("practice_rooms query failed", error);
    return [];
  }
  const rooms = (rows ?? []) as unknown as (Omit<Room, "topic" | "host" | "guest" | "invited"> & { topic_id: number })[];
  if (rooms.length === 0) return [];

  const topicIds = [...new Set(rooms.map((r) => r.topic_id))];
  const peopleIds = [...new Set(rooms.flatMap((r) => [r.host_id, r.guest_id, r.invited_id]).filter(Boolean))] as string[];
  const [{ data: topics }, { data: people }] = await Promise.all([
    db.from("practice_topics").select("id, title, title_en, title_ru, questions").in("id", topicIds),
    db.from("profiles").select("id, full_name, avatar_url").in("id", peopleIds),
  ]);
  const topicById = new Map((topics ?? []).map((t) => [t.id, t as Topic]));
  const personById = new Map((people ?? []).map((p) => [p.id, p as Person]));
  const person = (id: string | null) => (id ? personById.get(id) ?? null : null);

  return rooms
    .filter((r) => topicById.has(r.topic_id))
    .map((r) => ({
      ...r,
      topic: topicById.get(r.topic_id)!,
      host: person(r.host_id),
      guest: person(r.guest_id),
      invited: person(r.invited_id),
    }));
}

export type RoomStatus = "cancelled" | "invited" | "waitingPartner" | "ready";

export function roomStatus(r: Pick<Room, "cancelled" | "guest_id" | "invited_id">): RoomStatus {
  if (r.cancelled) return "cancelled";
  if (r.guest_id) return "ready";
  return r.invited_id ? "invited" : "waitingPartner";
}
