import Link from "next/link";
import { FreeTabs } from "@/components/FreeTabs";
import type { Dictionary } from "@/lib/i18n";

/** Shown instead of the free materials until the student has a level from the placement test. */
export function MaterialsLocked({ t, active }: { t: Dictionary; active: "exercises" | "books" | "films" }) {
  return (
    <>
      <FreeTabs t={t} active={active} />
      <div className="panel stack narrow lib-locked">
        <p>{t.library.needTest}</p>
        <Link href="/test" className="btn self-start">
          {t.home.startTest} · {t.test.free}
        </Link>
      </div>
    </>
  );
}
