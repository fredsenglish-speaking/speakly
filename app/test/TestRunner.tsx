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

  return (
    <section className="panel stack" style={{ maxWidth: 640 }}>
      <span className="small muted">{t.test.question(index + 1, questions.length)}</span>
      <div className="progress">
        <span style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <p className="q" lang="en">
        {q.question}
      </p>
      <div className="opts" lang="en">
        {q.options.map((o, i) => (
          <button
            key={i}
            type="button"
            className="opt"
            aria-pressed={chosen === i}
            onClick={() => setAnswers({ ...answers, [q.id]: i })}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="row">
        {index > 0 && (
          <button type="button" className="btn ghost" onClick={() => setIndex(index - 1)}>
            {t.common.back}
          </button>
        )}
        {last ? (
          <form action={submitTest}>
            <input type="hidden" name="attempt_id" value={attemptId} />
            <input type="hidden" name="answers" value={JSON.stringify(answers)} />
            <SubmitButton disabled={chosen === undefined}>{t.test.seeResult}</SubmitButton>
          </form>
        ) : (
          <button type="button" className="btn" disabled={chosen === undefined} onClick={() => setIndex(index + 1)}>
            {t.common.next}
          </button>
        )}
      </div>
    </section>
  );
}
