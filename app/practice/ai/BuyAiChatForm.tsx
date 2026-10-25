"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/client";
import { buyAiChat, type BuyState } from "./actions";

type Price = { minutes: number; label: string; price: string };

export function BuyAiChatForm({ topics, prices }: { topics: { id: number; title: string }[]; prices: Price[] }) {
  const [state, action] = useActionState<BuyState, FormData>(buyAiChat, {});
  const t = useT().aiChat;
  const [minutes, setMinutes] = useState(prices[0]?.minutes ?? 30);
  const price = prices.find((p) => p.minutes === minutes)?.price ?? "";
  return (
    <form action={action} className="panel stack">
      <p className="small muted">{t.howItWorks}</p>
      <label className="field">
        {t.topic}
        <select name="topic_id" required defaultValue="">
          <option value="" disabled>{t.chooseTopic}</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>{topic.title}</option>
          ))}
        </select>
      </label>
      <h3>{t.duration}</h3>
      <div className="choices" role="radiogroup" aria-label={t.duration}>
        {prices.map((p) => (
          <label key={p.minutes} className="choice">
            <input type="radio" name="minutes" value={p.minutes} checked={minutes === p.minutes} onChange={() => setMinutes(p.minutes)} />
            <span>{p.label}</span>
            <span className="price">{p.price}</span>
          </label>
        ))}
      </div>
      {state.error && <p className="error">{state.error}</p>}
      <SubmitButton className="btn self-start">{t.buy(price)}</SubmitButton>
    </form>
  );
}
