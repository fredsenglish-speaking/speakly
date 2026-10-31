import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { SHOW_LIVE_TUTORS } from "@/lib/features";

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
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Link href="/" aria-label="Speakly">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-light.png" alt="Speakly" className="logo-img" width={152} height={52} />
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
      </div>
      <div className="wrap footer-bottom">
        © {new Date().getFullYear()} Speakly · {t.footer.rights}
      </div>
    </footer>
  );
}
