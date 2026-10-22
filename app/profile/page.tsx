import Link from "next/link";
import { LevelChip } from "@/components/LevelChip";
import { requireUser } from "@/lib/auth";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { ProfileForm } from "./ProfileForm";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].me.title };
}

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const t = DICTIONARIES[await getLocale()];
  return (
    <section className="stack">
      <h2>{t.me.title}</h2>
      <ProfileForm name={user.full_name} avatarUrl={user.avatar_url} />
      <p className="small muted">
        {t.me.level}:{" "}
        {user.level ? <LevelChip level={user.level} /> : <Link href="/test">{t.me.noLevel}</Link>}
      </p>
    </section>
  );
}
