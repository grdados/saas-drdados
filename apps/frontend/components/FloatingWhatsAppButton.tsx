"use client";

import { useMemo } from "react";

function formatWhatsAppLink(message: string) {
  const phone = "5567998698159";
  const text = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${text}`;
}

export function FloatingWhatsAppButton() {
  const href = useMemo(() => formatWhatsAppLink("Olá! Quero falar sobre um projeto com a GR Dados."), []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={[
        "fixed bottom-6 right-6 z-[60] inline-flex items-center gap-3 rounded-full",
        "bg-accent-500 px-5 py-4 text-sm font-black text-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.45)]",
        "transition hover:-translate-y-0.5 hover:bg-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
      ].join(" ")}
      aria-label="Falar no WhatsApp"
      title="Falar no WhatsApp"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/10">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.52 3.48A11.86 11.86 0 0 0 12.02 0C5.4 0 .02 5.38.02 12a11.93 11.93 0 0 0 1.58 5.95L0 24l6.2-1.63A12 12 0 0 0 12.02 24C18.64 24 24 18.62 24 12c0-3.2-1.25-6.2-3.48-8.52Z"
            fill="currentColor"
            opacity="0.2"
          />
          <path
            d="M12.02 22.02c-1.9 0-3.76-.5-5.4-1.45l-.39-.23-3.68.97.98-3.58-.25-.37A9.98 9.98 0 0 1 2.02 12c0-5.52 4.49-10 10-10 2.67 0 5.18 1.04 7.07 2.93A9.93 9.93 0 0 1 22.02 12c0 5.52-4.49 10.02-10 10.02Z"
            fill="currentColor"
          />
          <path
            d="M17.42 14.45c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.77-1.65-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.5s1.06 2.9 1.21 3.1c.15.2 2.08 3.18 5.04 4.46.7.3 1.24.48 1.66.61.7.22 1.33.19 1.83.12.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"
            fill="#111113"
          />
        </svg>
      </span>
      <span className="hidden sm:block">WhatsApp</span>
    </a>
  );
}

