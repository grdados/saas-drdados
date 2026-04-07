"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { ContaPagar, ContaReceber, isApiError, listContasAPagar, listContasAReceber } from "@/lib/api";
import { formatCurrencyBRL, formatDateBR } from "@/lib/locale";

function n(v: unknown) {
  const x = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

function money(v: unknown) {
  return formatCurrencyBRL(n(v));
}

function d(v: string | null | undefined) {
  if (!v) return "-";
  const dt = new Date(`${v}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? v : formatDateBR(dt);
}

type FluxStatus = "open" | "overdue" | "partial" | "paid" | "canceled";
type FluxDirection = "entrada" | "saida";

type FluxItem = {
  id: number;
  key: string;
  direction: FluxDirection;
  date: string | null;
  due_date: string | null;
  origem: string;
  origemKey: string;
  document: string;
  parceiro: string;
  status: FluxStatus;
  total: number;
  settled: number;
  balance: number;
};

function normalizeReceberStatus(it: ContaReceber): FluxStatus {
  if (it.status === "paid" || it.status === "partial" || it.status === "canceled" || it.status === "overdue") return it.status;
  if (it.status === "open" && it.due_date && new Date(it.due_date) < new Date(new Date().toDateString())) return "overdue";
  return "open";
}

function normalizePagarStatus(it: ContaPagar): FluxStatus {
  if (it.status === "paid" || it.status === "partial" || it.status === "canceled" || it.status === "overdue") return it.status;
  if (it.status === "open" && it.due_date && new Date(it.due_date) < new Date(new Date().toDateString())) return "overdue";
  return "open";
}

function statusLabel(status: FluxStatus) {
  if (status === "paid") return "Pago";
  if (status === "partial") return "Parcial";
  if (status === "overdue") return "Vencido";
  if (status === "canceled") return "Cancelado";
  return "Pendente";
}

function origemLabel(origem: string) {
  if (origem === "nota_fiscal") return "Nota Fiscal";
  if (origem === "contrato") return "Contrato";
  if (origem === "pedido") return "Pedido";
  if (origem === "duplicata") return "Duplicata";
  return origem || "-";
}

export default function FluxoCaixaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receber, setReceber] = useState<ContaReceber[]>([]);
  const [pagar, setPagar] = useState<ContaPagar[]>([]);

  const [q, setQ] = useState("");
  const [fTipo, setFTipo] = useState<"" | FluxDirection>("");
  const [fOrigem, setFOrigem] = useState("");
  const [fStatus, setFStatus] = useState<"" | FluxStatus>("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  useEffect(() => {
    async function run() {
      const token = getAccessToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [r, p] = await Promise.all([listContasAReceber(token), listContasAPagar(token)]);
        setReceber(r);
        setPagar(p);
      } catch (err) {
        if (isApiError(err) && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Falha ao carregar fluxo de caixa.");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  const allItems = useMemo(() => {
    const inItems: FluxItem[] = receber.map((it) => ({
      id: it.id,
      key: `r-${it.id}`,
      direction: "entrada",
      date: it.date,
      due_date: it.due_date,
      origem: origemLabel(it.origem),
      origemKey: it.origem,
      document: it.document_number || "-",
      parceiro: it.cliente?.name || it.produtor?.name || "-",
      status: normalizeReceberStatus(it),
      total: n(it.total_value),
      settled: n(it.received_value),
      balance: n(it.balance_value)
    }));

    const outItems: FluxItem[] = pagar.map((it) => ({
      id: it.id,
      key: `p-${it.id}`,
      direction: "saida",
      date: it.date,
      due_date: it.due_date,
      origem: origemLabel(it.origem),
      origemKey: it.origem,
      document: it.invoice_number || "-",
      parceiro: it.fornecedor?.name || it.produtor?.name || "-",
      status: normalizePagarStatus(it),
      total: n(it.total_value),
      settled: n(it.paid_value),
      balance: n(it.balance_value)
    }));

    return [...inItems, ...outItems].sort((a, b) => {
      const av = a.due_date || a.date || "";
      const bv = b.due_date || b.date || "";
      return bv.localeCompare(av);
    });
  }, [receber, pagar]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allItems.filter((it) => {
      const dateRef = it.due_date || it.date || "";
      if (fTipo && it.direction !== fTipo) return false;
      if (fOrigem && it.origemKey !== fOrigem) return false;
      if (fStatus && it.status !== fStatus) return false;
      if (fFrom && dateRef && dateRef < fFrom) return false;
      if (fTo && dateRef && dateRef > fTo) return false;
      if (!needle) return true;
      const blob = `${it.document} ${it.parceiro} ${it.origem}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [allItems, q, fTipo, fOrigem, fStatus, fFrom, fTo]);

  const stats = useMemo(() => {
    let entradaPrevista = 0;
    let saidaPrevista = 0;
    let entradaRealizada = 0;
    let saidaRealizada = 0;
    for (const it of filtered) {
      if (it.direction === "entrada") {
        entradaPrevista += it.total;
        entradaRealizada += it.settled;
      } else {
        saidaPrevista += it.total;
        saidaRealizada += it.settled;
      }
    }
    return {
      entradaPrevista,
      saidaPrevista,
      saldoPrevisto: entradaPrevista - saidaPrevista,
      entradaRealizada,
      saidaRealizada,
      saldoRealizado: entradaRealizada - saidaRealizada
    };
  }, [filtered]);

  const origemOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of allItems) {
      if (it.origemKey) set.add(it.origemKey);
    }
    return [...set];
  }, [allItems]);

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-5">
          <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Financeiro</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Fluxo de Caixa</h1>
              <p className="mt-1 text-sm text-zinc-300">
                Consolidado de contas a receber e pagar. Vendas de graos entram automaticamente por Nota Fiscal.
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Relatorios</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <button className="min-h-[34px] rounded-2xl border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-zinc-100">
                  Resumo
                </button>
                <button className="min-h-[34px] rounded-2xl border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-zinc-100">
                  Analitico
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3.5">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-6">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por documento, parceiro ou origem..."
                className="xl:col-span-2 rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-500"
              />
              <select
                value={fTipo}
                onChange={(e) => setFTipo((e.target.value as "" | FluxDirection) || "")}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"
              >
                <option value="">Movimento</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saida</option>
              </select>
              <select
                value={fOrigem}
                onChange={(e) => setFOrigem(e.target.value)}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"
              >
                <option value="">Origem</option>
                {origemOptions.map((o) => (
                  <option key={o} value={o}>
                    {origemLabel(o)}
                  </option>
                ))}
              </select>
              <select
                value={fStatus}
                onChange={(e) => setFStatus((e.target.value as "" | FluxStatus) || "")}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"
              >
                <option value="">Status</option>
                <option value="open">Pendente</option>
                <option value="overdue">Vencido</option>
                <option value="partial">Parcial</option>
                <option value="paid">Pago</option>
                <option value="canceled">Cancelado</option>
              </select>
              <button
                onClick={() => {
                  setQ("");
                  setFTipo("");
                  setFOrigem("");
                  setFStatus("");
                  setFFrom("");
                  setFTo("");
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-medium text-zinc-200"
              >
                Limpar
              </button>
            </div>
            <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
              <input
                type="date"
                value={fFrom}
                onChange={(e) => setFFrom(e.target.value)}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100 [color-scheme:dark]"
              />
              <input
                type="date"
                value={fTo}
                onChange={(e) => setFTo(e.target.value)}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100 [color-scheme:dark]"
              />
            </div>
          </section>

          <section className="grid gap-2.5 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Entrada prevista</p>
              <p className="mt-1 text-xl font-black text-emerald-100">{money(stats.entradaPrevista)}</p>
            </div>
            <div className="rounded-3xl border border-rose-400/25 bg-rose-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">Saida prevista</p>
              <p className="mt-1 text-xl font-black text-rose-100">{money(stats.saidaPrevista)}</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Saldo previsto</p>
              <p className="mt-1 text-xl font-black text-white">{money(stats.saldoPrevisto)}</p>
            </div>
            <div className="rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Entrada realizada</p>
              <p className="mt-1 text-xl font-black text-emerald-100">{money(stats.entradaRealizada)}</p>
            </div>
            <div className="rounded-3xl border border-rose-400/25 bg-rose-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">Saida realizada</p>
              <p className="mt-1 text-xl font-black text-rose-100">{money(stats.saidaRealizada)}</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Saldo realizado</p>
              <p className="mt-1 text-xl font-black text-white">{money(stats.saldoRealizado)}</p>
            </div>
          </section>

          {error ? (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div>
          ) : null}

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Lancamentos do fluxo</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
            </div>
            <div className="mt-3 overflow-x-auto">
              <div className="hidden grid-cols-[80px_80px_110px_110px_1fr_100px_120px_120px_120px] gap-2 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 xl:grid">
                <div>Data</div>
                <div>Tipo</div>
                <div>Origem</div>
                <div>Documento</div>
                <div>Parceiro</div>
                <div>Status</div>
                <div className="text-right">Previsto</div>
                <div className="text-right">Realizado</div>
                <div className="text-right">Saldo</div>
              </div>
              <div className="mt-2 space-y-2">
                {filtered.map((it) => (
                  <div key={it.key} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2.5">
                    <div className="grid grid-cols-1 gap-2 xl:grid-cols-[80px_80px_110px_110px_1fr_100px_120px_120px_120px] xl:items-center xl:gap-2">
                      <div className="text-xs text-zinc-100">{d(it.due_date || it.date)}</div>
                      <div className={`text-xs font-semibold ${it.direction === "entrada" ? "text-emerald-300" : "text-rose-300"}`}>
                        {it.direction === "entrada" ? "Entrada" : "Saida"}
                      </div>
                      <div className="text-xs text-zinc-100">{it.origem}</div>
                      <div className="truncate text-xs text-zinc-100">{it.document}</div>
                      <div className="truncate text-xs text-zinc-100">{it.parceiro}</div>
                      <div className="text-xs text-zinc-100">{statusLabel(it.status)}</div>
                      <div className="text-right text-xs text-zinc-100">{money(it.total)}</div>
                      <div className="text-right text-xs text-zinc-100">{money(it.settled)}</div>
                      <div className="text-right text-xs text-zinc-100">{money(it.balance)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </AuthedAdminShell>
  );
}
