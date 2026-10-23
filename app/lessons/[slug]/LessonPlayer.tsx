"use client";

import { useState } from "react";
import { Video } from "@/components/Video";
import { gradeFor, type Grade } from "@/lib/grade";
import { useT } from "@/lib/i18n/client";
import { saveLessonResult } from "../actions";

type Question = { id: number; part: number; question: string; options: string[]; correct: number };

// Step 0 is the video; steps 1 and 2 are the tests, stored as practice parts 2 and 4.
const TEST_PARTS = [2, 4];

export function LessonPlayer({
  lessonId,
  title,
  videoUrl,
  questions,
}: {
  lessonId: number;
  title: string;
  videoUrl: string | null;
  questions: Question[];
}) {
  const t = useT();
  const PARTS = t.lessons.steps;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);

  const isVideo = step === 0;
  const partQuestions = isVideo ? [] : questions.filter((q) => q.part === TEST_PARTS[step - 1]);
  const answered = partQuestions.filter((q) => answers[q.id] !== undefined).length;
  const allAnswered = answered === partQuestions.length;
  const correct = partQuestions.filter((q) => answers[q.id] === q.correct).length;
  const last = step === PARTS.length - 1;

  if (finished) {
    const total = questions.length;
    const right = questions.filter((q) => answers[q.id] === q.correct).length;
    const grade = gradeFor(right, total);
    return (
      <div className="panel stack">
        <h3>{t.lessons.done}</h3>
        <div className={`score-box ${grade}`} role="status">
          <span>{t.lessons.finalGrade}</span>
          <strong>{t.lessons.grades[grade]}</strong>
          <small>
            {right}/{total} · {total > 0 ? Math.round((right / total) * 100) : 0}%
          </small>
        </div>
        {TEST_PARTS.map((part, i) => {
          const qs = questions.filter((q) => q.part === part);
          if (qs.length === 0) return null;
          return (
            <div key={part} className="row between">
              <span>{PARTS[i + 1]}</span>
              <strong>
                {qs.filter((q) => answers[q.id] === q.correct).length}/{qs.length}
              </strong>
            </div>
          );
        })}
        <p className="small muted">{t.lessons.gradeScale}</p>
        <button
          type="button"
          className="btn ghost self-start"
          onClick={() => {
            setFinished(false);
            setStep(0);
            setAnswers({});
          }}
        >
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
            <Video url={videoUrl} title={`${title}: ${PARTS[0]}`} emptyText={t.common.noVideo} />
            <p className="small muted">{t.lessons.explainHint}</p>
          </>
        ) : (
          <>
            {partQuestions.length > 0 && <p className="small muted">{t.lessons.answered(answered, partQuestions.length)}</p>}
            {partQuestions.map((q, n) => {
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
                          lang="en"
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  {picked !== undefined &&
                    (picked === q.correct ? (
                      <p className="small answer-note right">✓ {t.lessons.rightMark}</p>
                    ) : (
                      <p className="small answer-note wrong">
                        ✗ {t.lessons.correctAnswer}: <strong lang="en">{q.options[q.correct]}</strong>
                      </p>
                    ))}
                </div>
              );
            })}
          </>
        )}
        {!isVideo && allAnswered && partQuestions.length > 0 && (
          <ScoreBox label={t.lessons.result} right={correct} total={partQuestions.length} grades={t.lessons.grades} />
        )}
        <button
          type="button"
          className="btn self-start"
          disabled={!isVideo && !allAnswered}
          onClick={() => {
            if (!last) return setStep(step + 1);
            setFinished(true);
            const right = questions.filter((q) => answers[q.id] === q.correct).length;
            if (questions.length > 0) saveLessonResult(lessonId, right, questions.length).catch(() => {});
          }}
        >
          {last ? t.lessons.finish : t.lessons.nextPart}
        </button>
      </div>
    </>
  );
}

function ScoreBox({ label, right, total, grades }: { label: string; right: number; total: number; grades: Record<Grade, string> }) {
  const grade = gradeFor(right, total);
  return (
    <div className={`score-box ${grade}`} role="status">
      <span>{label}</span>
      <strong>
        {right}/{total}
      </strong>
      <small>
        {Math.round((right / total) * 100)}% · {grades[grade]}
      </small>
    </div>
  );
}
