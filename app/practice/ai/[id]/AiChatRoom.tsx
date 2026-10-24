"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LiveAvatarSession } from "@heygen/liveavatar-web-sdk";
import { useT } from "@/lib/i18n/client";
import { endAiChat, startAiChat } from "../actions";

type Line = { who: "you" | "teacher"; text: string };
type Status = "idle" | "connecting" | "live" | "dropped" | "over";

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function AiChatRoom({ chatId, secondsLeft, questions }: { chatId: string; secondsLeft: number; questions: string[] }) {
  const t = useT().aiChat;
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const endingRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [left, setLeft] = useState(secondsLeft);
  const [muted, setMuted] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);

  async function finish() {
    if (endingRef.current) return;
    endingRef.current = true;
    const session = sessionRef.current;
    sessionRef.current = null;
    await session?.stop().catch(() => {});
    await endAiChat(chatId);
    setStatus("over");
    router.refresh();
  }

  async function start() {
    setError("");
    setStatus("connecting");
    const res = await startAiChat(chatId);
    if ("error" in res) {
      setError(res.error);
      setStatus("idle");
      return;
    }
    setLeft(res.seconds);
    const { LiveAvatarSession, SessionEvent, AgentEventsEnum } = await import("@heygen/liveavatar-web-sdk");
    const session = new LiveAvatarSession(res.token, { autoKeepAlive: true, voiceChat: {} });
    sessionRef.current = session;
    session.on(SessionEvent.SESSION_STREAM_READY, () => {
      if (videoRef.current) session.attach(videoRef.current);
      setStatus("live");
    });
    session.on(SessionEvent.SESSION_DISCONNECTED, () => {
      // A drop we didn't ask for: the student can reconnect with the time that is left.
      if (sessionRef.current === session && !endingRef.current) {
        sessionRef.current = null;
        setStatus("dropped");
      }
    });
    session.on(AgentEventsEnum.USER_TRANSCRIPTION, (e) => setLines((l) => [...l, { who: "you", text: e.text }]));
    session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, (e) => setLines((l) => [...l, { who: "teacher", text: e.text }]));
    try {
      await session.start();
    } catch (e) {
      console.error(e);
      sessionRef.current = null;
      setError(t.errStart);
      setStatus("idle");
    }
  }

  async function toggleMute() {
    const voice = sessionRef.current?.voiceChat;
    if (!voice) return;
    if (voice.isMuted) await voice.unmute();
    else await voice.mute();
    setMuted(voice.isMuted);
  }

  // The clock only runs while the teacher is on screen; the server keeps the real count.
  useEffect(() => {
    if (status !== "live") return;
    const timer = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status === "live" && left <= 0) void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, status]);

  useEffect(() => () => void sessionRef.current?.stop().catch(() => {}), []);

  const live = status === "live" || status === "connecting";
  return (
    <div className="stack">
      <div className="row between">
        <span className="small muted">{t.timeLeft}</span>
        <strong className="price">{clock(left)}</strong>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 12, display: live ? "block" : "none" }}
      />
      {status === "dropped" && <p className="notice">{t.dropped}</p>}
      {status === "over" && <p>{t.over}</p>}
      {error && <p className="error">{error}</p>}

      {(status === "idle" || status === "dropped") && (
        <>
          <p className="small muted">{t.micNote}</p>
          <button type="button" className="btn self-start" onClick={start}>
            {t.start}
          </button>
        </>
      )}
      {status === "connecting" && <p className="muted">{t.connecting}</p>}
      {status === "live" && (
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn ghost" onClick={toggleMute}>
            {muted ? t.unmute : t.mute}
          </button>
          <button type="button" className="btn ghost" onClick={() => confirm(t.endConfirm) && finish()}>
            {t.end}
          </button>
        </div>
      )}

      {lines.length > 0 && (
        <div className="stack" style={{ gap: 6, maxHeight: 280, overflowY: "auto" }}>
          {lines.map((l, i) => (
            <p key={i} className="small" lang="en">
              <strong>{l.who === "you" ? t.you : t.teacher}:</strong> {l.text}
            </p>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <details>
          <summary className="small">{t.topic}</summary>
          <ol className="small" lang="en">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
