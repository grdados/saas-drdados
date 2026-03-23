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
    <main className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <section className="mx-auto grid w-full max-w-6xl items-stretch gap-8 px-6 py-10 md:grid-cols-12">
        <div className="md:col-span-6">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-panel">
            <div className="absolute -left-24 -top-24 h-60 w-60 rounded-full bg-accent-500/15 blur-3xl" />
            <div className="relative">
              <h1 className="text-2xl font-black text-white">{title}</h1>
              <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
              <div className="mt-6">{children}</div>
            </div>
          </div>
        </div>

        <div className="relative hidden overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 md:col-span-6 md:block">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/0 via-zinc-950/25 to-zinc-950/70" />
          <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
          <div className="relative h-full p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
              Portal GR Dados
            </p>
            <p className="mt-3 max-w-sm text-sm text-zinc-300">
              Uma visao rapida do seu funil, tarefas e performance comercial em um unico painel.
            </p>
            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
              <Image
                src="/auth-dashboard.svg"
                alt="Dashboard ilustrativo"
                width={720}
                height={520}
                className="h-auto w-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
