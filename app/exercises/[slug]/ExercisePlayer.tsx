"use client";

import { useState } from "react";
import { gradeFor } from "@/lib/grade";
import { EXERCISE_KINDS, isGapRight, isOrderRight, orderLine, type Exercise, type ExerciseKind } from "@/lib/exercises";
import { useT } from "@/lib/i18n/client";

/** What the student did on one task; set once the task is checked. */
type Answer = { right: boolean; mc?: number; typed?: string; saidRight?: boolean; picked?: number[] };

export function ExercisePlayer({ tasks }: { tasks: Exercise[] }) {
  const t = useT();
  const E = t.exercises;
  const parts = EXERCISE_KINDS.map((kind) => ({ kind, tasks: tasks.filter((x) => x.kind === kind) })).filter((p) => p.tasks.length > 0);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [finished, setFinished] = useState(false);

  const answer = (key: string, a: Answer) => setAnswers((prev) => ({ ...prev, [key]: a }));
  const rightIn = (list: Exercise[]) => list.filter((x) => answers[x.key]?.right).length;

  if (finished) {
    const right = rightIn(tasks);
    const grade = gradeFor(right, tasks.length);
    return (
      <div className="panel stack">
        <h3>{E.done}</h3>
        <div className={`score-box ${grade}`} role="status">
          <span>{E.result}</span>
          <strong>{t.lessons.grades[grade]}</strong>
          <small>
            {right}/{tasks.length} · {Math.round((right / tasks.length) * 100)}%
          </small>
        </div>
        {parts.map((p, i) => (
          <div key={p.kind} className="row between">
            <span>
              {i + 1}. {E.parts[p.kind]}
            </span>
            <strong>
              {rightIn(p.tasks)}/{p.tasks.length}
            </strong>
          </div>
        ))}
        <button
          type="button"
          className="btn ghost self-start"
          onClick={() => {
            setFinished(false);
            setStep(0);
            setAnswers({});
          }}
        >
          {E.again}
        </button>
      </div>
    );
  }

  const current = parts[step];
  const answered = current.tasks.filter((x) => answers[x.key]).length;
  const allAnswered = answered === current.tasks.length;
  const last = step === parts.length - 1;

  return (
    <>
      <div className="stepper">
        {parts.map((p, i) => (
          <button key={p.kind} type="button" aria-current={i === step} className={i < step ? "ok" : ""} onClick={() => setStep(i)}>
            {i < step ? "✓ " : ""}
            {i + 1}. {E.parts[p.kind]}
          </button>
        ))}
      </div>
      <div className="panel stack">
        <p className="small muted">
          {E.hints[current.kind as ExerciseKind]} {t.lessons.answered(answered, current.tasks.length)}
        </p>
        {current.tasks.map((task, n) => (
          <div key={task.key} className="stack" style={{ gap: 8 }}>
            <Task task={task} n={n + 1} done={answers[task.key]} onAnswer={(a) => answer(task.key, a)} />
          </div>
        ))}
        {allAnswered && (
          <div className={`score-box ${gradeFor(rightIn(current.tasks), current.tasks.length)}`} role="status">
            <span>{E.result}</span>
            <strong>
              {rightIn(current.tasks)}/{current.tasks.length}
            </strong>
          </div>
        )}
        <button
          type="button"
          className="btn self-start"
          disabled={!allAnswered}
          onClick={() => {
            if (last) return setFinished(true);
            setStep(step + 1);
            window.scrollTo({ top: 0 });
          }}
        >
          {last ? E.finish : E.nextPart}
        </button>
      </div>
    </>
  );
}

