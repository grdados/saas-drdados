"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";

import { clearTokens } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
  badge?: number;
  disabled?: boolean;
};

function initialsFrom(name: string, email: string) {
  const base = (name || "").trim() || (email || "").trim() || "U";
  const parts = base.replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = (parts.length > 1 ? parts[parts.length - 1]?.[0] : "") ?? "";
  return (first + second).toUpperCase();
}

function Icon({ name }: { name: "overview" | "orders" | "products" | "notif" | "analytics" | "messages" | "settings" | "account" | "help" }) {
  const common = "h-4 w-4";
  switch (name) {
    case "overview":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 13.5V20h6v-6.5H4zM14 4v16h6V4h-6z" />
        </svg>
      );
    case "orders":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 7h15l-1.5 9h-12L6 7z" />
          <path d="M6 7 5 4H2" />
          <path d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
        </svg>
      );
    case "products":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.3 7.1 12 12l8.7-4.9" />
          <path d="M12 22V12" />
        </svg>
      );
    case "notif":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      );
    case "analytics":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15l3-3 3 2 5-6" />
        </svg>
      );
    case "messages":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
          <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06-1.7 2.95-.08-.03a1.8 1.8 0 0 0-2.06.6l-.04.07H8.05l-.04-.07a1.8 1.8 0 0 0-2.06-.6l-.08.03-1.7-2.95.06-.06A1.8 1.8 0 0 0 4.6 15l-.08-.02V9l.08-.02A1.8 1.8 0 0 0 4.24 7l-.06-.06 1.7-2.95.08.03a1.8 1.8 0 0 0 2.06-.6l.04-.07h7.9l.04.07a1.8 1.8 0 0 0 2.06.6l.08-.03 1.7 2.95-.06.06A1.8 1.8 0 0 0 19.4 9l.08.02v6l-.08.02z" />
        </svg>
      );
    case "account":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
        </svg>
      );
    case "help":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
          <path d="M12 17h.01" />
        </svg>
      );
  }
}

