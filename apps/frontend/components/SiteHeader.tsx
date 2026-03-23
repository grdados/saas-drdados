import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/elvis-correia-logo.svg"
            alt="Logo"
            width={46}
            height={46}
            className="rounded-full"
          />
          <div>
            <p className="text-lg font-extrabold leading-none tracking-tight text-white">
              GR Dados
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              ERP
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link
            href="/#inicio"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Inicio
          </Link>
          <Link
            href="/#sobre"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Sobre
          </Link>

          <details className="group relative">
            <summary className="list-none cursor-pointer rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900">
              <span className="inline-flex items-center gap-2">
                Servicos
                <svg
                  className="h-4 w-4 text-zinc-400 transition group-open:rotate-180"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </summary>

            <div className="absolute left-0 top-[calc(100%+10px)] z-30 w-56 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl shadow-black/50">
              <Link
                href="/servicos/power-bi"
                className="block px-4 py-3 text-sm font-black text-accent-300 hover:bg-zinc-900"
              >
                Power BI
              </Link>
              <Link
                href="/servicos/erp"
                className="block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900"
              >
                ERP
              </Link>
              <Link
                href="/servicos/crm"
                className="block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900"
              >
                CRM
              </Link>
              <Link
                href="/servicos/landing-page"
                className="block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900"
              >
                Landing Page
              </Link>
            </div>
          </details>

          <Link
            href="/#localizacao"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Localizacao
          </Link>
        </nav>

        <Link
          href="/login"
          className="rounded-2xl bg-accent-500 px-6 py-3 text-sm font-black text-zinc-950 transition hover:bg-accent-400"
        >
          Login
        </Link>
      </div>
    </header>
  );
}
