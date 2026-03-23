"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type LogoItem = {
  title: string;
  subtitle: string;
  icon:
    | "leaf"
    | "factory"
    | "boxes"
    | "buy"
    | "sell"
    | "pay"
    | "receive"
    | "cashflow"
    | "dre";
};

const items: LogoItem[] = [
  { title: "Agrogestao", subtitle: "Fazenda e operacao", icon: "leaf" },
  { title: "Producao", subtitle: "Apontamentos e metas", icon: "factory" },
  { title: "Estoque", subtitle: "Entradas e saidas", icon: "boxes" },
  { title: "Compras", subtitle: "Pedidos e fornecedores", icon: "buy" },
  { title: "Vendas", subtitle: "Pedidos e faturamento", icon: "sell" },
  { title: "Contas a Pagar", subtitle: "Agenda e controle", icon: "pay" },
  { title: "Contas a Receber", subtitle: "Cobrancas e boletos", icon: "receive" },
  { title: "Fluxo de Caixa", subtitle: "Previsto x realizado", icon: "cashflow" },
  { title: "DRE", subtitle: "Resultado do periodo", icon: "dre" },
];

function Icon({ kind }: { kind: LogoItem["icon"] }) {
  const common = "h-6 w-6";
  switch (kind) {
    case "leaf":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 4c-7 0-13 6-13 13 0 2 2 3 4 3 7 0 9-6 9-16Z" stroke="currentColor" strokeWidth="2" />
          <path d="M7 17c3-1 6-4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "factory":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 21V10l6 3V10l6 3V8l6 3v10H3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M7 21v-5h4v5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "boxes":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 7l9-4 9 4-9 4-9-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M3 7v10l9 4 9-4V7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 11v10" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "buy":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 7h15l-1.5 8.5H7.2L6 7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M6 7 5 3H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
        </svg>
      );
    case "sell":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 7H8l-1 12h12l1-12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 7a4 4 0 0 0-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "pay":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="2" />
          <path d="M7 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M14 12l2-2m-2 2l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "receive":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="2" />
          <path d="M7 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M14 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "cashflow":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 15l4-4 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "dre":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 3h10v18H7V3Z" stroke="currentColor" strokeWidth="2" />
          <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

function LogoCard({ item }: { item: LogoItem }) {
  return (
    <div className="flex min-w-[240px] items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 px-5 py-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-accent-300">
        <Icon kind={item.icon} />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-black text-white">{item.title}</p>
        <p className="text-xs font-semibold text-zinc-400">{item.subtitle}</p>
      </div>
    </div>
  );
}

export function LogoMarquee() {
  // Duplicate content to create a seamless loop.
  const loop = [...items, ...items];
  const imagesRef = useRef<HTMLDivElement | null>(null);
  const [imagesInView, setImagesInView] = useState(false);
  const [activeImage, setActiveImage] = useState<null | { src: string; alt: string }>(null);

  const moduleImages = [
    { src: "/modulos/producao.svg", alt: "Modulo Producao" },
    { src: "/modulos/producao-1.svg", alt: "Modulo Producao (variante)" },
    { src: "/modulos/vendas.svg", alt: "Modulo Vendas" },
    { src: "/modulos/vendas-1.svg", alt: "Modulo Vendas (variante)" },
  ];

  useEffect(() => {
    const node = imagesRef.current;
    if (!node) return;
    if (typeof window === "undefined") return;

    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (prefersReduced) {
      setImagesInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setImagesInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeImage) return;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setActiveImage(null);
    };

    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeImage]);

  return (
    <section className="bg-[rgb(24_24_27)] py-10">
      <div className="mx-auto w-full max-w-6xl px-6">
        {/* 1) Problema (pequeno) */}
        <p className="inline-flex items-center gap-2 text-sm font-black text-zinc-100">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Seu sistema e engessado e te obriga a criar relatorios paralelos?
        </p>

        {/* 2) Headline principal (grande) */}
        <h2 className="mt-4 text-3xl font-black leading-[1.08] text-white md:text-4xl">
          Centralize tudo no Power BI
        </h2>

        {/* 3) Subheadline (apoio) */}
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
          Tenha dashboards prontos para tomar decisoes com seguranca, dados organizados, atualizados de hora em hora e apresentados de forma simples para voce agir rapido
        </p>

        {/* 4) Beneficios (3 colunas em destaque visual) */}
        <div className="mt-7 grid gap-3 md:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 px-5 py-4">
            <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-500/15 text-accent-300">
              ✓
            </span>
            <p className="text-sm font-bold text-zinc-100">
              Tudo centralizado em um so lugar
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 px-5 py-4">
            <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-500/15 text-accent-300">
              ✓
            </span>
            <p className="text-sm font-bold text-zinc-100">
              Dados atualizados em tempo real
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 px-5 py-4">
            <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-500/15 text-accent-300">
              ✓
            </span>
            <p className="text-sm font-bold text-zinc-100">
              Clareza total para decisoes rapidas
            </p>
          </div>
        </div>

        <div ref={imagesRef} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {moduleImages.map((img, idx) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setActiveImage(img)}
              className={[
                "group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 text-left",
                "hover:bg-zinc-900/40",
                "motion-safe:transition motion-safe:duration-700 motion-safe:ease-out",
                imagesInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6",
              ].join(" ")}
              style={{ transitionDelay: `${idx * 120}ms` }}
              aria-label={`Abrir imagem: ${img.alt}`}
            >
              <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent" />
              </div>
              <div className="p-3">
                <div className="flex h-32 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/30">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={1200}
                    height={720}
                    className="h-28 w-full object-contain"
                    priority={false}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-10 text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
          Modulos que estruturam a operacao
        </p>
      </div>

      <div className="relative mt-8 overflow-hidden">
        <div className="marquee-track px-6">
          {loop.map((item, idx) => (
            <LogoCard key={`${item.title}-${idx}`} item={item} />
          ))}
        </div>

        {/* Edge fades (left/right) to match the reference look */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[calc(18rem+120px)] bg-gradient-to-r from-[rgb(24_24_27)] via-[rgb(24_24_27)]/90 to-transparent md:w-[calc(24rem+120px)] lg:w-[540px]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[calc(18rem+120px)] bg-gradient-to-l from-[rgb(24_24_27)] via-[rgb(24_24_27)]/90 to-transparent md:w-[calc(24rem+120px)] lg:w-[540px]" />
      </div>

      {activeImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Visualizacao de imagem"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950"
            onClick={(ev) => ev.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute right-4 top-4 rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs font-black text-zinc-100 hover:bg-zinc-900"
            >
              Fechar
            </button>

            <div className="p-4 md:p-6">
              <div className="flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
                <Image
                  src={activeImage.src}
                  alt={activeImage.alt}
                  width={1600}
                  height={900}
                  className="h-auto w-full object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
