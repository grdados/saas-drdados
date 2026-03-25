"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  FaturamentoCompra,
  isApiError,
  listFaturamentosCompra,
  listFornecedoresGerencial,
  listGruposProdutores,
  listProdutores,
  listSafras
} from "@/lib/api";

function parseNumber(v: unknown) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function money(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dbr(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("pt-BR");
}

type ProductRow = {
  produtoId: number;
  produto: string;
  fornecedor: string;
  data: string;
  quantidade: number;
  preco: number;
  total: number;
};

export default function CompraProdutosPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [safras, setSafras] = useState<Array<{ id: number; name: string; start_date?: string | null; end_date?: string | null }>>([]);
  const [grupos, setGrupos] = useState<Array<{ id: number; name: string }>>([]);
  const [produtores, setProdutores] = useState<Array<{ id: number; name: string }>>([]);
  const [fornecedores, setFornecedores] = useState<Array<{ id: number; name: string }>>([]);

  const [q, setQ] = useState("");
  const [safraId, setSafraId] = useState<number | "">("");
  const [grupoId, setGrupoId] = useState<number | "">("");
  const [produtorId, setProdutorId] = useState<number | "">("");
  const [fornecedorId, setFornecedorId] = useState<number | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [faturamentos, setFaturamentos] = useState<FaturamentoCompra[]>([]);

  useEffect(() => {
    async function run() {
      const token = getAccessToken();
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const [sf, gr, pr, fo, fat] = await Promise.all([
          listSafras(token),
          listGruposProdutores(token),
          listProdutores(token),
          listFornecedoresGerencial(token),
          listFaturamentosCompra(token)
        ]);
        setSafras(sf.map((x) => ({ id: x.id, name: x.name, start_date: x.start_date, end_date: x.end_date })));
        setGrupos(gr.map((x) => ({ id: x.id, name: x.name })));
        setProdutores(pr.map((x) => ({ id: x.id, name: x.name })));
        setFornecedores(fo.map((x) => ({ id: x.id, name: x.name })));
        setFaturamentos(fat);
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

  const rows = useMemo(() => {
    const flat: ProductRow[] = [];
    const safraSelecionada = safras.find((s) => s.id === (safraId === "" ? -1 : Number(safraId)));
    for (const f of faturamentos) {
      if (grupoId !== "" && (f.grupo?.id ?? null) !== Number(grupoId)) continue;
      if (produtorId !== "" && (f.produtor?.id ?? null) !== Number(produtorId)) continue;
      if (fornecedorId !== "" && (f.fornecedor?.id ?? null) !== Number(fornecedorId)) continue;
      if (safraSelecionada?.start_date && f.date && f.date < safraSelecionada.start_date) continue;
      if (safraSelecionada?.end_date && f.date && f.date > safraSelecionada.end_date) continue;
      if (from && f.date && f.date < from) continue;
      if (to && f.date && f.date > to) continue;
      for (const it of f.items || []) {
        const name = it.produto?.name ?? "SEM PRODUTO";
        if (q && !name.toLowerCase().includes(q.toLowerCase()) && !(f.invoice_number || "").toLowerCase().includes(q.toLowerCase())) {
          continue;
        }
        flat.push({
          produtoId: it.produto?.id ?? 0,
          produto: name,
          fornecedor: f.fornecedor?.name ?? "SEM FORNECEDOR",
          data: f.date || "",
          quantidade: parseNumber(it.quantity),
          preco: parseNumber(it.price),
          total: parseNumber(it.total_item)
        });
      }
    }
    return flat;
  }, [faturamentos, grupoId, produtorId, fornecedorId, from, to, q, safras, safraId]);

  const metrics = useMemo(() => {
    const totalQty = rows.reduce((acc, r) => acc + r.quantidade, 0);
    const totalValue = rows.reduce((acc, r) => acc + r.total, 0);
    const avgPrice = totalQty > 0 ? totalValue / totalQty : 0;
    const min = rows.length ? rows.reduce((a, b) => (b.preco < a.preco ? b : a), rows[0]) : null;
    const max = rows.length ? rows.reduce((a, b) => (b.preco > a.preco ? b : a), rows[0]) : null;
    return { totalQty, totalValue, avgPrice, min, max };
  }, [rows]);

  const byFornecedor = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.fornecedor, (map.get(r.fornecedor) ?? 0) + r.total);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [rows]);

  const byPeriod = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (!r.data) continue;
      const d = new Date(`${r.data}T00:00:00`);
      const key = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      map.set(key.toUpperCase(), (map.get(key.toUpperCase()) ?? 0) + r.total);
    }
    return [...map.entries()];
  }, [rows]);

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
            <div className="grid gap-3 lg:grid-cols-7">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por produto ou nota fiscal..." className="lg:col-span-2 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
              <select value={safraId} onChange={(e) => setSafraId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Safra</option>
                {safras.map((s) => <option key={s.id} value={s.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>{s.name}</option>)}
              </select>
              <select value={grupoId} onChange={(e) => setGrupoId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Grupo</option>
                {grupos.map((s) => <option key={s.id} value={s.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>{s.name}</option>)}
              </select>
              <select value={produtorId} onChange={(e) => setProdutorId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Produtor</option>
                {produtores.map((s) => <option key={s.id} value={s.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>{s.name}</option>)}
              </select>
              <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Fornecedor</option>
                {fornecedores.map((s) => <option key={s.id} value={s.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>{s.name}</option>)}
              </select>
              <div className="flex gap-2 lg:col-span-2">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
              </div>
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

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-sm font-black text-white">Compra por período</p>
              <div className="mt-3 space-y-2">
                {byPeriod.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2">
                    <p className="text-xs font-black text-zinc-300">{label}</p>
                    <p className="text-sm font-black text-zinc-100">{money(value)}</p>
                  </div>
                ))}
                {!loading && byPeriod.length === 0 ? <p className="text-sm text-zinc-400">Sem dados para o período.</p> : null}
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
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Produtos comprados</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${rows.length} registro(s)`}</p>
            </div>
            <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 md:grid">
              <div className="col-span-2">Data</div>
              <div className="col-span-3">Produto</div>
              <div className="col-span-3">Fornecedor</div>
              <div className="col-span-2 text-right">Quantidade</div>
              <div className="col-span-2 text-right">Valor</div>
            </div>
            <div className="mt-3 space-y-2">
              {rows.map((r, idx) => (
                <div key={`${r.produtoId}-${idx}`} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 md:grid-cols-12 md:items-center md:gap-3">
                  <div className="md:col-span-2 text-sm font-semibold text-zinc-100">{dbr(r.data)}</div>
                  <div className="md:col-span-3 text-sm font-black text-zinc-100">{r.produto}</div>
                  <div className="md:col-span-3 text-sm font-semibold text-zinc-100">{r.fornecedor}</div>
                  <div className="md:col-span-2 text-right text-sm font-black text-zinc-100">{r.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div>
                  <div className="md:col-span-2 text-right text-sm font-black text-zinc-100">{money(r.total)}</div>
                </div>
              ))}
              {!loading && rows.length === 0 ? <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">Nenhum dado de produto para os filtros selecionados.</div> : null}
            </div>
          </section>
        </div>
      )}
    </AuthedAdminShell>
  );
}
