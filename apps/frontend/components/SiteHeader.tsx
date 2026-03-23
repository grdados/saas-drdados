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
              GRDados
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              CRM SAAS
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link
            href="/#"
            className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold text-accent-300"
          >
            Inicio
          </Link>
          <Link
            href="/#sobre"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Sobre
          </Link>
          <Link
            href="/#recursos"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Servicos
          </Link>
          <Link
            href="/#planos"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Cases
          </Link>
          <Link
            href="/#contato"
            className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
          >
            Blog
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

