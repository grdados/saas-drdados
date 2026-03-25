"use client";

import Image from "next/image";

import { SiteHeader } from "@/components/SiteHeader";

export function AuthLayout({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950 text-white">
      <SiteHeader />
      <section className="relative mx-auto grid w-full max-w-7xl items-stretch gap-8 px-6 py-10 md:grid-cols-12">
        <div className="pointer-events-none absolute -left-28 top-16 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-4 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative md:col-span-5">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 p-8 shadow-[0_35px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(223,152,48,0.16),transparent_45%)]" />
            <div className="absolute -left-24 top-16 h-56 w-56 rounded-full bg-accent-500/15 blur-3xl" />
            <div className="relative">
              <span className="inline-flex rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-accent-200">
                Portal GR Dados
              </span>
              <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-[2rem]">{title}</h1>
              <p className="mt-2 text-sm text-zinc-300">{subtitle}</p>
              <div className="mt-7">{children}</div>
            </div>
          </div>
        </div>

        <div className="relative hidden overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 md:col-span-7 md:block">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(223,152,48,0.12),rgba(24,24,27,0.06),rgba(16,185,129,0.08))]" />
          <div className="absolute right-8 top-8 h-20 w-20 rounded-full border border-emerald-400/30 bg-emerald-400/10" />
          <div className="relative flex h-full flex-col p-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-accent-200">Painel Analitico</p>
            <h2 className="mt-4 max-w-lg text-3xl font-black leading-tight text-white">
              Controle comercial e financeiro com visao em tempo real.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-zinc-300">
              Acesso unico para acompanhar funil, faturamento, pedidos e indicadores da operacao.
            </p>
            <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-950/35 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur">
              <Image
                src="/auth-dashboard.svg"
                alt="Dashboard ilustrativo"
                width={720}
                height={520}
                className="h-auto w-full"
                priority
              />
            </div>
            <div className="mt-6 flex items-center gap-3 text-xs font-bold text-zinc-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Sistema online
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-accent-100">
                Acesso seguro
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
