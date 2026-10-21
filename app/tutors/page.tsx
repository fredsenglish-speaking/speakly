import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { getCurrentUser } from "@/lib/auth";
import { LEVELS, isLevel, money } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";
import { TUTOR_COLUMNS, type TutorRow } from "@/lib/types";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT()).tutors.title };
}


export default async function TutorsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const tr = await getT();
  const level = isLevel(params.level) ? params.level : null;

  const supabase = await createClient();
  let query = supabase
    .from("tutors")
    .select(TUTOR_COLUMNS)
    .eq("approved", true);
  if (level) query = query.contains("levels", [level]);
  const { data } = await query;
  const tutors = (data ?? []) as unknown as TutorRow[];

  return (
    <section className="stack">
      <div className="row between">
        <h2>{tr.tutors.title}</h2>
        {user?.level && (
          <span className="small muted">
            {tr.common.yourLevel}: <LevelChip level={user.level} />
          </span>
        )}
      </div>
      <nav className="filters" aria-label={tr.common.levelFilter}>
        <Link href="/tutors" className="chip" aria-current={!level}>
          {tr.common.all}
        </Link>
        {LEVELS.map((l) => (
          <Link key={l} href={`/tutors?level=${l}`} className="chip" aria-current={level === l}>
            {l}
          </Link>
        ))}
      </nav>
      {tutors.length === 0 && <p className="muted">{tr.tutors.none}</p>}
      <div className="tutors">
        {tutors.map((t) => (
          <article key={t.id} className="panel tutor">
            <div className="ava">{(t.profiles?.full_name || "?").slice(0, 1)}</div>
            <div className="stack">
              <div>
                <h3>{t.profiles?.full_name}</h3>
                <p className="small muted">
                  {t.years_experience} {tr.common.yearsExp}{t.languages && ` · ${t.languages}`}
                </p>
              </div>
              <div className="row" style={{ gap: 4 }}>
                {t.levels.map((l) => (
                  <LevelChip key={l} level={l} />
                ))}
              </div>
              <p className="small">{t.bio}</p>
              <div className="prices">
                <span>15 {tr.common.min} {money(t.price_15)}</span>
                <span>30 {tr.common.min} {money(t.price_30)}</span>
                <span>{tr.common.hour} {money(t.price_60)}</span>
              </div>
              <div>
                <Link href={`/tutors/${t.id}`} className="btn">
                  {tr.tutors.choose}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