function Task({ task, n, done, onAnswer }: { task: Exercise; n: number; done?: Answer; onAnswer: (a: Answer) => void }) {
  const t = useT();
  const E = t.exercises;
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<number[]>([]);

  const verdict = (right: boolean, correct: React.ReactNode) =>
    done &&
    (right ? (
      <p className="small answer-note right">✓ {t.lessons.rightMark}</p>
    ) : (
      <p className="small answer-note wrong">
        ✗ {t.lessons.correctAnswer}: <strong lang="en">{correct}</strong>
      </p>
    ));

  if (task.kind === "mc") {
    return (
      <>
        <p className="q" style={{ fontSize: 17 }} lang="en">
          {n}. {task.question}
        </p>
        <div className="opts">
          {task.options.map((o, j) => {
            const cls = done === undefined ? "" : j === task.correct ? "right" : done.mc === j ? "wrong" : "";
            return (
              <button
                key={j}
                type="button"
                className={`opt ${cls}`}
                aria-pressed={done?.mc === j}
                disabled={done !== undefined}
                onClick={() => onAnswer({ right: j === task.correct, mc: j })}
                lang="en"
              >
                {o}
              </button>
            );
          })}
        </div>
        {verdict(!!done?.right, task.options[task.correct])}
      </>
    );
  }

  if (task.kind === "gap") {
    return (
      <>
        <p className="q" style={{ fontSize: 17 }} lang="en">
          {n}. {task.question}
        </p>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) onAnswer({ right: isGapRight(task, typed), typed });
          }}
        >
          <input
            value={done?.typed ?? typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={done !== undefined}
            placeholder={E.typeHere}
            aria-label={E.typeHere}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            lang="en"
            style={{ maxWidth: 260 }}
          />
          {!done && (
            <button type="submit" className="btn small" disabled={!typed.trim()}>
              {E.check}
            </button>
          )}
        </form>
        {verdict(!!done?.right, task.question.replace("___", task.answers[0]).replace(/\s*\([^)]*\)/g, ""))}
      </>
    );
  }

  if (task.kind === "tf") {
    return (
      <>
        <p className="q" style={{ fontSize: 17 }} lang="en">
          {n}. {task.sentence}
        </p>
        <div className="row">
          {[true, false].map((says) => {
            const cls = done === undefined ? "" : says === task.correct ? "right" : done.saidRight === says ? "wrong" : "";
            return (
              <button
                key={String(says)}
                type="button"
                className={`opt ${cls}`}
                aria-pressed={done?.saidRight === says}
                disabled={done !== undefined}
                onClick={() => onAnswer({ right: says === task.correct, saidRight: says })}
              >
                {says ? `✓ ${E.isRight}` : `✗ ${E.isWrong}`}
              </button>
            );
          })}
        </div>
        {done &&
          (task.correct ? (
            <p className={`small answer-note ${done.right ? "right" : "wrong"}`}>
              {done.right ? "✓" : "✗"} {E.sentenceRight}
            </p>
          ) : (
            <p className={`small answer-note ${done.right ? "right" : "wrong"}`}>
              {done.right ? "✓" : "✗"} {E.rightVersion}: <strong lang="en">{task.fixed}</strong>
            </p>
          ))}
      </>
    );
  }

  // Word order: tap words to build the sentence; it is checked once every word is used.
  const used = done?.picked ?? picked;
  const pick = (i: number) => {
    const next = [...picked, i];
    setPicked(next);
    if (next.length === task.words.length) onAnswer({ right: isOrderRight(task, next.map((j) => task.words[j])), picked: next });
  };
  return (
    <>
      <p className="q" style={{ fontSize: 17 }}>
        {n}.{" "}
        <span lang="en" className="order-line">
          {used.length > 0 ? orderLine(task, used) : "…"}
        </span>
      </p>
      <div className="row order-words" lang="en">
        {task.words.map((w, i) => (
          <button key={i} type="button" className="chip" disabled={done !== undefined || used.includes(i)} onClick={() => pick(i)}>
            {w}
          </button>
        ))}
        {!done && picked.length > 0 && (
          <button type="button" className="btn ghost small" onClick={() => setPicked([])}>
            {E.reset}
          </button>
        )}
      </div>
      {verdict(!!done?.right, task.sentence)}
    </>
  );
}
