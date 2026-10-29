import { notFound } from "next/navigation";
import { CertificateCard } from "@/components/CertificateCard";
import { isLevel } from "@/lib/levels";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteHost } from "@/lib/siteHost";
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
  if (!cert || !isLevel(cert.level)) notFound();
  const t = DICTIONARIES[await getLocale()];
  const issued = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Baku" })
    .format(new Date(cert.issued_at));

  return (
    <section className="stack">
      <CertificateCard
        name={cert.full_name}
        level={cert.level}
        issued={issued}
        code={cert.code}
        verifyUrl={`${await siteHost()}/certificate/${cert.code}`}
      />
      <div className="row no-print">
        <PrintButton label={t.cert.print} />
        <span className="small muted">{t.cert.share}</span>
      </div>
    </section>
  );
}
