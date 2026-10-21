import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

export async function Header() {
  const user = await getCurrentUser();
  const isTutor = user?.role === "tutor" || user?.role === "admin";

  return (
    <header className="bar">
      <div className="wrap">
        <Link href="/" className="logo">
          <i>S</i>Speakly
        </Link>
        <nav className="nav">
          <Link href="/test">Səviyyə testi</Link>
          <Link href="/tutors">Müəllimlər</Link>
          <Link href="/lessons">Lessons</Link>
          {user && <Link href="/dashboard">Dərslərim</Link>}
          {isTutor && <Link href="/tutor">Müəllim paneli</Link>}
          {user?.role === "admin" && <Link href="/admin">İdarə</Link>}
        </nav>
        <div className="row">
          {user ? (
            <form action={signOut}>
              <button className="btn ghost small" type="submit">
                Çıxış
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className="btn ghost small">
                Daxil ol
              </Link>
              <Link href="/signup" className="btn small">
                Qeydiyyat
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
