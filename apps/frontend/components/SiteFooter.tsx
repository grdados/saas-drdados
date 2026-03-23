import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Image
              src="/gr-dados-logo-gray.svg"
              alt="GR Dados"
              width={210}
              height={56}
            />
            <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400">
              A GR Dados desenvolve sistemas sob medida para empresas que precisam
              de mais controle, clareza operacional e base tecnologica para crescer.
            </p>

            <div className="mt-6 flex items-start gap-3 text-sm text-zinc-300">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-accent-300">
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
                <p className="font-black text-zinc-100">Base estrategica</p>
                <p className="text-zinc-400">
                  AV 22 de abril, 519 - Centro - Laguna Carapa - MS
                </p>
                <p className="text-zinc-400">CEP 79920-000</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="text-sm font-black text-zinc-100">Solucoes</p>
            <div className="mt-4 space-y-3 text-sm text-zinc-400">
              <Link className="block hover:text-zinc-200" href="/servicos/power-bi">
                Power BI
              </Link>
              <Link className="block hover:text-zinc-200" href="/servicos/erp">
                ERP
              </Link>
              <Link className="block hover:text-zinc-200" href="/servicos/crm">
                CRM
              </Link>
              <Link className="block hover:text-zinc-200" href="/servicos/landing-page">
                Landing Page
              </Link>
            </div>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm font-black text-zinc-100">Institucional</p>
            <div className="mt-4 space-y-3 text-sm">
              <a className="block text-zinc-400 hover:text-zinc-200" href="/#inicio">
                Inicio
              </a>
              <a className="block text-zinc-400 hover:text-zinc-200" href="/#problemas">
                Problemas
              </a>
              <a className="block text-zinc-400 hover:text-zinc-200" href="/#solucao">
                Solucao
              </a>
              <a className="block text-zinc-400 hover:text-zinc-200" href="/#modulos">
                Modulos
              </a>
              <a className="block text-zinc-400 hover:text-zinc-200" href="/#beneficios">
                Beneficios
              </a>
              <a className="block text-zinc-400 hover:text-zinc-200" href="/#sobre">
                Sobre
              </a>
              <a className="block text-zinc-400 hover:text-zinc-200" href="/#depoimentos">
                Depoimentos
              </a>
              <a className="block text-zinc-400 hover:text-zinc-200" href="/#quanto-custa">
                Quanto custa?
              </a>
              <a
                className="block text-zinc-400 hover:text-zinc-200"
                href="/#localizacao"
              >
                Localizacao
              </a>
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="text-sm font-black text-zinc-100">Canais Institucionais</p>
            <div className="mt-4 space-y-4">
              <div className="w-full min-w-[260px] rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:min-w-[320px]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
                  WhatsApp Comercial
                </p>
                <p className="mt-2 whitespace-nowrap text-sm font-black text-zinc-100">
                  <a
                    className="inline-block whitespace-nowrap underline tabular-nums"
                    href="tel:+5567998698159"
                  >
                    (67) 99869-8159
                  </a>
                </p>
              </div>
              <div className="w-full min-w-[260px] rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:min-w-[320px]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
                  Endereco
                </p>
                <p className="mt-2 whitespace-nowrap text-sm font-black text-zinc-100">
                  Laguna Carapa - MS
                </p>
                <p className="text-xs font-semibold text-zinc-400">CEP 79920-000</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-zinc-800 pt-8 text-sm text-zinc-500 md:flex-row md:items-center">
          <p>© 2026 GR Dados. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a className="hover:text-zinc-300" href="#">
              Politica de Privacidade
            </a>
            <a className="hover:text-zinc-300" href="#">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
