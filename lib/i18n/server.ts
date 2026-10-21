import "server-only";
import { cookies, headers } from "next/headers";
import { DICTIONARIES, LOCALE_COOKIE, isLocale, localeFromHeader, type Locale } from "./index";

export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return localeFromHeader((await headers()).get("accept-language"));
}

export async function getT() {
  return DICTIONARIES[await getLocale()];
}
