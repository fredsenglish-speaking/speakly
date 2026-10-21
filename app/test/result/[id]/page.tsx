import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CERTIFICATE_PRICE, money } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { buyCertificate } from "../../actions";

export const metadata = { title: "Test nəticəsi" };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/test/result/${id}`);
  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("test_attempts")
    .select("id, score, total, level")
    .eq("id", id)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!attempt?.level) notFound();

  const { data: cert } = await supabase.from("certificates").select("code").eq("attempt_id", id).maybeSingle();

  return (
    <section className="panel result">
      <div className={`big-lv lv-${attempt.level}`}>{attempt.level}</div>
      <div className="stack">
        <h2>Sizin səviyyəniz: {attempt.level}</h2>
        <p className="muted">
          {attempt.total} sualdan {attempt.score} düzgün cavab.
        </p>
        <div className="row">
          <Link href={`/tutors?level=${attempt.level}`} className="btn">
            {attempt.level} müəllimlərini gör
          </Link>
          {cert ? (
            <Link href={`/certificate/${cert.code}`} className="btn gold">
              Sertifikatıma bax
            </Link>
          ) : (
            <form action={buyCertificate}>
              <input type="hidden" name="attempt_id" value={attempt.id} />
              <SubmitButton className="btn gold">Sertifikat al · {money(CERTIFICATE_PRICE)}</SubmitButton>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
