import type { Locale } from "@/lib/i18n";

export type LevelTeacher = {
  level: string;
  name: string;
  photo_url: string | null;
  intro: string | null;
  intro_az: string | null;
  intro_ru: string | null;
  video_url: string | null;
};

export const LEVEL_TEACHER_COLUMNS = "level, name, photo_url, intro, intro_az, intro_ru, video_url";

/** The short text in the visitor's language; English visitors read the main intro only. */
export function localIntro(t: LevelTeacher, locale: Locale): string | null {
  if (locale === "az") return t.intro_az;
  if (locale === "ru") return t.intro_ru;
  return null;
}

/** The HeyGen portrait of each level's AI teacher, cropped to the same size (public/ai-teachers). */
export function aiTeacherPortrait(level: string): string {
  return `/ai-teachers/${level.toLowerCase()}.jpg`;
}
