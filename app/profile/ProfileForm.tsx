"use client";

import { useActionState, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/client";
import { saveProfile, type ProfileState } from "./actions";

/** Shrinks a photo to a 400px square JPEG in the browser, so uploads stay small. */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(400, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return blob ? new File([blob], "avatar.jpg", { type: "image/jpeg" }) : file;
}

export function ProfileForm({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const t = useT().me;
  const [state, action] = useActionState<ProfileState, FormData>(saveProfile, {});
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [removed, setRemoved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    let small = file;
    try {
      small = await shrink(file);
    } catch {
      // The browser couldn't read it; send the original and let the server decide.
    }
    const dt = new DataTransfer();
    dt.items.add(small);
    e.target.files = dt.files;
    setPreview(URL.createObjectURL(small));
    setRemoved(false);
  }

  return (
    <form action={action} className="panel stack narrow">
      <div className="row" style={{ gap: 16 }}>
        <Avatar name={name} url={removed ? null : preview} size={88} online />
        <div className="stack" style={{ gap: 8 }}>
          <button type="button" className="btn ghost small" onClick={() => fileInput.current?.click()}>
            {t.choosePhoto}
          </button>
          {preview && !removed && (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => {
                setRemoved(true);
                if (fileInput.current) fileInput.current.value = "";
              }}
            >
              {t.removePhoto}
            </button>
          )}
        </div>
      </div>
      <input ref={fileInput} type="file" name="photo" accept="image/*" hidden onChange={onPick} />
      <input type="hidden" name="remove_photo" value={removed ? "1" : ""} />
      <label className="field">
        {t.name}
        <input type="text" name="full_name" defaultValue={name} required maxLength={80} />
      </label>
      {state.error && <p className="error">{state.error}</p>}
      {state.ok && <p className="small" style={{ color: "var(--accent)" }}>{state.ok}</p>}
      <SubmitButton className="btn self-start">{t.save}</SubmitButton>
    </form>
  );
}
