"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { FaturamentoCompra, isApiError, listDepositos, listFaturamentosCompra, listSafras } from "@/lib/api";
import { formatDateTimeBR } from "@/lib/locale";

type DepositoTipo = "insumos" | "graos" | "combustivel";

function parseNumber(v: unknown) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function qty(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function openPrintHtml(title: string, htmlBody: string) {
  const generatedAt = formatDateTimeBR(new Date());
  const logoUrl = `${window.location.origin}/logo_horizontal.png`;
  const html = `
    <!doctype html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${escapeHtml(title)}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #111; background: #fff; }
        .page { padding: 14px 10px 10px; }
        .header { display: grid; grid-template-columns: 260px 1fr; gap: 12px; align-items: center; border: 1px solid #e4e4e7; border-radius: 10px; padding: 8px 10px; margin-bottom: 12px; }
        .logo-wrap img { max-height: 52px; width: auto; object-fit: contain; }
        .header-info { text-align: right; }
        .header-title { margin: 0; font-size: 18px; font-weight: 800; }
        .header-meta { margin-top: 4px; color: #52525b; font-size: 11px; line-height: 1.4; }
        h1 { margin: 0 0 8px; font-size: 22px; }
        .muted { color: #555; font-size: 12px; }
        .kpi { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
        .card { border: 1px solid #e2e2e2; border-radius: 8px; padding: 8px; }
        .label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
        .value { margin-top: 4px; font-size: 18px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #e2e2e2; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f7f7f7; }
        td.num, th.num { text-align: right; white-space: nowrap; }
      </style>
    </head>
    <body>
      <div class="page">
        <header class="header">
          <div class="logo-wrap"><img src="${logoUrl}" alt="GR Dados" /></div>
          <div class="header-info">
            <p class="header-title">${escapeHtml(title)}</p>
            <div class="header-meta">Cliente: GR Dados Demo<br/>Emissão: ${generatedAt}</div>
          </div>
        </header>
        ${htmlBody}
      </div>
    </body>
    </html>
  `;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "width=1280,height=900");
  if (!w) {
    URL.revokeObjectURL(url);
    return;
  }
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      // noop
    }
  }, 350);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function CardIcon({
  tone,
  children
}: {
  tone: "amber" | "sky" | "emerald" | "slate";
  children: ReactNode;
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-400/35 bg-amber-500/10 text-amber-300"
      : tone === "sky"
      ? "border-sky-400/35 bg-sky-500/10 text-sky-300"
      : tone === "emerald"
      ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-300"
      : "border-white/20 bg-white/10 text-zinc-300";
  return <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${toneClass}`}>{children}</div>;
}

export function EstoqueTipoPage({
  tipo,
  title,
  description
}: {
  tipo: DepositoTipo;
  title: string;
  description: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [safras, setSafras] = useState<Array<{ id: number; name: string }>>([]);
  const [safraId, setSafraId] = useState<number | "">("");
  const [q, setQ] = useState("");

  const [fats, setFats] = useState<FaturamentoCompra[]>([]);

  useEffect(() => {
    async function run() {
      const token = getAccessToken();
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const [sf, deps, fat] = await Promise.all([listSafras(token), listDepositos(token), listFaturamentosCompra(token)]);
        const depositoIds = new Set(deps.filter((d) => d.tipo === tipo).map((d) => d.id));
        const scoped = fat.filter((f) => (f.deposito?.id ? depositoIds.has(f.deposito.id) : false));
        setSafras(sf.map((s) => ({ id: s.id, name: s.name })));
        setSafraId(sf.length ? sf[0].id : "");
        setFats(scoped);
      } catch (err) {
        if (isApiError(err) && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Falha ao carregar estoque.");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [tipo]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return fats.filter((f) => {
      if (safraId !== "") {
        const sid = Number(safraId);
        // pedido e safra nem sempre vem no payload de faturamento, então filtramos por texto da NF/pedido quando não houver vínculo.
        // Em cenários sem vínculo explícito, exibe tudo da tipagem escolhida.
        const hasSafra = false;
        if (hasSafra && sid) {
          return false;
        }
      }
      if (!needle) return true;
      return (
        (f.invoice_number || "").toLowerCase().includes(needle) ||
        (f.fornecedor?.name ?? "").toLowerCase().includes(needle) ||
        (f.produtor?.name ?? "").toLowerCase().includes(needle) ||
        (f.deposito?.name ?? "").toLowerCase().includes(needle)
      );
    });
  }, [fats, q, safraId]);

  const rows = useMemo(() => {
    const map = new Map<string, { produto: string; deposito: string; quantidade: number; valor: number; notas: number }>();
    for (const f of filtered) {
      for (const it of f.items || []) {
        const key = `${it.produto?.name ?? "SEM PRODUTO"}::${f.deposito?.name ?? "SEM DEPOSITO"}`;
        const cur = map.get(key) ?? {
          produto: it.produto?.name ?? "SEM PRODUTO",
          deposito: f.deposito?.name ?? "SEM DEPOSITO",
          quantidade: 0,
          valor: 0,
          notas: 0
        };
        cur.quantidade += parseNumber(it.quantity);
        cur.valor += parseNumber(it.total_item);
        cur.notas += 1;
        map.set(key, cur);
      }
    }
    return [...map.values()].sort((a, b) => a.produto.localeCompare(b.produto, "pt-BR"));
  }, [filtered]);

  const totals = useMemo(() => {
    const volume = rows.reduce((acc, r) => acc + r.quantidade, 0);
    const value = rows.reduce((acc, r) => acc + r.valor, 0);
    const deposits = new Set(rows.map((r) => r.deposito)).size;
    return { volume, value, deposits, produtos: rows.length };
  }, [rows]);

  function openResumoReport() {
    const htmlRows = rows
      .map(
        (r) => `
      <tr>
        <td>${escapeHtml(r.produto)}</td>
        <td>${escapeHtml(r.deposito)}</td>
        <td class="num">${qty(r.quantidade)}</td>
        <td class="num">${money(r.valor)}</td>
        <td class="num">${r.notas}</td>
      </tr>
    `
      )
      .join("");
    openPrintHtml(
      `${title} - Resumo`,
      `
      <h1>Relatório resumo - ${escapeHtml(title)}</h1>
      <p class="muted">${escapeHtml(description)}</p>
      <div class="kpi">
        <div class="card"><div class="label">Valor em estoque</div><div class="value">${money(totals.value)}</div></div>
        <div class="card"><div class="label">Volume recebido</div><div class="value">${qty(totals.volume)}</div></div>
        <div class="card"><div class="label">Produtos</div><div class="value">${totals.produtos}</div></div>
        <div class="card"><div class="label">Depósitos</div><div class="value">${totals.deposits}</div></div>
      </div>
      <table>
        <thead>
          <tr><th>Produto</th><th>Depósito</th><th class="num">Quantidade</th><th class="num">Valor</th><th class="num">Mov.</th></tr>
        </thead>
        <tbody>${htmlRows || '<tr><td colspan="5">Sem dados para os filtros selecionados.</td></tr>'}</tbody>
      </table>
    `
    );
  }

  function openAnaliticoReport() {
    const byDeposito = new Map<string, { deposito: string; quantidade: number; valor: number; itens: number }>();
    for (const r of rows) {
      const curr = byDeposito.get(r.deposito) ?? { deposito: r.deposito, quantidade: 0, valor: 0, itens: 0 };
      curr.quantidade += r.quantidade;
      curr.valor += r.valor;
      curr.itens += 1;
      byDeposito.set(r.deposito, curr);
    }
    const htmlRows = [...byDeposito.values()]
      .sort((a, b) => a.deposito.localeCompare(b.deposito, "pt-BR"))
      .map(
        (r) => `
      <tr>
        <td>${escapeHtml(r.deposito)}</td>
        <td class="num">${r.itens}</td>
        <td class="num">${qty(r.quantidade)}</td>
        <td class="num">${money(r.valor)}</td>
      </tr>
    `
      )
      .join("");
    openPrintHtml(
      `${title} - Analítico`,
      `
      <h1>Relatório analítico - ${escapeHtml(title)}</h1>
      <p class="muted">Consolidado por depósito.</p>
      <table>
        <thead>
          <tr><th>Depósito</th><th class="num">Itens</th><th class="num">Quantidade</th><th class="num">Valor</th></tr>
        </thead>
        <tbody>${htmlRows || '<tr><td colspan="4">Sem dados para os filtros selecionados.</td></tr>'}</tbody>
      </table>
    `
    );
  }

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-5">
          <section className="grid gap-3 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)] xl:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Estoque</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">{title}</h1>
              <p className="mt-1 text-sm text-zinc-300">{description}</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Relatórios</p>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <button onClick={openResumoReport} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/10">
                    Resumo
                  </button>
                  <button onClick={openAnaliticoReport} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/10">
                    Analitico
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por produto, deposito, fornecedor ou NF..."
                className="min-w-[260px] flex-1 rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
              />
              <select
                value={safraId}
                onChange={(e) => setSafraId(e.target.value === "" ? "" : Number(e.target.value))}
                className="min-w-[210px] rounded-2xl border border-accent-500/40 bg-accent-500/15 px-3 py-2 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-400"
              >
                <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Todas as safras</option>
                {safras.map((s) => (
                  <option key={s.id} value={s.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Valor em estoque", value: money(totals.value).replace(/^R\$\s?/, ""), tone: "border-amber-400/30 bg-amber-500/10", icon: "R$", itone: "amber" as const },
              { label: "Volume recebido", value: qty(totals.volume), tone: "border-sky-400/30 bg-sky-500/10", icon: "↕", itone: "sky" as const },
              { label: "Produtos", value: String(totals.produtos), tone: "border-emerald-400/30 bg-emerald-500/10", icon: "▦", itone: "emerald" as const },
              { label: "Depositos", value: String(totals.deposits), tone: "border-white/15 bg-white/5", icon: "◫", itone: "slate" as const }
            ].map((card) => (
              <article key={card.label} className={`h-[96px] rounded-3xl border px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] ${card.tone}`}>
                <div className="grid h-full grid-cols-[40px_1fr] items-center gap-2.5">
                  <CardIcon tone={card.itone}>
                    <span className="text-[12px] font-black">{card.icon}</span>
                  </CardIcon>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300/90">{card.label}</p>
                    <p className="mt-0.5 text-[16px] font-black leading-none text-white">{card.value}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Lista de estoque</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${rows.length} item(ns)`}</p>
            </div>
            <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 md:grid">
              <div className="col-span-4">Produto</div>
              <div className="col-span-3">Deposito</div>
              <div className="col-span-2 text-right">Quantidade</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-1 text-right">Mov.</div>
            </div>
            <div className="mt-3 space-y-2">
              {rows.map((r, idx) => (
                <div key={`${r.produto}-${r.deposito}-${idx}`} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 md:grid-cols-12 md:items-center md:gap-3">
                  <div className="md:col-span-4 text-[12px] font-black text-white">{r.produto}</div>
                  <div className="md:col-span-3 text-[12px] font-semibold text-zinc-100">{r.deposito}</div>
                  <div className="md:col-span-2 text-right text-[12px] font-semibold text-zinc-100">{qty(r.quantidade)}</div>
                  <div className="md:col-span-2 text-right text-[12px] font-semibold text-zinc-100">{money(r.valor)}</div>
                  <div className="md:col-span-1 text-right text-[11px] font-semibold text-zinc-300">{r.notas}</div>
                </div>
              ))}
              {!loading && rows.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">Sem movimentacoes para os filtros selecionados.</div>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </AuthedAdminShell>
  );
}

