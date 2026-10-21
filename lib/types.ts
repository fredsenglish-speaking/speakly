export type TutorRow = {
  id: string;
  bio: string;
  languages: string;
  years_experience: number;
  levels: string[];
  price_15: number;
  price_30: number;
  price_60: number;
  intro_video_url: string | null;
  profiles: { full_name: string } | null;
};

export const TUTOR_COLUMNS =
  "id, bio, languages, years_experience, levels, price_15, price_30, price_60, intro_video_url, profiles(full_name)";
