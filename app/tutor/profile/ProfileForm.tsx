"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { LevelChip } from "@/components/LevelChip";
import { LEVELS } from "@/lib/levels";
import { updateProfile } from "../actions";
import { useT } from "@/lib/i18n/client";

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
  const t = useT();
  return (
    <form action={action} className="panel stack" style={{ maxWidth: 640 }}>
      <label className="field">
        {t.auth.fullName}
        <input type="text" name="full_name" id="full_name" defaultValue={p.fullName} />
      </label>
      <label className="field">
        {t.profile.bio}
        <textarea name="bio" id="bio" rows={5} defaultValue={p.bio} placeholder={t.profile.bioPlaceholder} />
      </label>
      <div className="row">
        <label className="field" style={{ flex: 2, minWidth: 200 }}>
          {t.profile.languages}
          <input type="text" name="languages" id="languages" defaultValue={p.languages} placeholder={t.profile.languagesPlaceholder} />
        </label>
        <label className="field" style={{ flex: 1, minWidth: 120 }}>
          {t.profile.years}
          <input type="number" name="years_experience" id="years_experience" min={0} defaultValue={p.years} />
        </label>
      </div>
      <span className="small muted">{t.profile.levels}</span>
      <div className="row">
        {LEVELS.map((l) => (
          <label key={l} className="check">
            <input type="checkbox" name="levels" value={l} id={`lv-${l}`} defaultChecked={p.levels.includes(l)} />
            <LevelChip level={l} />
          </label>
        ))}
      </div>
      <span className="small muted">{t.profile.prices}</span>
      <div className="row">
        {([15, 30, 60] as const).map((d) => (
          <label key={d} className="field" style={{ flex: 1, minWidth: 90 }}>
            {d === 60 ? t.common.hour : `${d} ${t.common.min}`}
            <input type="number" name={`price_${d}`} id={`price_${d}`} min={1} step="0.5" defaultValue={p.prices[d]} required />
          </label>
        ))}
      </div>
      <label className="field">
        {t.profile.video}
        <input type="url" name="intro_video_url" id="intro_video_url" defaultValue={p.introVideoUrl} placeholder="https://youtu.be/…" />
      </label>
      <label className="field">
        {t.profile.meeting}
        <input type="url" name="meeting_url" id="meeting_url" defaultValue={p.meetingUrl} placeholder="https://meet.google.com/…" />
      </label>
      {state.error && <p className="error">{state.error}</p>}
      {state.ok && <p style={{ color: "var(--accent)" }}>{state.ok}</p>}
      <SubmitButton className="btn self-start">{t.common.save}</SubmitButton>
    </form>
  );
}
