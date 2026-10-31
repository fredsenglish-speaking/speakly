import { LEVELS, LEVEL_NAME } from "@/lib/levels";

/** Six rising bars, A1 to C2; the current level is highlighted. */
export function LevelLadder({ label, current }: { label: string; current?: string | null }) {
  return (
    <div className="tx-ladder" aria-label={label}>
      {LEVELS.map((l, i) => (
        <span
          key={l}
          className={`tx-step lvl-${l}`}
          style={{ height: `${34 + i * 13}%` }}
          aria-current={current === l ? "true" : undefined}
        >
          <b>{l}</b>
          <small lang="en">{LEVEL_NAME[l]}</small>
        </span>
      ))}
    </div>
  );
}

