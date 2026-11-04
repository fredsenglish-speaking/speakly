import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { priceFacts } from "@/lib/priceFacts";
import { whatsappDigits } from "@/lib/whatsapp";

export async function generateMetadata() {
  const f = DICTIONARIES[await getLocale()].faq;
  return {
    title: f.seoTitle,
    description: f.seoDescription,
    alternates: { canonical: "/faq" },
    openGraph: { title: `${f.seoTitle} | Speakly AI`, description: f.seoDescription, url: "/faq" },
  };
}

export default async function FaqPage() {
  const t = DICTIONARIES[await getLocale()];
  const f = t.faq;
  const items = f.items(priceFacts());
  const wa = whatsappDigits(process.env.WHATSAPP_NUMBER);
  // Lets search engines show the answers directly (FAQPage rich result).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <section className="ab-hero">
        <div className="ab-inner">
          <span className="kicker">{f.kicker}</span>
          <h1 className="ab-title">{f.title}</h1>
          <p className="ab-lead">{f.lead}</p>
        </div>
      </section>

      <section className="home-section legal-body">
        <FaqList items={items} />
      </section>

      <section className="home-section ab-contact">
        <div>
          <h2>{f.moreQuestions}</h2>
          <p>{t.about.ctaText}</p>
        </div>
        <div className="row">
          <Link href="/test" className="btn gold">
            {t.about.ctaTest} →
          </Link>
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="btn hero-ghost">
              {t.about.ctaWhatsapp}
            </a>
          )}
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
