"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { ContaPagar, isApiError, listContasAPagar } from "@/lib/api";

function prettyMoney(v: unknown) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return `R$ ${Number.isFinite(n) ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}`;
}

function prettyDate(s: string | null | undefined) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("pt-BR");
  } catch {
    return s;
  }
}

export default function ContasAPagarPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContaPagar[]>([]);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "paid" | "canceled">("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...items]
      .filter((it) => {
        if (status !== "all" && it.status !== status) return false;
        if (!needle) return true;
        return (
          (it.invoice_number || "").toLowerCase().includes(needle) ||
          (it.fornecedor?.name ?? "").toLowerCase().includes(needle) ||
          (it.produtor?.name ?? "").toLowerCase().includes(needle) ||
          (it.pedido?.code ?? "").toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => String(a.due_date ?? "").localeCompare(String(b.due_date ?? "")));
  }, [items, q, status]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const data = await listContasAPagar(token);
      setItems(data);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao carregar contas a pagar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Financeiro</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Contas a pagar</h1>
            <p className="mt-1 text-sm text-zinc-300">Registros gerados automaticamente pelo faturamento.</p>
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por NF, fornecedor, produtor ou pedido..."
                className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full max-w-[220px] rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
              >
                <option value="all" style={optionStyle}>
                  Todos
                </option>
                <option value="open" style={optionStyle}>
                  Em aberto
                </option>
                <option value="paid" style={optionStyle}>
                  Pago
                </option>
                <option value="canceled" style={optionStyle}>
                  Cancelado
                </option>
              </select>
            </div>

            {error ? (
              <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
                {error}
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Lista</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
            </div>

            <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 md:grid">
              <div className="col-span-2">Venc.</div>
              <div className="col-span-2">NF</div>
              <div className="col-span-3">Fornecedor</div>
              <div className="col-span-2">Produtor</div>
              <div className="col-span-2">Pedido</div>
              <div className="col-span-1 text-right">Valor</div>
            </div>

            <div className="mt-3 space-y-2">
              {filtered.map((it) => (
                <div key={it.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 hover:bg-white/5">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center md:gap-3">
                    <div className="md:col-span-2">
                      <p className="text-sm font-black text-white">{prettyDate(it.due_date)}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{it.status}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-semibold text-zinc-100">{it.invoice_number || "-"}</p>
                    </div>
                    <div className="md:col-span-3">
                      <p className="truncate text-sm font-semibold text-zinc-100">{it.fornecedor?.name ?? "-"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="truncate text-sm font-semibold text-zinc-100">{it.produtor?.name ?? "-"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="truncate text-sm font-semibold text-zinc-100">{it.pedido?.code ?? "-"}</p>
                    </div>
                    <div className="md:col-span-1 md:text-right">
                      <p className="text-sm font-black text-zinc-100">{prettyMoney(it.total_value)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {!loading && filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">
                  Nenhuma conta a pagar encontrada.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </AuthedAdminShell>
  );
}

