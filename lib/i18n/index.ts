import az, { type Dictionary } from "./az.ts";
import en from "./en.ts";
import ru from "./ru.ts";

export const LOCALES = ["az", "en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "az";
export const LOCALE_COOKIE = "lang";

export const DICTIONARIES: Record<Locale, Dictionary> = { az, en, ru };

/** BCP 47 tags used for dates and numbers. */
export const INTL_LOCALE: Record<Locale, string> = { az: "az-AZ", en: "en-GB", ru: "ru-RU" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Picks the first supported language from an Accept-Language header. */
export function localeFromHeader(header: string | null): Locale {
  for (const part of (header ?? "").split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export type { Dictionary };
