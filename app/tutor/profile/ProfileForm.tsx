"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { LevelChip } from "@/components/LevelChip";
import { LEVELS } from "@/lib/levels";
import { updateProfile } from "../actions";

type Props = {
  fullName: string;
  bio: string;
  languages: string;
  years: number;
  levels: string[];
  introVideoUrl: string;
  meetingUrl: string;
  prices: Record<15 | 30 | 60, number>;
};

export function ProfileForm(p: Props) {
  const [state, action] = useActionState(updateProfile, {});
  return (
    <form action={action} className="panel stack" style={{ maxWidth: 640 }}>
      <label className="field">
        Ad və soyad
        <input type="text" name="full_name" id="full_name" defaultValue={p.fullName} />
      </label>
      <label className="field">
        Özünüzü təqdim edin
        <textarea name="bio" id="bio" rows={5} defaultValue={p.bio} placeholder="Təcrübəniz, dərs üslubunuz, kimlərlə işləyirsiniz." />
      </label>
      <div className="row">
        <label className="field" style={{ flex: 2, minWidth: 200 }}>
          Danışdığınız dillər
          <input type="text" name="languages" id="languages" defaultValue={p.languages} placeholder="İngilis, Azərbaycan" />
        </label>
        <label className="field" style={{ flex: 1, minWidth: 120 }}>
          Təcrübə (il)
          <input type="number" name="years_experience" id="years_experience" min={0} defaultValue={p.years} />
        </label>
      </div>
      <span className="small muted">Dərs verdiyiniz səviyyələr</span>
      <div className="row">
        {LEVELS.map((l) => (
          <label key={l} className="check">
            <input type="checkbox" name="levels" value={l} id={`lv-${l}`} defaultChecked={p.levels.includes(l)} />
            <LevelChip level={l} />
          </label>
        ))}
      </div>
      <span className="small muted">Qiymətlər (USD)</span>
      <div className="row">
        {([15, 30, 60] as const).map((d) => (
          <label key={d} className="field" style={{ flex: 1, minWidth: 90 }}>
            {d === 60 ? "1 saat" : `${d} dəq`}
            <input type="number" name={`price_${d}`} id={`price_${d}`} min={1} step="0.5" defaultValue={p.prices[d]} required />
          </label>
        ))}
      </div>
      <label className="field">
        Təqdimat videosu (YouTube və ya Vimeo linki)
        <input type="url" name="intro_video_url" id="intro_video_url" defaultValue={p.introVideoUrl} placeholder="https://youtu.be/…" />
      </label>
      <label className="field">
        Dərs linki (Zoom və ya Google Meet)
        <input type="url" name="meeting_url" id="meeting_url" defaultValue={p.meetingUrl} placeholder="https://meet.google.com/…" />
      </label>
      {state.error && <p className="error">{state.error}</p>}
      {state.ok && <p style={{ color: "var(--accent)" }}>{state.ok}</p>}
      <SubmitButton className="btn self-start">Yadda saxla</SubmitButton>
    </form>
  );
}
