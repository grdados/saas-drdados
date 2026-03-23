import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-1.svg"
            alt="GR Dados"
            width={320}
            height={80}
            className="h-12 w-auto md:h-14"
          />
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link
            href="/#inicio"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Inicio
          </Link>
          <Link
            href="/#problemas"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Problemas
          </Link>
          <Link
            href="/#solucao"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Solucao
          </Link>
          <Link
            href="/#modulos"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Modulos
          </Link>
          <Link
            href="/#beneficios"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Beneficios
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
                Mais
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
            <div className="absolute left-0 top-[calc(100%+10px)] z-30 w-64 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl shadow-black/50">
              <Link
                href="/#depoimentos"
                className="block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900"
              >
                Depoimentos
              </Link>
              <Link
                href="/iniciar-projeto"
                className="block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900"
              >
                Iniciar um projeto
              </Link>
              <Link
                href="/#quanto-custa"
                className="block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900"
              >
                Quanto custa?
              </Link>
              <Link
                href="/#localizacao"
                className="block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900"
              >
                Localizacao
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
