"use client";

import { createContext, useContext } from "react";

import type { AppLocale, Messages } from "@/lib/i18n";

const LocaleContext = createContext<{ locale: AppLocale; messages: Messages } | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children
}: {
  locale: AppLocale;
  messages: Messages;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={{ locale, messages }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider.");
  }

  return context;
}