function SidebarLink({
  item,
  active,
  icon
}: {
  item: NavItem;
  active: boolean;
  icon: ReactNode;
}) {
  const base =
    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors";
  const activeCls = "bg-white/5 text-white ring-1 ring-white/10";
  const idleCls = "text-zinc-300 hover:bg-white/5 hover:text-white";

  if (item.disabled) {
    return (
      <div className={`${base} cursor-not-allowed opacity-60`}>
        <span className="text-zinc-400">{icon}</span>
        <span className="flex-1">{item.label}</span>
        <span className="text-xs text-zinc-500">Em breve</span>
      </div>
    );
  }

  return (
    <Link href={item.href} className={`${base} ${active ? activeCls : idleCls}`}>
      <span className={active ? "text-accent-300" : "text-zinc-400 group-hover:text-accent-300"}>{icon}</span>
      <span className="flex-1">{item.label}</span>
      {typeof item.badge === "number" ? (
        <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-xs font-black text-accent-200 ring-1 ring-accent-500/20">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminShell({
  children,
  user
}: {
  children: ReactNode;
  user?: { name: string; email: string; company?: string; avatarUrl?: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  const navDashboard: NavItem[] = useMemo(
    () => [
      { label: "Overview", href: "/dashboard" },
      { label: "Leads", href: "/leads" },
      { label: "Tarefas", href: "/tasks", badge: 2 },
      { label: "Notificacoes", href: "/dashboard#notificacoes", disabled: true },
      { label: "Analytics", href: "/dashboard#analytics", disabled: true },
      { label: "Mensagens", href: "/dashboard#mensagens", badge: 24, disabled: true }
    ],
    []
  );

  const navAdvanced: NavItem[] = useMemo(
    () => [
      { label: "Settings", href: "/settings" },
      { label: "Account", href: "/account" },
      { label: "Help & Support", href: "/dashboard#help", disabled: true }
    ],
    []
  );

  const avatar = initialsFrom(user?.name ?? "", user?.email ?? "");
  const avatarUrl = (user?.avatarUrl || "").trim();
  const [avatarOk, setAvatarOk] = useState(true);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="relative">
        {/* ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -right-48 -top-24 h-[520px] w-[520px] rounded-full bg-accent-500/12 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-sky-500/8 blur-3xl" />
        </div>

        <div className="relative mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[280px_1fr] md:px-6">
          {/* Sidebar */}
          <aside className="sticky top-6 hidden h-[calc(100vh-48px)] flex-col rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl md:flex">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-500/15 ring-1 ring-accent-500/25">
                <div className="h-3 w-3 rounded-full bg-accent-400 shadow-[0_0_0_4px_rgba(223,152,48,0.15)]" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-black tracking-tight">GR Dados</p>
                <p className="text-xs text-zinc-400">Admin Panel</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="px-2 text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Dashboard</p>
              <nav className="mt-2 space-y-1">
                <SidebarLink item={navDashboard[0]} active={pathname === navDashboard[0].href} icon={<Icon name="overview" />} />
                <SidebarLink item={navDashboard[1]} active={pathname === navDashboard[1].href} icon={<Icon name="orders" />} />
                <SidebarLink item={navDashboard[2]} active={pathname === navDashboard[2].href} icon={<Icon name="messages" />} />
                <SidebarLink item={navDashboard[3]} active={false} icon={<Icon name="notif" />} />
                <SidebarLink item={navDashboard[4]} active={false} icon={<Icon name="analytics" />} />
                <SidebarLink item={navDashboard[5]} active={false} icon={<Icon name="messages" />} />
              </nav>
            </div>

            <div className="mt-6">
              <p className="px-2 text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Advanced</p>
              <nav className="mt-2 space-y-1">
                <SidebarLink item={navAdvanced[0]} active={pathname === navAdvanced[0].href} icon={<Icon name="settings" />} />
                <SidebarLink item={navAdvanced[1]} active={pathname === navAdvanced[1].href} icon={<Icon name="account" />} />
                <SidebarLink item={navAdvanced[2]} active={false} icon={<Icon name="help" />} />
              </nav>
            </div>

            <div className="mt-auto space-y-3 px-2 pb-2">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-accent-500/15 to-transparent p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-accent-200">Upgrade</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">Desbloqueie recursos premium</p>
                <button className="mt-3 w-full rounded-xl bg-accent-500 px-3 py-2 text-sm font-black text-zinc-950 hover:bg-accent-400">
                  Upgrade agora
                </button>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-zinc-950/60 ring-1 ring-white/10">
                  {avatarUrl && avatarOk ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarOk(false)}
                    />
                  ) : (
                    <span className="text-xs font-black text-accent-200">{avatar}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{user?.name || "Usuario"}</p>
                  <p className="truncate text-xs text-zinc-400">{user?.email || "—"}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className="min-w-0">
            {/* Topbar */}
            <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="md:hidden">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-500/15 ring-1 ring-accent-500/25">
                    <div className="h-3 w-3 rounded-full bg-accent-400 shadow-[0_0_0_4px_rgba(223,152,48,0.15)]" />
                  </div>
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-black text-white">Sales Overview</p>
                  <p className="text-xs text-zinc-400">{user?.company ? `Empresa: ${user.company}` : "Monitoramento da operacao"}</p>
                </div>
              </div>

              <div className="flex flex-1 items-center gap-3 sm:justify-end">
                <div className="relative w-full max-w-[460px]">
                  <input
                    placeholder="Search..."
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-0 focus:border-accent-500/50"
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 21l-4.3-4.3" />
                      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
                    </svg>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setProfileOpen((v) => !v)}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 hover:bg-zinc-950/60"
                  >
                    <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-white/10">
                      {avatarUrl && avatarOk ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarOk(false)}
                        />
                      ) : (
                        <span className="text-xs font-black text-accent-200">{avatar}</span>
                      )}
                    </span>
                    <div className="hidden text-left sm:block">
                      <p className="text-sm font-black text-white">{user?.name || "Usuario"}</p>
                      <p className="text-xs text-zinc-400">{user?.email || ""}</p>
                    </div>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {profileOpen ? (
                    <div className="absolute right-0 top-14 z-20 w-56 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-xl backdrop-blur-xl">
                      <div className="p-2">
                        <Link
                          onClick={() => setProfileOpen(false)}
                          href="/account"
                          className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-zinc-200 hover:bg-white/5"
                        >
                          Minha conta
                        </Link>
                        <Link
                          onClick={() => setProfileOpen(false)}
                          href="/settings"
                          className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-zinc-200 hover:bg-white/5"
                        >
                          Configurações
                        </Link>
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            clearTokens();
                            router.push("/login");
                          }}
                          className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-zinc-200 hover:bg-white/5"
                        >
                          Sair
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
