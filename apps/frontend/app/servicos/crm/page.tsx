import Image from "next/image";
import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function CRMServicePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.25]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "52px 52px"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/20 via-zinc-950/70 to-zinc-950" />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-accent-300">
              <span className="h-2 w-2 rounded-full bg-accent-400" />
              CRM
            </p>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Controle o funil
              <span className="block text-accent-400">e acelere vendas.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300">
              CRM sob medida para o seu processo: pipeline, tarefas, historico e
              indicadores do time comercial.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex justify-center rounded-xl bg-accent-500 px-8 py-4 text-sm font-black text-zinc-950 hover:bg-accent-400"
              >
                Solicitar acesso
              </Link>
              <a
                href="/#localizacao"
                className="inline-flex justify-center rounded-xl border border-zinc-700 bg-zinc-950/40 px-8 py-4 text-sm font-black text-zinc-100 hover:bg-zinc-900"
              >
                Falar com a GR Dados
              </a>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-zinc-200">
              <p className="font-black text-zinc-100">Inclui:</p>
              <ul className="space-y-2 text-zinc-300">
                <li>Cadastro de leads e empresas</li>
                <li>Pipeline visual e tarefas</li>
                <li>Relatorios e metas por responsavel</li>
              </ul>
            </div>
          </div>

          <div className="md:col-span-6">
            <div className="relative">
              <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-accent-500/15 blur-3xl" />
              <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 p-5">
                <Image
                  src="/service-card-crm.svg"
                  alt="Preview CRM"
                  width={1200}
                  height={720}
                  className="h-auto w-full"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

