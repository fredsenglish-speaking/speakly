import Link from "next/link";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { priceFacts } from "@/lib/priceFacts";
import { whatsappDigits } from "@/lib/whatsapp";

export async function generateMetadata() {
  const a = DICTIONARIES[await getLocale()].terms;
  return {
    title: a.seoTitle,
    description: a.seoDescription,
    alternates: { canonical: "/terms" },
    openGraph: { title: `${a.seoTitle} | Speakly AI`, description: a.seoDescription, url: "/terms" },
  };
}

export default async function TermsPage() {
  const t = DICTIONARIES[await getLocale()];
  const a = t.terms;
  const wa = whatsappDigits(process.env.WHATSAPP_NUMBER);

  return (
    <>
      <section className="ab-hero">
        <div className="ab-inner">
          <span className="kicker">{a.kicker}</span>
          <h1 className="ab-title">{a.title}</h1>
          <p className="ab-lead">{a.intro}</p>
          <p className="legal-updated">{a.updated}</p>
        </div>
      </section>

      <article className="home-section legal-body">
        {a.sections(priceFacts()).map(([title, paragraphs]) => (
          <section key={title} className="legal-section">
            <h2>{title}</h2>
            {paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
        <p className="legal-links">
          <Link href="/faq">{t.faq.nav} →</Link>
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
              {t.about.ctaWhatsapp} →
            </a>
          )}
        </p>
      </article>
    </>
  );
}
