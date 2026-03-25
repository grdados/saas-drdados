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
      <section className="relative mx-auto grid min-h-[calc(100vh-86px)] w-full max-w-7xl place-items-center px-6 py-10">
        <div className="pointer-events-none absolute -left-28 top-16 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-4 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative w-full max-w-[560px]">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 p-8 shadow-[0_35px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(223,152,48,0.16),transparent_45%)]" />
            <div className="absolute -left-24 top-16 h-56 w-56 rounded-full bg-accent-500/15 blur-3xl" />

            <div className="relative">
              <div className="mb-5 flex justify-center">
                <Image
                  src="/logo_horizontal.png"
                  alt="GR Dados"
                  width={300}
                  height={84}
                  className="h-auto w-auto max-w-[260px] sm:max-w-[300px]"
                  priority
                />
              </div>

              <div className="text-center">
                <span className="inline-flex rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-accent-200">
                  Portal GR Dados
                </span>
                <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-[2rem]">{title}</h1>
                <p className="mt-2 text-sm text-zinc-300">{subtitle}</p>
              </div>

              <div className="mt-7">{children}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
