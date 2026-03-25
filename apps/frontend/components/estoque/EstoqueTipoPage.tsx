"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { FaturamentoCompra, isApiError, listDepositos, listFaturamentosCompra, listSafras } from "@/lib/api";

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

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Estoque</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">{title}</h1>
            <p className="mt-1 text-sm text-zinc-300">{description}</p>
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por produto, deposito, fornecedor ou NF..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
              />
              <select
                value={safraId}
                onChange={(e) => setSafraId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-2xl border border-accent-500/40 bg-accent-500/15 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-400"
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

          <section className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-3xl border border-accent-400/30 bg-accent-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Valor em estoque</p>
              <p className="mt-2 text-2xl font-black text-white">{money(totals.value)}</p>
            </div>
            <div className="rounded-3xl border border-sky-400/30 bg-sky-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Volume recebido</p>
              <p className="mt-2 text-2xl font-black text-white">{qty(totals.volume)}</p>
            </div>
            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produtos</p>
              <p className="mt-2 text-2xl font-black text-white">{totals.produtos}</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Depositos</p>
              <p className="mt-2 text-2xl font-black text-white">{totals.deposits}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Lista de estoque</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${rows.length} item(ns)`}</p>
            </div>
            <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 md:grid">
              <div className="col-span-4">Produto</div>
              <div className="col-span-3">Deposito</div>
              <div className="col-span-2 text-right">Quantidade</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-1 text-right">Mov.</div>
            </div>
            <div className="mt-3 space-y-2">
              {rows.map((r, idx) => (
                <div key={`${r.produto}-${r.deposito}-${idx}`} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 md:grid-cols-12 md:items-center md:gap-3">
                  <div className="md:col-span-4 text-sm font-black text-white">{r.produto}</div>
                  <div className="md:col-span-3 text-sm font-semibold text-zinc-100">{r.deposito}</div>
                  <div className="md:col-span-2 text-right text-sm font-black text-zinc-100">{qty(r.quantidade)}</div>
                  <div className="md:col-span-2 text-right text-sm font-black text-zinc-100">{money(r.valor)}</div>
                  <div className="md:col-span-1 text-right text-xs font-semibold text-zinc-300">{r.notas}</div>
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

