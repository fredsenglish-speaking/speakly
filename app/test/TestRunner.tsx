"use client";

import { useState } from "react";
import { submitTest } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/client";

type Question = { id: number; question: string; options: string[] };

export function TestRunner({ attemptId, questions }: { attemptId: string; questions: Question[] }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const q = questions[index];
  const chosen = answers[q.id];
  const last = index === questions.length - 1;
  const answered = Object.keys(answers).length;
  const pct = Math.round((answered / questions.length) * 100);

  return (
    <section className="tx-runner">
      <header className="tx-runner-head">
        <span className="tx-count">{t.test.question(index + 1, questions.length)}</span>
        <span className="small muted">{t.test.progressPct(pct)}</span>
      </header>
      <div className="tx-progress" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answered}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="tx-q" lang="en">
        {q.question}
      </p>
      <div className="tx-opts" lang="en">
        {q.options.map((o, i) => (
          <button
            key={i}
            type="button"
            className="tx-opt"
            aria-pressed={chosen === i}
            onClick={() => setAnswers({ ...answers, [q.id]: i })}
          >
            <span className="tx-letter" aria-hidden="true">
              {String.fromCharCode(65 + i)}
            </span>
            <span>{o}</span>
          </button>
        ))}
      </div>
      <div className="tx-nav">
        {index > 0 ? (
          <button type="button" className="btn ghost" onClick={() => setIndex(index - 1)}>
            ← {t.common.back}
          </button>
        ) : (
          <span />
        )}
        {last ? (
          <form action={submitTest}>
            <input type="hidden" name="attempt_id" value={attemptId} />
            <input type="hidden" name="answers" value={JSON.stringify(answers)} />
            <SubmitButton className="btn gold" disabled={chosen === undefined}>
              {t.test.seeResult} →
            </SubmitButton>
          </form>
        ) : (
          <button type="button" className="btn" disabled={chosen === undefined} onClick={() => setIndex(index + 1)}>
            {t.common.next} →
          </button>
        )}
      </div>
    </section>
  );
}
