"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

function NavLink({
  href,
  children,
  scrolled
}: {
  href: string;
  children: React.ReactNode;
  scrolled: boolean;
}) {
  const baseText = scrolled ? "text-zinc-900/80" : "text-zinc-200";
  const baseHover = scrolled ? "hover:bg-black/5" : "hover:bg-zinc-900";

  return (
    <Link
      href={href}
      className={[
        "relative rounded-xl px-4 py-2 text-sm font-black transition-colors",
        "after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-0.5 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-accent-500 after:transition-transform after:duration-300",
        "hover:text-accent-500 hover:after:scale-x-100",
        baseText,
        baseHover
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerClass = useMemo(() => {
    if (!scrolled) return "border-b border-zinc-800 bg-zinc-950/90";
    return "border-b border-black/10 bg-white/70 backdrop-blur-xl";
  }, [scrolled]);

  const menuPanelClass = scrolled
    ? "border border-black/10 bg-white/80 shadow-2xl shadow-black/10"
    : "border border-zinc-800 bg-zinc-950/95 shadow-2xl shadow-black/50";

  const menuItemClass = scrolled
    ? "text-zinc-900/80 hover:bg-black/5 hover:text-accent-600"
    : "text-zinc-200 hover:bg-zinc-900";

  return (
    <header className={["sticky top-0 z-50 transition-colors duration-300", headerClass].join(" ")}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-2.svg"
            alt="GR Dados"
            width={220}
            height={56}
            className="h-10 w-auto rounded-2xl md:h-11"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Menu">
          <NavLink href={onHome ? "#inicio" : "/#inicio"} scrolled={scrolled}>
            Inicio
          </NavLink>
          <NavLink href={onHome ? "#problemas" : "/#problemas"} scrolled={scrolled}>
            Problemas
          </NavLink>
          <NavLink href={onHome ? "#solucao" : "/#solucao"} scrolled={scrolled}>
            Solucao
          </NavLink>
          <NavLink href={onHome ? "#modulos" : "/#modulos"} scrolled={scrolled}>
            Modulos
          </NavLink>
          <NavLink href={onHome ? "#beneficios" : "/#beneficios"} scrolled={scrolled}>
            Beneficios
          </NavLink>
          <NavLink href={onHome ? "#sobre" : "/#sobre"} scrolled={scrolled}>
            Sobre
          </NavLink>

          <details className="group relative">
            <summary
              className={[
                "list-none cursor-pointer rounded-xl px-4 py-2 text-sm font-black transition-colors",
                scrolled ? "text-zinc-900/80 hover:bg-black/5 hover:text-accent-600" : "text-zinc-200 hover:bg-zinc-900"
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-2">
                Mais
                <svg
                  className={[
                    "h-4 w-4 transition group-open:rotate-180",
                    scrolled ? "text-zinc-700" : "text-zinc-400"
                  ].join(" ")}
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
            <div className={["absolute left-0 top-[calc(100%+10px)] z-30 w-64 overflow-hidden rounded-2xl", menuPanelClass].join(" ")}>
              <Link
                href={onHome ? "#depoimentos" : "/#depoimentos"}
                className={["block px-4 py-3 text-sm font-black transition-colors", menuItemClass].join(" ")}
              >
                Depoimentos
              </Link>
              <Link
                href="/iniciar-projeto"
                className={["block px-4 py-3 text-sm font-black transition-colors", menuItemClass].join(" ")}
              >
                Iniciar um projeto
              </Link>
              <Link
                href={onHome ? "#quanto-custa" : "/#quanto-custa"}
                className={["block px-4 py-3 text-sm font-black transition-colors", menuItemClass].join(" ")}
              >
                Quanto custa?
              </Link>
              <Link
                href={onHome ? "#localizacao" : "/#localizacao"}
                className={["block px-4 py-3 text-sm font-black transition-colors", menuItemClass].join(" ")}
              >
                Localizacao
              </Link>
            </div>
          </details>

          <NavLink href={onHome ? "#localizacao" : "/#localizacao"} scrolled={scrolled}>
            Localizacao
          </NavLink>
        </nav>

        <Link
          href="/login"
          className={[
            "rounded-2xl px-6 py-3 text-sm font-black transition",
            scrolled ? "bg-accent-500 text-zinc-950 hover:bg-accent-400" : "bg-accent-500 text-zinc-950 hover:bg-accent-400"
          ].join(" ")}
        >
          Login
        </Link>
      </div>
    </header>
  );
}
