import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LOCALES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { DICTIONARIES } from "@/lib/i18n";
import { signOut } from "@/app/(auth)/actions";
import { setLanguage } from "@/app/lang/actions";

export async function Header() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const isTutor = user?.role === "tutor" || user?.role === "admin";

  return (
    <header className="bar">
      <div className="wrap">
        <Link href="/" className="logo">
          <i>S</i>Speakly
        </Link>
        <nav className="nav">
          <Link href="/test">{t.nav.test}</Link>
          <Link href="/tutors">{t.nav.tutors}</Link>
          <Link href="/practice">{t.nav.practice}</Link>
          <Link href="/lessons">{t.nav.lessons}</Link>
          {user && <Link href="/dashboard">{t.nav.myClasses}</Link>}
          {isTutor && <Link href="/tutor">{t.nav.tutorPanel}</Link>}
          {user?.role === "admin" && <Link href="/admin">{t.nav.admin}</Link>}
        </nav>
        <div className="row">
          <form action={setLanguage} className="langs" aria-label={t.nav.language}>
            {LOCALES.map((l) => (
              <button
                key={l}
                type="submit"
                name="locale"
                value={l}
                aria-pressed={l === locale}
                title={DICTIONARIES[l].langName}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </form>
          {user ? (
            <form action={signOut}>
              <button className="btn ghost small" type="submit">
                {t.nav.signOut}
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className="btn ghost small">
                {t.nav.signIn}
              </Link>
              <Link href="/signup" className="btn small">
                {t.nav.signUp}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
