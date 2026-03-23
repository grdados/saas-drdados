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
  const activeIndex = useMemo(() => {
    const idx = sections.findIndex((s) => s.id === active);
    return idx >= 0 ? idx : 0;
  }, [active, sections]);

  useEffect(() => {
    if (!onHome) return;

    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!els.length) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const header = document.querySelector("header");
      const headerH = header ? header.getBoundingClientRect().height : 0;
      // Line used to decide "current section" (below sticky header).
      const lineY = Math.round(headerH + 26);

      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.top <= lineY && r.bottom >= lineY) {
          setActive(el.id);
          return;
        }
      }

      // Fallback: closest section to the line
      let bestId = els[0].id;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.top - lineY);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = el.id;
        }
      }
      setActive(bestId);
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onHome, sections]);

  if (!onHome) return null;

  return (
    <div className="pointer-events-none fixed left-4 top-1/2 z-[55] -translate-y-1/2 sm:left-6">
      <div className="pointer-events-auto relative rounded-[28px] border border-zinc-800 bg-zinc-950/40 px-3 py-4 backdrop-blur">
        {/* Track */}
        <div className="pointer-events-none absolute inset-y-3 left-1/2 w-3 -translate-x-1/2 rounded-full bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
        {/* Active glow that moves with the current section */}
        <div
          className="pointer-events-none absolute left-1/2 top-4 h-8 w-3 -translate-x-1/2 rounded-full bg-gradient-to-b from-accent-500/70 via-accent-500/25 to-transparent blur-[0.3px] transition-transform duration-300"
          style={{ transform: `translateX(-50%) translateY(${activeIndex * 40}px)` }}
        />
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
                className="group relative flex h-8 w-8 items-center justify-center"
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
                    "pointer-events-none absolute left-6 whitespace-nowrap rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs font-black text-zinc-200 shadow-2xl shadow-black/40 transition",
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
