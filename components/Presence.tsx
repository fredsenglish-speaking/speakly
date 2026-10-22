"use client";

import { useEffect, useState } from "react";
import { answerInvite, heartbeat, type Invite } from "@/app/presence/actions";
import { shortName } from "@/lib/levels";
import { useT } from "@/lib/i18n/client";

/** Keeps the signed-in user "online" and shows speaking club invitations as they arrive. */
export function Presence() {
  const t = useT().practice;
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    let alive = true;
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      heartbeat()
        .then((list) => alive && setInvites(list))
        .catch(() => {});
    };
    beat();
    const id = setInterval(beat, 30_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  if (invites.length === 0) return null;
  return (
    <div className="invites" role="status">
      {invites.map((inv) => (
        <form
          key={inv.roomId}
          className="invite"
          action={answerInvite}
          onSubmit={() => setInvites((list) => list.filter((i) => i.roomId !== inv.roomId))}
        >
          <input type="hidden" name="room_id" value={inv.roomId} />
          <strong>{t.inviteFrom(shortName(inv.from), inv.topic)}</strong>
          <div className="row">
            <button className="btn small" type="submit" name="answer" value="accept">{t.accept}</button>
            <button className="btn ghost small" type="submit" name="answer" value="decline">{t.decline}</button>
          </div>
        </form>
      ))}
    </div>
  );
}
