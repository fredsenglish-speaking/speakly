"use client";

import { useMemo, useState } from "react";
import { Video } from "@/components/Video";
import { gradeFor, type Grade } from "@/lib/grade";
import { useLocale, useT } from "@/lib/i18n/client";
import { gapAnswer, translation, vocabFinal, vocabPractice, type QuizQuestion, type VocabItem } from "@/lib/vocabQuiz";
import { saveLessonResult } from "../actions";

type Question = { id: number; part: number; question: string; options: string[]; correct: number };

type Step =
  | { kind: "video"; label: string }
  | { kind: "words"; label: string }
  | { kind: "quiz"; label: string; qs: QuizQuestion[]; final?: boolean };

// Practice part 2 is the topic practice test; part 4 goes into the final test.
const PRACTICE_PART = 2;
const FINAL_PART = 4;

function fromGrammar(q: Question): QuizQuestion {
  return { key: `g${q.id}`, question: q.question, options: q.options, correct: q.correct, optionsLang: "en" };
}

function rightCount(qs: QuizQuestion[], answers: Record<string, number>) {
  return qs.filter((q) => answers[q.key] === q.correct).length;
}

export function LessonPlayer({
  lessonId,
  title,
  videoUrl,
  questions,
  vocab,
}: {
  lessonId: number;
  title: string;
  videoUrl: string | null;
  questions: Question[];
  vocab: VocabItem[];
}) {
  const t = useT();
  const locale = useLocale();
  const L = t.lessons.steps;

  const steps = useMemo(() => {
    const list: Step[] = [
      { kind: "video", label: L[0] },
      { kind: "quiz", label: L[1], qs: questions.filter((q) => q.part === PRACTICE_PART).map(fromGrammar) },
    ];
    if (vocab.length > 0) {
      list.push({ kind: "words", label: L[2] }, { kind: "quiz", label: L[3], qs: vocabPractice(vocab, locale, t.lessons.meaningOf) });
    }
    list.push({
      kind: "quiz",
      label: L[4],
      final: true,
      qs: [...questions.filter((q) => q.part === FINAL_PART).map(fromGrammar), ...vocabFinal(vocab, locale, t.lessons.meaningOf)],
    });
    // Renumber in case a lesson has no vocabulary yet.
    return list.map((s, i) => ({ ...s, label: `${i + 1}. ${s.label.replace(/^\d+\.\s*/, "")}` }));
  }, [L, questions, vocab, locale, t.lessons.meaningOf]);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);

  const current = steps[step];
  const qs = current.kind === "quiz" ? current.qs : [];
  const answered = qs.filter((q) => answers[q.key] !== undefined).length;
  const allAnswered = answered === qs.length;
  const last = step === steps.length - 1;
  const finalQs = (steps[steps.length - 1] as Extract<Step, { kind: "quiz" }>).qs;

  if (finished) {
    const total = finalQs.length;
    const right = rightCount(finalQs, answers);
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
        {steps.map((s) =>
          s.kind === "quiz" && s.qs.length > 0 ? (
            <div key={s.label} className="row between">
              <span>{s.label}</span>
              <strong>
                {rightCount(s.qs, answers)}/{s.qs.length}
              </strong>
            </div>
          ) : null,
        )}
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
        {steps.map((s, i) => (
          <button key={s.label} type="button" aria-current={i === step} className={i < step ? "ok" : ""} onClick={() => setStep(i)}>
            {i < step ? "✓ " : ""}
            {s.label}
          </button>
        ))}
      </div>
      <div className="panel stack">
        {current.kind === "video" && (
          <>
            <Video url={videoUrl} title={`${title}: ${current.label}`} emptyText={t.common.noVideo} />
            <p className="small muted">{t.lessons.explainHint}</p>
          </>
        )}
        {current.kind === "words" && <WordList vocab={vocab} locale={locale} />}
        {current.kind === "quiz" && (
          <>
            {current.final && <p className="small muted">{t.lessons.finalHint}</p>}
            {qs.length > 0 && <p className="small muted">{t.lessons.answered(answered, qs.length)}</p>}
            {qs.map((q, n) => {
              const picked = answers[q.key];
              return (
                <div key={q.key} className="stack" style={{ gap: 8 }}>
                  <p className="q" style={{ fontSize: 17 }} lang={q.optionsLang === "en" ? "en" : undefined}>
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
                          onClick={() => setAnswers({ ...answers, [q.key]: j })}
                          lang={q.optionsLang}
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
                        ✗ {t.lessons.correctAnswer}: <strong lang={q.optionsLang}>{q.options[q.correct]}</strong>
                      </p>
                    ))}
                </div>
              );
            })}
            {allAnswered && qs.length > 0 && (
              <ScoreBox label={current.final ? t.lessons.finalGrade : t.lessons.result} right={rightCount(qs, answers)} total={qs.length} grades={t.lessons.grades} />
            )}
          </>
        )}
        <button
          type="button"
          className="btn self-start"
          disabled={current.kind === "quiz" && !allAnswered}
          onClick={() => {
            if (!last) {
              setStep(step + 1);
              return window.scrollTo({ top: 0 });
            }
            setFinished(true);
            if (finalQs.length > 0) saveLessonResult(lessonId, rightCount(finalQs, answers), finalQs.length).catch(() => {});
          }}
        >
          {last ? t.lessons.finish : t.lessons.nextPart}
        </button>
      </div>
    </>
  );
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-GB";
  u.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function WordList({ vocab, locale }: { vocab: VocabItem[]; locale: string }) {
  const t = useT();
  const groups = [
    { title: t.lessons.words, items: vocab.filter((v) => v.kind === "word") },
    { title: t.lessons.phrasals, items: vocab.filter((v) => v.kind === "phrasal") },
  ];
  return (
    <>
      <p className="small muted">{t.lessons.vocabHint}</p>
      {groups.map((g) =>
        g.items.length === 0 ? null : (
          <div key={g.items[0].kind} className="stack" style={{ gap: 8 }}>
            <h3>{g.title(g.items.length)}</h3>
            <ol className="vocab-list">
              {g.items.map((v) => {
                const gap = gapAnswer(v.example);
                const [before, after] = v.example.split(`[${gap}]`);
                return (
                  <li key={v.id}>
                    <div className="vocab-head">
                      <strong lang="en">{v.term}</strong>
                      <span>{translation(v, locale)}</span>
                      <button type="button" className="vocab-say" aria-label={`${t.lessons.listen}: ${v.term}`} title={t.lessons.listen} onClick={() => speak(v.term)}>
                        🔊
                      </button>
                    </div>
                    <p className="small muted" lang="en">
                      {before}
                      <mark>{gap}</mark>
                      {after}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        ),
      )}
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
