import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Presence } from "@/components/Presence";
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.png" alt="Speakly" className="logo-img" width={152} height={52} />
        </Link>
        <nav className="nav">
          <Link href="/test">{t.nav.test}</Link>
          <Link href="/tutors">{t.nav.tutors}</Link>
          <Link href="/practice">{t.nav.practice}</Link>
          <Link href="/lessons">{t.nav.lessons}</Link>
          <Link href="/exercises">{t.nav.exercises}</Link>
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
            <>
            <Link href="/profile" className="me-link" title={t.nav.profile}>
              <Avatar name={user.full_name} url={user.avatar_url} size={34} online />
              <span className="me-name">{user.full_name}</span>
            </Link>
            <form action={signOut}>
              <button className="btn ghost small" type="submit">
                {t.nav.signOut}
              </button>
            </form>
            <Presence />
            </>
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
