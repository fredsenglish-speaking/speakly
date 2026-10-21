"use client";

import { useState } from "react";
import { Video } from "@/components/Video";
import { useT } from "@/lib/i18n/client";

type Question = { id: number; part: number; question: string; options: string[]; correct: number };

export function LessonPlayer({
  title,
  explanationUrl,
  subtitledUrl,
  questions,
}: {
  title: string;
  explanationUrl: string | null;
  subtitledUrl: string | null;
  questions: Question[];
}) {
  const t = useT();
  const PARTS = t.lessons.steps;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);

  const isVideo = step === 0 || step === 2;
  const partQuestions = questions.filter((q) => q.part === step + 1);
  const allAnswered = partQuestions.every((q) => answers[q.id] !== undefined);
  const correct = partQuestions.filter((q) => answers[q.id] === q.correct).length;

  if (finished) {
    const total = questions.length;
    const right = questions.filter((q) => answers[q.id] === q.correct).length;
    return (
      <div className="panel stack">
        <h3>{t.lessons.done}</h3>
        <p>{t.lessons.doneScore(total, right)}</p>
        <button type="button" className="btn ghost self-start" onClick={() => { setFinished(false); setStep(0); setAnswers({}); }}>
          {t.lessons.again}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="stepper">
        {PARTS.map((p, i) => (
          <button key={p} type="button" aria-current={i === step} className={i < step ? "ok" : ""} onClick={() => setStep(i)}>
            {i < step ? "✓ " : ""}
            {p}
          </button>
        ))}
      </div>
      <div className="panel stack">
        {isVideo ? (
          <>
            <Video url={step === 0 ? explanationUrl : subtitledUrl} title={`${title}: ${PARTS[step]}`} emptyText={t.common.noVideo} />
            <p className="small muted">
              {step === 0 ? t.lessons.explainHint : t.lessons.subtitleHint}
            </p>
          </>
        ) : (
          partQuestions.map((q, n) => {
            const picked = answers[q.id];
            return (
              <div key={q.id} className="stack" style={{ gap: 8 }}>
                <p className="q" style={{ fontSize: 17 }} lang="en">
                  {n + 1}. {q.question}
                </p>
                <div className="opts">
                  {q.options.map((o, j) => {
                    const cls = picked === undefined ? "" : j === q.correct ? "right" : picked === j ? "wrong" : "";
                    return (
                      <button
                        key={j}
                        type="button"
                        className={`opt ${cls}`}
                        aria-pressed={picked === j}
                        disabled={picked !== undefined}
                        onClick={() => setAnswers({ ...answers, [q.id]: j })}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
        {!isVideo && allAnswered && partQuestions.length > 0 && (
          <p className="small muted">{t.lessons.partScore(partQuestions.length, correct)}</p>
        )}
        <button
          type="button"
          className="btn self-start"
          disabled={!isVideo && !allAnswered}
          onClick={() => (step < 3 ? setStep(step + 1) : setFinished(true))}
        >
          {step < 3 ? t.lessons.nextPart : t.lessons.finish}
        </button>
      </div>
    </>
  );
}
