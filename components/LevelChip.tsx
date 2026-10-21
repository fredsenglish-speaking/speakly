export function LevelChip({ level }: { level: string }) {
  return <span className={`lv lv-${level}`}>{level}</span>;
}
