"use client";

import Image from "next/image";

import { SiteHeader } from "@/components/SiteHeader";

export function AuthLayout({
  title,
  subtitle,
  hideHeading = false,
  children
}: {
  title: string;
  subtitle: string;
  hideHeading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950 text-white">
      <SiteHeader />
      <section className="relative mx-auto grid min-h-[calc(100vh-78px)] w-full max-w-6xl place-items-center px-4 py-6 sm:px-6 sm:py-8 lg:min-h-[calc(100vh-86px)] lg:py-10">
        <div className="pointer-events-none absolute -left-28 top-16 h-56 w-56 rounded-full bg-accent-500/15 blur-3xl sm:h-72 sm:w-72" />
        <div className="pointer-events-none absolute -right-20 bottom-4 h-60 w-60 rounded-full bg-emerald-400/10 blur-3xl sm:h-80 sm:w-80" />

        <div className="relative w-full max-w-[480px] lg:max-w-[520px]">
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.42)] sm:p-6 lg:rounded-[28px] lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(223,152,48,0.16),transparent_45%)]" />
            <div className="absolute -left-24 top-16 h-44 w-44 rounded-full bg-accent-500/15 blur-3xl sm:h-56 sm:w-56" />

            <div className="relative">
              <div className="mb-4 flex justify-center sm:mb-5">
                <Image
                  src="/logo_horizontal.png"
                  alt="GR Dados"
                  width={300}
                  height={84}
                  className="h-auto w-auto max-w-[200px] sm:max-w-[240px] lg:max-w-[280px]"
                  priority
                />
              </div>

              {!hideHeading ? (
                <div className="text-center">
                  <h1 className="mt-1 text-2xl font-black leading-tight text-white sm:mt-2 sm:text-[1.75rem] lg:text-[2rem]">{title}</h1>
                  <p className="mt-2 text-xs text-zinc-300 sm:text-sm">{subtitle}</p>
                </div>
              ) : null}

              <div className={hideHeading ? "mt-1" : "mt-5 sm:mt-6"}>{children}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
