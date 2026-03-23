"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Section = { id: string; label: string };

export function SectionIndicator() {
  const pathname = usePathname();
  const onHome = pathname === "/";

  const sections: Section[] = useMemo(
    () => [
      { id: "inicio", label: "Inicio" },
      { id: "problemas", label: "Problemas" },
      { id: "solucao", label: "Solucao" },
      { id: "modulos", label: "Modulos" },
      { id: "beneficios", label: "Beneficios" },
      { id: "sobre", label: "Sobre" },
      { id: "depoimentos", label: "Depoimentos" },
      { id: "quanto-custa", label: "Quanto custa" },
      { id: "localizacao", label: "Localizacao" }
    ],
    []
  );

  const [active, setActive] = useState<string>("inicio");

  useEffect(() => {
    if (!onHome) return;

    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive((entry.target as HTMLElement).id);
        }
      },
      {
        root: null,
        threshold: 0.12,
        rootMargin: "-40% 0px -55% 0px"
      }
    );

    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, [onHome, sections]);

  if (!onHome) return null;

  return (
    <div className="pointer-events-none fixed right-6 top-1/2 z-[55] hidden -translate-y-1/2 lg:block">
      <div className="pointer-events-auto rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-3 backdrop-blur">
        <div className="flex flex-col gap-2">
          {sections.map((s) => {
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  const el = document.getElementById(s.id);
                  if (!el) return;
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="group relative flex items-center gap-3"
                aria-label={`Ir para ${s.label}`}
              >
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full border transition",
                    isActive
                      ? "border-accent-500 bg-accent-500 shadow-[0_0_0_6px_rgba(223,152,48,0.12)]"
                      : "border-zinc-600 bg-zinc-950"
                  ].join(" ")}
                />
                <span
                  className={[
                    "pointer-events-none absolute right-6 whitespace-nowrap rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs font-black text-zinc-200 shadow-2xl shadow-black/40 transition",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
