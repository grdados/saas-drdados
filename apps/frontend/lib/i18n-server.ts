import { cookies, headers } from "next/headers";

import {
  LOCALE_COOKIE_NAME,
  detectLocaleFromAcceptLanguage,
  resolveLocale,
  type AppLocale
} from "@/lib/i18n";

export async function getCurrentLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale) return resolveLocale(cookieLocale);

  const headerStore = await headers();
  return detectLocaleFromAcceptLanguage(headerStore.get("accept-language"));
}
