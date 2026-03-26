"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  FaturamentoCompra,
  Insumo,
  isApiError,
  listFaturamentosCompra,
  listInsumos
} from "@/lib/api";
import { formatCurrencyBRL, formatDateBR, formatDateTimeBR } from "@/lib/locale";

function parseNumber(v: unknown) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function money(v: number) {
  return formatCurrencyBRL(v);
}

function dbr(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return value;
  return formatDateBR(dt);
}

type ProductRow = {
  produtoId: number;
  produto: string;
  categoria: string;
  fornecedor: string;
  nf: string;
  data: string;
  quantidade: number;
  preco: number;
  total: number;
};

function PriceTimelineChart({
  months,
  series
}: {
  months: string[];
  series: Array<{ label: string; values: number[]; color: string }>;
}) {
  if (!months.length || !series.length) {
    return <p className="text-sm text-zinc-400">Sem dados para o gráfico.</p>;
  }
  const w = 940;
  const h = 260;
  const p = 22;
  const max = Math.max(1, ...series.flatMap((s) => s.values));

  const polyline = (values: number[]) =>
    values
      .map((v, i) => {
        const x = p + (i * (w - p * 2)) / Math.max(1, months.length - 1);
        const y = p + (1 - v / max) * (h - p * 2);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/35 p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-64 w-full">
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <line key={t} x1={p} x2={w - p} y1={h * t} y2={h * t} stroke="rgba(255,255,255,0.07)" />
        ))}
        {series.map((s) => (
          <polyline key={s.label} points={polyline(s.values)} fill="none" stroke={s.color} strokeWidth="2.5" />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <div key={s.label} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-xs font-semibold text-zinc-300">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompraProdutosPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [faturamentos, setFaturamentos] = useState<FaturamentoCompra[]>([]);

  const [produtoId, setProdutoId] = useState<number | "">("");
  const [categoria, setCategoria] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    async function run() {
      const token = getAccessToken();
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const [fat, ins] = await Promise.all([
          listFaturamentosCompra(token),
          listInsumos(token)
        ]);
        setFaturamentos(fat);
        setInsumos(ins);
      } catch (err) {
        if (isApiError(err) && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Falha ao carregar painel de produtos.");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

  const insumoById = useMemo(() => {
    const map = new Map<number, Insumo>();
    for (const i of insumos) map.set(i.id, i);
    return map;
  }, [insumos]);

  const allRows = useMemo(() => {
    const flat: ProductRow[] = [];
    for (const f of faturamentos) {
      if (from && f.date && f.date < from) continue;
      if (to && f.date && f.date > to) continue;
      for (const it of f.items || []) {
        const pid = it.produto?.id ?? 0;
        const ins = pid ? insumoById.get(pid) : null;
        const cat = ins?.categoria?.name ?? "SEM CATEGORIA";
        if (categoria && cat !== categoria) continue;
        if (produtoId !== "" && pid !== Number(produtoId)) continue;
        flat.push({
          produtoId: pid,
          produto: it.produto?.name ?? "SEM PRODUTO",
          categoria: cat,
          fornecedor: f.fornecedor?.name ?? "SEM FORNECEDOR",
          nf: f.invoice_number || `NF-${f.id}`,
          data: f.date || "",
          quantidade: parseNumber(it.quantity),
          preco: parseNumber(it.price),
          total: parseNumber(it.total_item)
        });
      }
    }
    return flat;
  }, [faturamentos, from, to, categoria, produtoId, insumoById]);

  const categorias = useMemo(() => {
    const s = new Set<string>();
    for (const i of insumos) {
      const name = i.categoria?.name?.trim();
      if (name) s.add(name);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [insumos]);

  const produtos = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of allRows) if (r.produtoId) m.set(r.produtoId, r.produto);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [allRows]);

  const metrics = useMemo(() => {
    const totalQty = allRows.reduce((acc, r) => acc + r.quantidade, 0);
    const totalValue = allRows.reduce((acc, r) => acc + r.total, 0);
    const avgPrice = totalQty > 0 ? totalValue / totalQty : 0;
    const min = allRows.length ? allRows.reduce((a, b) => (b.preco < a.preco ? b : a), allRows[0]) : null;
    const max = allRows.length ? allRows.reduce((a, b) => (b.preco > a.preco ? b : a), allRows[0]) : null;
    return { totalQty, totalValue, avgPrice, min, max };
  }, [allRows]);

  const byFornecedor = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of allRows) map.set(r.fornecedor, (map.get(r.fornecedor) ?? 0) + r.total);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [allRows]);

  const timeline = useMemo(() => {
    const monthSet = new Set<string>();
    const byProduct = new Map<string, Map<string, { sum: number; count: number }>>();
    for (const r of allRows) {
      if (!r.data) continue;
      const dt = new Date(`${r.data}T00:00:00`);
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      monthSet.add(monthKey);
      const p = byProduct.get(r.produto) ?? new Map<string, { sum: number; count: number }>();
      const curr = p.get(monthKey) ?? { sum: 0, count: 0 };
      curr.sum += r.preco;
      curr.count += 1;
      p.set(monthKey, curr);
      byProduct.set(r.produto, p);
    }
    const months = [...monthSet].sort((a, b) => a.localeCompare(b));
    const topProducts = [...byProduct.entries()]
      .map(([name, m]) => ({
        name,
        total: [...m.values()].reduce((acc, v) => acc + v.count, 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((x) => x.name);
    const colors = ["#f59e0b", "#38bdf8", "#34d399", "#a78bfa", "#f43f5e"];
    const series = topProducts.map((name, idx) => {
      const map = byProduct.get(name) ?? new Map<string, { sum: number; count: number }>();
      const values = months.map((m) => {
        const v = map.get(m);
        return v && v.count > 0 ? v.sum / v.count : 0;
      });
      return { label: name, values, color: colors[idx % colors.length] };
    });
    const labels = months.map((m) => {
      const [y, mo] = m.split("-");
      return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    });
    return { months: labels, series };
  }, [allRows]);

  function escapeHtml(v: string) {
    return v
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function openPrintHtml(title: string, body: string) {
    const generatedAt = formatDateTimeBR(new Date());
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
      <style>
      body{font-family:Arial,sans-serif;color:#111;margin:0;padding:16px}h1{margin:0 0 8px}.muted{color:#555;font-size:12px}
      table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#f7f7f7}.num{text-align:right}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}
      .card{border:1px solid #ddd;border-radius:8px;padding:8px}.label{font-size:11px;color:#666;text-transform:uppercase}
      .value{font-size:18px;font-weight:700}
      </style></head><body><h1>${escapeHtml(title)}</h1><p class="muted">Gerado em ${generatedAt}</p>${body}</body></html>`;
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

  function openResumoReport() {
    const map = new Map<string, { produto: string; categoria: string; qtd: number; total: number; avg: number; count: number }>();
    for (const r of allRows) {
      const key = `${r.produtoId}__${r.categoria}`;
      const curr = map.get(key) ?? { produto: r.produto, categoria: r.categoria, qtd: 0, total: 0, avg: 0, count: 0 };
      curr.qtd += r.quantidade;
      curr.total += r.total;
      curr.avg += r.preco;
      curr.count += 1;
      map.set(key, curr);
    }
    const rows = [...map.values()].sort((a, b) => b.total - a.total);
    const htmlRows = rows
      .map(
        (r) => `<tr><td>${escapeHtml(r.produto)}</td><td>${escapeHtml(r.categoria)}</td><td class="num">${r.qtd.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${money(r.count > 0 ? r.avg / r.count : 0)}</td><td class="num">${money(r.total)}</td></tr>`
      )
      .join("");
    openPrintHtml(
      "Relatorio resumo de produtos",
      `<div class="kpi">
        <div class="card"><div class="label">Produtos</div><div class="value">${rows.length}</div></div>
        <div class="card"><div class="label">Quantidade</div><div class="value">${metrics.totalQty.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div></div>
        <div class="card"><div class="label">Preco medio</div><div class="value">${money(metrics.avgPrice)}</div></div>
        <div class="card"><div class="label">Valor total</div><div class="value">${money(metrics.totalValue)}</div></div>
      </div>
      <table><thead><tr><th>Produto</th><th>Categoria</th><th class="num">Quantidade</th><th class="num">Preco medio</th><th class="num">Valor</th></tr></thead>
      <tbody>${htmlRows || '<tr><td colspan="5">Sem dados para os filtros selecionados.</td></tr>'}</tbody></table>`
    );
  }

  function openAnaliticoReport() {
    const rows = [...allRows].sort((a, b) => `${a.produto}|${a.data}|${a.fornecedor}`.localeCompare(`${b.produto}|${b.data}|${b.fornecedor}`, "pt-BR"));
    const htmlRows = rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(dbr(r.data))}</td><td>${escapeHtml(r.nf)}</td><td>${escapeHtml(r.produto)}</td><td>${escapeHtml(r.categoria)}</td><td>${escapeHtml(r.fornecedor)}</td><td class="num">${r.preco.toLocaleString("pt-BR", { minimumFractionDigits: 5, maximumFractionDigits: 5 })}</td><td class="num">${r.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${money(r.total)}</td></tr>`
      )
      .join("");
    openPrintHtml(
      "Relatorio analitico de produtos",
      `<table><thead><tr><th>Data</th><th>NF</th><th>Produto</th><th>Categoria</th><th>Fornecedor</th><th class="num">Preco</th><th class="num">Quantidade</th><th class="num">Valor</th></tr></thead>
      <tbody>${htmlRows || '<tr><td colspan="8">Sem dados para os filtros selecionados.</td></tr>'}</tbody></table>`
    );
  }

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Compra</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Produtos</h1>
            <p className="mt-1 text-sm text-zinc-300">Visão analítica de preço, quantidade e fornecedores por produto.</p>
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-end gap-2">
              <button onClick={openResumoReport} className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-black text-white hover:bg-white/10">Relatório resumo</button>
              <button onClick={openAnaliticoReport} className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-black text-white hover:bg-white/10">Relatório analítico</button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Categoria</option>
                {categorias.map((c) => <option key={c} value={c} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>{c}</option>)}
              </select>
              <select value={produtoId} onChange={(e) => setProdutoId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Produto</option>
                {produtos.map((p) => <option key={p.id} value={p.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>{p.name}</option>)}
              </select>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
            </div>
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
          </section>

          <section className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-3xl border border-accent-400/30 bg-accent-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Preço médio</p>
              <p className="mt-2 text-2xl font-black text-white">{money(metrics.avgPrice)}</p>
            </div>
            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Menor preço</p>
              <p className="mt-2 text-2xl font-black text-white">{metrics.min ? money(metrics.min.preco) : money(0)}</p>
              <p className="mt-2 text-xs text-zinc-300">{metrics.min ? `${dbr(metrics.min.data)} · ${metrics.min.fornecedor}` : "-"}</p>
            </div>
            <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Maior preço</p>
              <p className="mt-2 text-2xl font-black text-white">{metrics.max ? money(metrics.max.preco) : money(0)}</p>
              <p className="mt-2 text-xs text-zinc-300">{metrics.max ? `${dbr(metrics.max.data)} · ${metrics.max.fornecedor}` : "-"}</p>
            </div>
            <div className="rounded-3xl border border-sky-400/30 bg-sky-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Relação no período</p>
              <p className="mt-2 text-2xl font-black text-white">{money(metrics.totalValue)}</p>
              <p className="mt-2 text-xs text-zinc-300">Qtd.: {metrics.totalQty.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <p className="text-sm font-black text-white">Preços pagos por produto ao longo do tempo</p>
            <p className="mt-1 text-xs text-zinc-400">Média mensal de preço por produto (top 5 conforme filtros).</p>
            <div className="mt-4">
              <PriceTimelineChart months={timeline.months} series={timeline.series} />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <p className="text-sm font-black text-white">Por fornecedor</p>
            <div className="mt-3 space-y-2">
              {byFornecedor.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2">
                  <p className="text-sm font-semibold text-zinc-100">{label}</p>
                  <p className="text-sm font-black text-zinc-100">{money(value)}</p>
                </div>
              ))}
              {!loading && byFornecedor.length === 0 ? <p className="text-sm text-zinc-400">Sem dados para o período.</p> : null}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Produtos comprados</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${allRows.length} registro(s)`}</p>
            </div>
            <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 md:grid">
              <div className="col-span-2">Data</div>
              <div className="col-span-2">NF</div>
              <div className="col-span-2">Produto</div>
              <div className="col-span-2">Categoria</div>
              <div className="col-span-2">Fornecedor</div>
              <div className="col-span-1 text-right">Qtd.</div>
              <div className="col-span-1 text-right">Valor</div>
            </div>
            <div className="mt-3 space-y-2">
              {allRows.map((r, idx) => (
                <div key={`${r.produtoId}-${idx}-${r.nf}`} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 md:grid-cols-12 md:items-center md:gap-3">
                  <div className="md:col-span-2 text-sm font-semibold text-zinc-100">{dbr(r.data)}</div>
                  <div className="md:col-span-2 text-sm font-semibold text-zinc-100">{r.nf}</div>
                  <div className="md:col-span-2 text-sm font-black text-zinc-100">{r.produto}</div>
                  <div className="md:col-span-2 text-sm font-semibold text-zinc-100">{r.categoria}</div>
                  <div className="md:col-span-2 text-sm font-semibold text-zinc-100">{r.fornecedor}</div>
                  <div className="md:col-span-1 text-right text-sm font-black text-zinc-100">{r.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div>
                  <div className="md:col-span-1 text-right text-sm font-black text-zinc-100">{money(r.total)}</div>
                </div>
              ))}
              {!loading && allRows.length === 0 ? <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">Nenhum dado de produto para os filtros selecionados.</div> : null}
            </div>
          </section>
        </div>
      )}
    </AuthedAdminShell>
  );
}
