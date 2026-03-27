"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n";
import { useLocale } from "@/components/LocaleProvider";

export function LocaleSwitcher() {
  const router = useRouter();
  const { locale, messages } = useLocale();

  function setLocale(nextLocale: AppLocale) {
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] p-1">
      <span className="sr-only">{messages.localeSwitcher.label}</span>
      {SUPPORTED_LOCALES.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            className={[
              "rounded-xl px-3 py-2 text-xs font-black transition",
              active
                ? "bg-accent-500 text-zinc-950"
                : "text-zinc-300 hover:bg-white/5 hover:text-white"
            ].join(" ")}
            aria-pressed={active}
          >
            {messages.localeSwitcher.options[option]}
          </button>
        );
      })}
    </div>
  );
}
