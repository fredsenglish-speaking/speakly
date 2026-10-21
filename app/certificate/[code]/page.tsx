import { notFound } from "next/navigation";
import { formatDate } from "@/lib/levels";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Sertifikat" };

// Public on purpose: anyone with the code can check that the certificate is real.
export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data: cert } = await createAdminClient()
    .from("certificates")
    .select("code, full_name, level, issued_at")
    .eq("code", code)
    .maybeSingle();
  if (!cert) notFound();

  return (
    <section className="stack">
      <div className="cert">
        <span className="small muted" style={{ letterSpacing: ".12em", textTransform: "uppercase" }}>
          Speakly · Səviyyə sertifikatı
        </span>
        <h1>{cert.full_name}</h1>
        <p>İngilis dili səviyyəsi</p>
        <div style={{ fontFamily: "var(--display)", fontSize: 56, fontWeight: 700 }}>{cert.level}</div>
        <p className="small muted">Verilmə tarixi: {formatDate(cert.issued_at)}</p>
        <p className="code">Yoxlama kodu: {cert.code}</p>
      </div>
      <div className="row">
        <PrintButton />
        <span className="small muted no-print">Bu səhifənin linkini işəgötürənə və ya məktəbə göndərə bilərsiniz.</span>
      </div>
    </section>
  );
}
