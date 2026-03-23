"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearTokens } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/tasks", label: "Tarefas" }
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="text-lg font-black text-white">GR Dados CRM</div>
        <nav className="flex items-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                pathname === link.href
                  ? "bg-zinc-800 text-accent-300"
                  : "text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => {
              clearTokens();
              router.push("/login");
            }}
            className="ml-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-100 hover:bg-zinc-800"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}
