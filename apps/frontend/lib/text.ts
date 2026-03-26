import { APP_LOCALE } from "@/lib/locale";

export function toUpperText(v: string): string {
  // Use locale-aware uppercase for Portuguese (accents, cedilla, etc.).
  return (v ?? "").toLocaleUpperCase(APP_LOCALE);
}

