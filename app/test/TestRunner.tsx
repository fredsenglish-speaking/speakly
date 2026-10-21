"use client";

import { useState } from "react";
import { submitTest } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

type Question = { id: number; question: string; options: string[] };

export function TestRunner({ attemptId, questions }: { attemptId: string; questions: Question[] }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const q = questions[index];
  const chosen = answers[q.id];
  const last = index === questions.length - 1;

  return (
    <section className="panel stack" style={{ maxWidth: 640 }}>
      <span className="small muted">
        Sual {index + 1} / {questions.length}
      </span>
      <div className="progress">
        <span style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <p className="q">{q.question}</p>
      <div className="opts">
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
            Geri
          </button>
        )}
        {last ? (
          <form action={submitTest}>
            <input type="hidden" name="attempt_id" value={attemptId} />
            <input type="hidden" name="answers" value={JSON.stringify(answers)} />
            <SubmitButton disabled={chosen === undefined}>Nəticəni gör</SubmitButton>
          </form>
        ) : (
          <button type="button" className="btn" disabled={chosen === undefined} onClick={() => setIndex(index + 1)}>
            Növbəti
          </button>
        )}
      </div>
    </section>
  );
}
