import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { SHOW_LIVE_TUTORS } from "@/lib/features";
import { whatsappDigits } from "@/lib/whatsapp";

export async function Footer() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = DICTIONARIES[locale];
  const learn: [string, string][] = [
    ["/test", t.nav.test],
    ["/ai-teachers", t.nav.aiTeachers],
    ["/lessons", t.nav.lessons],
    ["/practice", t.nav.practice],
    ["/exercises", t.nav.exercises],
    ...(SHOW_LIVE_TUTORS ? [["/tutors", t.nav.tutors] as [string, string]] : []),
  ];
  const account: [string, string][] = user
    ? [
        ["/dashboard", t.nav.myClasses],
        ["/profile", t.footer.profile],
      ]
    : [
        ["/login", t.nav.signIn],
        ["/signup", t.nav.signUp],
      ];
  // Same school number as the payment page (Vercel WHATSAPP_NUMBER); the link is hidden until it is set.
  const wa = whatsappDigits(process.env.WHATSAPP_NUMBER);
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Link href="/" aria-label="Speakly AI" className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-light.png" alt="Speakly AI" className="logo-img" width={152} height={52} />
            <span className="logo-ai" aria-hidden="true">AI</span>
          </Link>
          <p>{t.footer.tagline}</p>
        </div>
        <nav aria-label={t.footer.learn}>
          <strong>{t.footer.learn}</strong>
          {learn.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
        <nav aria-label={t.footer.account}>
          <strong>{t.footer.account}</strong>
          {account.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
        {wa && (
          <nav aria-label={t.footer.contact}>
            <strong>{t.footer.contact}</strong>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="footer-wa">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2-.2-.2-.5-.3Z" />
              </svg>
              {t.footer.whatsapp}
            </a>
          </nav>
        )}
      </div>
      <div className="wrap footer-bottom">
        © {new Date().getFullYear()} Speakly AI · {t.footer.rights}
      </div>
    </footer>
  );
}
