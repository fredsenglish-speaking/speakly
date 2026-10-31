import Link from "next/link";
import { FreeTabs } from "@/components/FreeTabs";
import { LevelChip } from "@/components/LevelChip";
import type { Dictionary } from "@/lib/i18n";
import type { Level } from "@/lib/levels";

/** Shown instead of the free materials until the student has a level from the placement test. */
export function MaterialsLocked({ t, active }: { t: Dictionary; active: "exercises" | "books" | "films" }) {
  return (
    <section className="stack">
      <FreeTabs t={t} active={active} />
      <div className="panel stack narrow">
        <p>{t.library.needTest}</p>
        <Link href="/test" className="btn self-start">
          {t.home.startTest} · {t.test.free}
        </Link>
      </div>
    </section>
  );
}

/** The line that tells a student the materials are picked for their level. */
export function YourLevelNote({ t, level }: { t: Dictionary; level: Level }) {
  return (
    <p className="small muted row" style={{ gap: 8 }}>
      {t.library.forYourLevel} <LevelChip level={level} />
    </p>
  );
}
