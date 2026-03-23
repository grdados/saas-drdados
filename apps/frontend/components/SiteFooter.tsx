import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Image
              src="/logo_horizontal.png"
              alt="GR Dados"
              width={360}
              height={120}
              className="h-12 w-auto"
            />
            <p className="mt-5 max-w-md text-sm leading-7 text-zinc-900/90">
              A GR Dados desenvolve sistemas sob medida para empresas que precisam
              de mais controle, clareza operacional e base tecnologica para crescer.
            </p>

            <div className="mt-6 flex items-start gap-3 text-sm text-zinc-900">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-black/15 bg-black/10 text-zinc-950">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 13.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              <div>
                <p className="font-black text-zinc-950">Base estrategica</p>
                <p className="text-zinc-900/90 whitespace-nowrap">
                  AV 22 de abril, 519 - Centro - Laguna Carapa - MS
                </p>
                <p className="text-zinc-900/90">CEP 79920-000</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="text-sm font-black text-zinc-950">Solucoes</p>
            <div className="mt-4 space-y-3 text-sm text-zinc-900/90">
              <Link className="block hover:text-zinc-950" href="/servicos/power-bi">
                Power BI
              </Link>
              <Link className="block hover:text-zinc-950" href="/servicos/erp">
                ERP
              </Link>
              <Link className="block hover:text-zinc-950" href="/servicos/crm">
                CRM
              </Link>
              <Link className="block hover:text-zinc-950" href="/servicos/landing-page">
                Landing Page
              </Link>
            </div>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm font-black text-zinc-950">Institucional</p>
            <div className="mt-4 space-y-3 text-sm">
              <a className="block text-zinc-900/90 hover:text-zinc-950" href="/#inicio">
                Inicio
              </a>
              <a className="block text-zinc-900/90 hover:text-zinc-950" href="/#problemas">
                Problemas
              </a>
              <a className="block text-zinc-900/90 hover:text-zinc-950" href="/#solucao">
                Solucao
              </a>
              <a className="block text-zinc-900/90 hover:text-zinc-950" href="/#modulos">
                Modulos
              </a>
              <a className="block text-zinc-900/90 hover:text-zinc-950" href="/#beneficios">
                Beneficios
              </a>
              <a className="block text-zinc-900/90 hover:text-zinc-950" href="/#sobre">
                Sobre
              </a>
              <a className="block text-zinc-900/90 hover:text-zinc-950" href="/#depoimentos">
                Depoimentos
              </a>
              <a className="block text-zinc-900/90 hover:text-zinc-950" href="/#quanto-custa">
                Quanto custa?
              </a>
              <a
                className="block text-zinc-900/90 hover:text-zinc-950"
                href="/#localizacao"
              >
                Localizacao
              </a>
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="text-sm font-black text-zinc-950">Canais Institucionais</p>
            <div className="mt-4 space-y-4">
              <div className="w-full min-w-[260px] rounded-2xl border border-black/10 bg-white/70 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] md:min-w-[320px]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-700">
                  WhatsApp Comercial
                </p>
                <p className="mt-2 whitespace-nowrap text-sm font-black text-zinc-950">
                  <a
                    className="inline-block whitespace-nowrap underline tabular-nums"
                    href="tel:+5567998698159"
                  >
                    (67) 99869-8159
                  </a>
                </p>
              </div>
              <div className="w-full min-w-[260px] rounded-2xl border border-black/10 bg-white/70 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] md:min-w-[320px]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-700">
                  Endereco
                </p>
                <p className="mt-2 whitespace-nowrap text-sm font-black text-zinc-950">
                  Laguna Carapa - MS
                </p>
                <p className="text-xs font-semibold text-zinc-900/80">CEP 79920-000</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-black/10 pt-8 text-sm text-zinc-900/80 md:flex-row md:items-center">
          <p>(c) 2026 GR Dados. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a className="hover:text-zinc-950" href="#">
              Politica de Privacidade
            </a>
            <a className="hover:text-zinc-950" href="#">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
