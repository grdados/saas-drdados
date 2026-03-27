"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";

import { clearTokens } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
  badge?: number;
  disabled?: boolean;
};

type NavNode = {
  label: string;
  href?: string;
  badge?: number;
  disabled?: boolean;
  icon?: ReactNode;
  children?: NavNode[];
};

function initialsFrom(name: string, email: string) {
  const base = (name || "").trim() || (email || "").trim() || "U";
  const parts = base.replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = (parts.length > 1 ? parts[parts.length - 1]?.[0] : "") ?? "";
  return (first + second).toUpperCase();
}

function Icon({
  name
}: {
  name: "overview" | "orders" | "products" | "notif" | "analytics" | "messages" | "settings" | "account" | "help";
}) {
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 text-zinc-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function HamburgerButton({
  open,
  onClick
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Fechar menu" : "Abrir menu"}
      aria-expanded={open}
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-zinc-100 transition hover:bg-white/[0.1] md:hidden"
    >
      <span className="relative block h-4 w-4">
        <span
          className={`absolute left-0 top-0 h-0.5 w-4 rounded-full bg-current transition ${open ? "translate-y-[7px] rotate-45" : ""}`}
        />
        <span
          className={`absolute left-0 top-[7px] h-0.5 w-4 rounded-full bg-current transition ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`absolute left-0 top-[14px] h-0.5 w-4 rounded-full bg-current transition ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
        />
      </span>
    </button>
  );
}

function MobileTabBar({
  pathname
}: {
  pathname: string;
}) {
  const items = [
    { href: "/dashboard", label: "Dashboard", icon: <Icon name="overview" /> },
    { href: "/leads", label: "Leads", icon: <Icon name="messages" /> },
    { href: "/tasks", label: "Tarefas", icon: <Icon name="notif" /> },
    { href: "/account", label: "Conta", icon: <Icon name="account" /> }
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[65] border-t border-white/10 bg-zinc-950/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black transition",
                active
                  ? "bg-accent-500/18 text-accent-200 ring-1 ring-accent-400/30"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              ].join(" ")}
            >
              <span className={active ? "text-accent-300" : "text-zinc-400"}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SidebarLink({
  item,
  active,
  icon,
  depth = 0,
  onNavigate
}: {
  item: NavItem;
  active: boolean;
  icon: ReactNode;
  depth?: number;
  onNavigate?: () => void;
}) {
  const base =
    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors";
  const activeCls = "bg-[#FFB30D]/18 text-white ring-1 ring-[#FFB30D]/35";
  const idleCls = "text-white/78 hover:bg-[#085454]/18 hover:text-white";

  if (item.disabled) {
    return (
      <div className={`${base} cursor-not-allowed opacity-60`}>
        <span className="text-zinc-400">{icon}</span>
        <span className="flex-1">{item.label}</span>
        <span className="text-xs text-[#7A7A7A]">Em breve</span>
      </div>
    );
  }

  return (
    <Link href={item.href} onClick={onNavigate} className={`${base} ${active ? activeCls : idleCls}`}>
      <span className={active ? "text-[#FFB30D]" : "text-[#7A7A7A] group-hover:text-[#FFB30D]"}>{icon}</span>
      {depth > 0 ? <span className="h-4 w-px bg-[#085454]/55" /> : null}
      <span className="flex-1">{item.label}</span>
      {typeof item.badge === "number" ? (
        <span className="rounded-full bg-[#FFB30D]/15 px-2 py-0.5 text-xs font-black text-[#FFB30D] ring-1 ring-[#FFB30D]/20">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function isNodeActive(node: NavNode, pathname: string): boolean {
  if (node.href && (pathname === node.href || pathname.startsWith(node.href + "/"))) return true;
  return (node.children || []).some((child) => isNodeActive(child, pathname));
}

function SidebarTree({
  nodes,
  pathname,
  depth = 0,
  parentLabel,
  onNavigate
}: {
  nodes: NavNode[];
  pathname: string;
  depth?: number;
  parentLabel?: string;
  onNavigate?: () => void;
}) {
  const pad = depth === 0 ? "pl-0" : depth === 1 ? "pl-4" : "pl-8";

  return (
    <div className={`space-y-1 ${pad}`}>
      {nodes.map((node) => (
        <SidebarTreeNode
          key={`${node.label}-${node.href || "group"}`}
          node={node}
          pathname={pathname}
          depth={depth}
          parentLabel={parentLabel}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function SidebarTreeNode({
  node,
  pathname,
  depth,
  parentLabel,
  onNavigate
}: {
  node: NavNode;
  pathname: string;
  depth: number;
  parentLabel?: string;
  onNavigate?: () => void;
}) {
  const hasChildren = Boolean(node.children?.length);
  const nodeMatch = node.href ? pathname === node.href || pathname.startsWith(node.href + "/") : false;
  const descendantActive = isNodeActive(node, pathname);
  const active = hasChildren ? false : nodeMatch;
  const [open, setOpen] = useState<boolean>(() => (hasChildren ? descendantActive : false));

  useEffect(() => {
    if (hasChildren && descendantActive) setOpen(true);
  }, [descendantActive, hasChildren]);

  const base =
    "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors";
  const activeCls = "bg-[#FFB30D]/18 text-white ring-1 ring-[#FFB30D]/35";
  const idleCls = "text-white/78 hover:bg-[#085454]/18 hover:text-white";

  if (!hasChildren) {
    const item: NavItem = { label: node.label, href: node.href || "#", badge: node.badge, disabled: node.disabled };
    return (
      <SidebarLink
        item={item}
        active={active && Boolean(node.href)}
        depth={depth}
        onNavigate={onNavigate}
        icon={
          <span className={active ? "text-[#FFB30D]" : "text-[#7A7A7A] group-hover:text-[#FFB30D]"}>
            {node.icon || <span className="h-4 w-4" />}
          </span>
        }
      />
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${base} ${active ? activeCls : idleCls}`}
        aria-expanded={open}
      >
        <span className={active ? "text-[#FFB30D]" : "text-[#7A7A7A] group-hover:text-[#FFB30D]"}>
          {node.icon || <span className="h-4 w-4" />}
        </span>
        <span className="flex-1">{node.label}</span>
        <Chevron open={open} />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden pt-1">
          <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#7A7A7A]">
            {parentLabel ? `${parentLabel} · ${node.label}` : node.label}
          </p>
          <SidebarTree
            nodes={node.children || []}
            pathname={pathname}
            depth={Math.min(depth + 1, 2)}
            parentLabel={node.label}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  navTree,
  avatar,
  avatarOk,
  avatarUrl,
  user,
  setAvatarOk,
  onNavigate
}: {
  pathname: string;
  navTree: { dashboard: NavNode[]; advanced: NavNode[] };
  avatar: string;
  avatarOk: boolean;
  avatarUrl: string;
  user?: { name: string; email: string; company?: string; avatarUrl?: string };
  setAvatarOk: (value: boolean) => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-1 py-2">
        <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-2.svg" alt="GR Dados" className="h-full w-full object-contain p-2" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-black tracking-tight">GR Dados</p>
          <p className="text-xs text-[#7A7A7A]">ERP</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="px-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#7A7A7A]">Dashboard</p>
        <nav className="mt-2 rounded-[26px] bg-[#085454]/10 p-2">
          <SidebarTree nodes={navTree.dashboard} pathname={pathname} onNavigate={onNavigate} />
        </nav>
      </div>

      <div className="mt-5">
        <p className="px-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#7A7A7A]">Advanced</p>
        <nav className="mt-2 rounded-[26px] bg-[#085454]/10 p-2">
          <SidebarTree nodes={navTree.advanced} pathname={pathname} onNavigate={onNavigate} />
        </nav>
      </div>

      <div className="mt-auto space-y-3 px-2 pb-2">
        <div className="rounded-2xl border border-[#085454]/40 bg-gradient-to-b from-[#085454]/30 to-transparent p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FFB30D]">Upgrade</p>
          <p className="mt-2 text-sm font-semibold text-zinc-100">Desbloqueie recursos premium</p>
          <button className="mt-3 w-full rounded-xl bg-[#FFB30D] px-3 py-2 text-sm font-black text-[#001542] hover:bg-[#ffc13a]">
            Upgrade agora
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3">
          <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-[#001542] ring-1 ring-white/10">
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
              <span className="text-xs font-black text-[#FFB30D]">{avatar}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{user?.name || "Usuário"}</p>
            <p className="truncate text-xs text-[#7A7A7A]">{user?.email || "-"}</p>
          </div>
        </div>
      </div>
    </>
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navTree = useMemo(
    () => ({
      dashboard: [
        { label: "Overview", href: "/dashboard", icon: <Icon name="overview" /> },
        {
          label: "Produção",
          icon: <Icon name="products" />,
          children: [
            { label: "Contratos", href: "/producao/contrato" },
            { label: "Empreendimentos", href: "/producao/empreendimentos" },
            { label: "Romaneio", href: "/producao/romaneio" },
            { label: "Talhão", href: "/producao/talhao" }
          ]
        },
        {
          label: "Compra",
          icon: <Icon name="orders" />,
          children: [
            { label: "Pedido", href: "/compra/pedido" },
            { label: "Faturamento", href: "/compra/faturamento" },
            { label: "Produtos", href: "/compra/produtos" }
          ]
        },
        {
          label: "Venda",
          icon: <Icon name="orders" />,
          children: [{ label: "Vendas", href: "/venda/vendas" }]
        },
        {
          label: "Estoque",
          icon: <Icon name="products" />,
          children: [
            { label: "Produtos", href: "/estoque/produtos" },
            { label: "Insumos", href: "/estoque/insumos" },
            { label: "Combustível", href: "/estoque/combustivel" }
          ]
        },
        { label: "Contas a Pagar", href: "/financeiro/contas-a-pagar", icon: <Icon name="analytics" /> },
        { label: "Contas a Receber", href: "/financeiro/contas-a-receber", icon: <Icon name="analytics" /> },
        { label: "Fluxo de Caixa", href: "/financeiro/fluxo-de-caixa", icon: <Icon name="analytics" /> }
      ] satisfies NavNode[],
      advanced: [
        {
          label: "Cadastros",
          icon: <Icon name="settings" />,
          children: [
            {
              label: "Gerais",
              children: [
                { label: "Cultura", href: "/cadastros/gerais/cultura" },
                { label: "Safra", href: "/cadastros/gerais/safra" },
                { label: "Cultivares", href: "/cadastros/gerais/cultivares" },
                { label: "Centro Custos", href: "/cadastros/gerais/centro-custos" },
                { label: "Operações", href: "/cadastros/gerais/operacoes" },
                { label: "Fabricantes", href: "/cadastros/gerais/fabricantes" }
              ]
            },
            {
              label: "Financeiro",
              children: [
                { label: "Bancos", href: "/cadastros/financeiro/bancos" },
                { label: "Caixas", href: "/cadastros/financeiro/caixas" },
                { label: "Contas", href: "/cadastros/financeiro/contas" },
                { label: "Moedas", href: "/cadastros/financeiro/moedas" },
                { label: "Condição Financeira", href: "/cadastros/financeiro/condicao-financeira" }
              ]
            },
            {
              label: "Gerencial",
              children: [
                { label: "Grupo de Produtores", href: "/cadastros/gerencial/grupo-produtores" },
                { label: "Produtores", href: "/cadastros/gerencial/produtor" },
                { label: "Propriedades", href: "/cadastros/gerencial/propriedade" },
                { label: "Talhões", href: "/cadastros/gerencial/talhao" },
                { label: "Transportadoras", href: "/cadastros/gerencial/transportadores" },
                { label: "Clientes", href: "/cadastros/gerencial/clientes" },
                { label: "Fornecedores", href: "/cadastros/gerencial/fornecedores" }
              ]
            },
            {
              label: "Produtos",
              children: [
                { label: "Categorias", href: "/cadastros/produtos/categorias" },
                { label: "Insumos", href: "/cadastros/produtos/insumos" },
                { label: "Peças", href: "/cadastros/produtos/pecas" },
                { label: "Produtos", href: "/cadastros/produtos/produtos" }
              ]
            },
            {
              label: "Patrimonial",
              children: [
                { label: "Máquinas", href: "/cadastros/patrimonial/maquinas" },
                { label: "Depósitos", href: "/cadastros/patrimonial/depositos" },
                { label: "Bombas Combustível", href: "/cadastros/patrimonial/bombas-combustivel" },
                { label: "Benfeitorias", href: "/cadastros/patrimonial/benfeitorias" }
              ]
            }
          ]
        },
        { label: "Settings", href: "/settings", icon: <Icon name="settings" /> },
        { label: "Account", href: "/account", icon: <Icon name="account" /> }
      ] satisfies NavNode[]
    }),
    []
  );

  const avatar = initialsFrom(user?.name ?? "", user?.email ?? "");
  const avatarUrl = (user?.avatarUrl || "").trim();
  const [avatarOk, setAvatarOk] = useState(true);

  useEffect(() => {
    setMobileNavOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileNavOpen]);

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -right-48 -top-24 h-[520px] w-[520px] rounded-full bg-accent-500/12 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-sky-500/8 blur-3xl" />
        </div>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-[70] md:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[340px] flex-col border-r border-[#085454]/40 bg-[linear-gradient(180deg,rgba(0,21,66,0.98),rgba(8,84,84,0.82))] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7A7A7A]">Menu</p>
                <HamburgerButton open={mobileNavOpen} onClick={() => setMobileNavOpen(false)} />
              </div>
              <SidebarContent
                pathname={pathname}
                navTree={navTree}
                avatar={avatar}
                avatarOk={avatarOk}
                avatarUrl={avatarUrl}
                user={user}
                setAvatarOk={setAvatarOk}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        <div className="relative grid w-full grid-cols-1 gap-0 md:grid-cols-[248px_1fr] lg:grid-cols-[268px_1fr] xl:grid-cols-[288px_1fr]">
          <aside className="sticky top-0 hidden h-screen flex-col border-r border-[#085454]/40 bg-[linear-gradient(180deg,rgba(0,21,66,0.96),rgba(8,84,84,0.72))] p-3 shadow-[inset_-1px_0_0_rgba(8,84,84,0.45),12px_0_36px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl md:flex lg:p-4">
            <SidebarContent
              pathname={pathname}
              navTree={navTree}
              avatar={avatar}
              avatarOk={avatarOk}
              avatarUrl={avatarUrl}
              user={user}
              setAvatarOk={setAvatarOk}
            />
          </aside>

          <div className="min-w-0 px-2 py-4 pb-24 sm:px-3 md:px-4 md:pb-4 lg:px-5 xl:px-6">
            <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between lg:p-4">
              <div className="flex items-center gap-3">
                <HamburgerButton open={mobileNavOpen} onClick={() => setMobileNavOpen((v) => !v)} />
                <div className="leading-tight">
                  <p className="text-sm font-black text-white">Visão geral</p>
                  <p className="text-xs text-zinc-400">
                    {user?.company ? `Empresa: ${user.company}` : "Monitoramento da operação"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-1 sm:flex-row sm:items-center sm:justify-end">
                <div className="relative w-full sm:max-w-[360px] lg:max-w-[460px]">
                  <input
                    placeholder="Search..."
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-500 outline-none ring-0 focus:border-accent-500/50 sm:px-4 sm:py-2.5 sm:text-sm"
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 21l-4.3-4.3" />
                      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <a
                    href="https://wa.me/5567998698159"
                    target="_blank"
                    rel="noreferrer"
                    className="group relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                    title="WhatsApp"
                    aria-label="WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path
                        d="M20.52 3.48A11.86 11.86 0 0 0 12.02 0C5.4 0 .02 5.38.02 12a11.93 11.93 0 0 0 1.58 5.95L0 24l6.2-1.63A12 12 0 0 0 12.02 24C18.64 24 24 18.62 24 12c0-3.2-1.25-6.2-3.48-8.52Z"
                        fill="currentColor"
                        opacity="0.24"
                      />
                      <path
                        d="M17.42 14.45c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.77-1.65-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.5s1.06 2.9 1.21 3.1c.15.2 2.08 3.18 5.04 4.46.7.3 1.24.48 1.66.61.7.22 1.33.19 1.83.12.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"
                        fill="currentColor"
                      />
                    </svg>
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-3.5 w-3.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                      <span className="relative inline-flex h-3.5 w-3.5 rounded-full border border-zinc-950 bg-emerald-400" />
                    </span>
                  </a>

                  <div className="relative">
                    <button
                      onClick={() => setProfileOpen((v) => !v)}
                      className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-2.5 py-2 hover:bg-white/[0.1] sm:gap-3 sm:px-3"
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
                        <p className="text-sm font-black text-white">{user?.name || "Usuário"}</p>
                        <p className="text-xs text-zinc-400">{user?.email || ""}</p>
                      </div>
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {profileOpen ? (
                      <div className="absolute right-0 top-14 z-20 w-56 overflow-hidden rounded-2xl border border-white/15 bg-zinc-900/95 shadow-xl shadow-black/50 backdrop-blur-xl">
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
                              handleLogout();
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
              </div>
            </header>

            <div className="mt-4 sm:mt-6">{children}</div>
          </div>
        </div>

        <MobileTabBar pathname={pathname} />
      </div>
    </div>
  );
}
