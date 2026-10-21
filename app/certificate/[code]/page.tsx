import { notFound } from "next/navigation";
import { formatDate } from "@/lib/levels";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrintButton } from "./PrintButton";
import { getLocale } from "@/lib/i18n/server";
import { DICTIONARIES } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].cert.title };
}

// Public on purpose: anyone with the code can check that the certificate is real.
export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data: cert } = await createAdminClient()
    .from("certificates")
    .select("code, full_name, level, issued_at")
    .eq("code", code)
    .maybeSingle();
  if (!cert) notFound();
  const locale = await getLocale();
  const t = DICTIONARIES[locale];

  return (
    <section className="stack">
      <div className="cert">
        <span className="small muted" style={{ letterSpacing: ".12em", textTransform: "uppercase" }}>
          {t.cert.heading}
        </span>
        <h1>{cert.full_name}</h1>
        <p>{t.cert.level}</p>
        <div style={{ fontFamily: "var(--display)", fontSize: 56, fontWeight: 700 }}>{cert.level}</div>
        <p className="small muted">{t.cert.issued}: {formatDate(cert.issued_at, locale)}</p>
        <p className="code">{t.cert.code}: {cert.code}</p>
      </div>
      <div className="row">
        <PrintButton label={t.cert.print} />
        <span className="small muted no-print">{t.cert.share}</span>
      </div>
    </section>
  );
}
