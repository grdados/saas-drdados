"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  ContaPagar,
  isApiError,
  listContasAPagar,
  listPedidosCompra,
  listSafras,
  updateContaPagarStatus
} from "@/lib/api";

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

function statusMeta(status: string) {
  if (status === "paid") return { label: "Pago", cls: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" };
  if (status === "partial") return { label: "Parcial", cls: "border-sky-400/30 bg-sky-500/15 text-sky-200" };
  if (status === "canceled") return { label: "Cancelado", cls: "border-zinc-400/30 bg-zinc-500/15 text-zinc-200" };
  return { label: "Pendente", cls: "border-amber-400/30 bg-amber-500/15 text-amber-200" };
}

function parseNumber(v: unknown) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function ContasAPagarPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContaPagar[]>([]);
  const [error, setError] = useState("");
  const [pedidosSafraById, setPedidosSafraById] = useState<Record<number, { id: number; name: string } | null>>({});
  const [safras, setSafras] = useState<Array<{ id: number; name: string }>>([]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "partial" | "paid" | "canceled">("all");
  const [reportSafraId, setReportSafraId] = useState<number | "">("");
  const [reportGrupoId, setReportGrupoId] = useState<number | "">("");
  const [reportProdutorId, setReportProdutorId] = useState<number | "">("");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [editingPaidById, setEditingPaidById] = useState<Record<number, string>>({});

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...items]
      .filter((it) => {
        if (status !== "all" && it.status !== status) return false;
        if (reportSafraId !== "" && (pedidosSafraById[it.pedido?.id ?? -1]?.id ?? null) !== Number(reportSafraId)) return false;
        if (reportGrupoId !== "" && (it.grupo?.id ?? null) !== Number(reportGrupoId)) return false;
        if (reportProdutorId !== "" && (it.produtor?.id ?? null) !== Number(reportProdutorId)) return false;
        if (reportFrom && it.date && it.date < reportFrom) return false;
        if (reportTo && it.date && it.date > reportTo) return false;
        if (!needle) return true;
        return (
          (it.invoice_number || "").toLowerCase().includes(needle) ||
          (it.fornecedor?.name ?? "").toLowerCase().includes(needle) ||
          (it.produtor?.name ?? "").toLowerCase().includes(needle) ||
          (it.pedido?.code ?? "").toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => String(a.due_date ?? "").localeCompare(String(b.due_date ?? "")));
  }, [items, q, status, reportSafraId, reportGrupoId, reportProdutorId, reportFrom, reportTo, pedidosSafraById]);

  const grupos = useMemo(() => {
    const m = new Map<number, string>();
    for (const it of items) if (it.grupo?.id) m.set(it.grupo.id, it.grupo.name);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [items]);

  const produtores = useMemo(() => {
    const m = new Map<number, string>();
    for (const it of items) if (it.produtor?.id) m.set(it.produtor.id, it.produtor.name);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [items]);

  const cards = useMemo(() => {
    const total = filtered.reduce((acc, it) => acc + Number(String(it.total_value).replace(",", ".")), 0);
    const pendente = filtered.filter((it) => it.status === "open").length;
    const parcial = filtered.filter((it) => it.status === "partial").length;
    const pago = filtered.filter((it) => it.status === "paid").length;
    const cancelado = filtered.filter((it) => it.status === "canceled").length;
    const vencido = filtered.filter((it) => it.status === "open" && !!it.due_date && new Date(it.due_date) < new Date(new Date().toDateString())).length;
    return [
      { label: "Valor total", value: prettyMoney(total), tone: "border-accent-400/30 bg-accent-500/10" },
      { label: "Pendente", value: String(pendente), tone: "border-amber-400/30 bg-amber-500/10" },
      { label: "Parcial", value: String(parcial), tone: "border-sky-400/30 bg-sky-500/10" },
      { label: "Vencido", value: String(vencido), tone: "border-rose-400/30 bg-rose-500/10" },
      { label: "Pago", value: String(pago), tone: "border-emerald-400/30 bg-emerald-500/10" },
      { label: "Cancelado", value: String(cancelado), tone: "border-zinc-400/30 bg-zinc-500/10" }
    ];
  }, [filtered]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const [data, ped, saf] = await Promise.all([listContasAPagar(token), listPedidosCompra(token), listSafras(token)]);
      setItems(data);
      setEditingPaidById(Object.fromEntries(data.map((it) => [it.id, String(it.paid_value ?? "0")])));
      const map: Record<number, { id: number; name: string } | null> = {};
      for (const p of ped) map[p.id] = p.safra ?? null;
      setPedidosSafraById(map);
      setSafras(saf.map((s) => ({ id: s.id, name: s.name })));
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

  async function onChangeStatus(id: number, next: "open" | "partial" | "paid" | "canceled") {
    const token = getAccessToken();
    if (!token) return;
    try {
      const updated = await updateContaPagarStatus(token, id, { status: next });
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      setEditingPaidById((prev) => ({ ...prev, [id]: String(updated.paid_value ?? "0") }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar status.");
    }
  }

  async function onSavePaid(id: number) {
    const token = getAccessToken();
    if (!token) return;
    try {
      const raw = editingPaidById[id] ?? "0";
      const updated = await updateContaPagarStatus(token, id, { paid_value: parseNumber(raw) });
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      setEditingPaidById((prev) => ({ ...prev, [id]: String(updated.paid_value ?? "0") }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar valor pago.");
    }
  }

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
            <div className="grid gap-3 lg:grid-cols-8">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por NF, fornecedor, produtor ou pedido..."
                className="lg:col-span-2 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
              />
              <select value={reportSafraId} onChange={(e) => setReportSafraId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={optionStyle}>Safra</option>
                {safras.map((s) => (<option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>))}
              </select>
              <select value={reportGrupoId} onChange={(e) => setReportGrupoId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={optionStyle}>Grupo</option>
                {grupos.map((g) => (<option key={g.id} value={g.id} style={optionStyle}>{g.name}</option>))}
              </select>
              <select value={reportProdutorId} onChange={(e) => setReportProdutorId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={optionStyle}>Produtor</option>
                {produtores.map((p) => (<option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
              >
                <option value="all" style={optionStyle}>
                  Todos
                </option>
                <option value="open" style={optionStyle}>
                  Em aberto
                </option>
                <option value="partial" style={optionStyle}>
                  Parcial
                </option>
                <option value="paid" style={optionStyle}>
                  Pago
                </option>
                <option value="canceled" style={optionStyle}>
                  Cancelado
                </option>
              </select>
              <div className="flex gap-2">
                <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50" />
                <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50" />
              </div>
            </div>

            {error ? (
              <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
                {error}
              </div>
            ) : null}
          </section>

          <section className="grid gap-4 lg:grid-cols-6">
            {cards.map((c) => (
              <div key={c.label} className={`rounded-3xl border p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] ${c.tone}`}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">{c.label}</p>
                <p className="mt-2 text-2xl font-black text-white">{c.value}</p>
              </div>
            ))}
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
              <div className="col-span-2 text-right">Valor / Pago / Saldo</div>
            </div>

            <div className="mt-3 space-y-2">
              {filtered.map((it) => (
                <div key={it.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 hover:bg-white/5">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center md:gap-3">
                    <div className="md:col-span-2">
                      <p className="text-sm font-black text-white">{prettyDate(it.due_date)}</p>
                      {(() => {
                        const meta = statusMeta(it.status);
                        return <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>;
                      })()}
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
                    <div className="md:col-span-2 md:text-right">
                      <p className="text-sm font-black text-zinc-100">{prettyMoney(it.total_value)}</p>
                      <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-2">
                        <input
                          value={editingPaidById[it.id] ?? String(it.paid_value ?? "0")}
                          onChange={(e) => setEditingPaidById((prev) => ({ ...prev, [it.id]: e.target.value }))}
                          inputMode="decimal"
                          className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-2 py-1 text-right text-[11px] font-bold text-zinc-100 outline-none focus:border-accent-500/50"
                          placeholder="Valor pago"
                        />
                        <button
                          type="button"
                          onClick={() => onSavePaid(it.id)}
                          className="rounded-xl border border-emerald-400/25 bg-emerald-500/15 px-2 py-1 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/25"
                        >
                          OK
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-zinc-400">
                        Saldo: <span className="text-zinc-200">{prettyMoney(it.balance_value)}</span>
                      </p>
                      <select value={it.status as "open" | "partial" | "paid" | "canceled"} onChange={(e) => onChangeStatus(it.id, e.target.value as "open" | "partial" | "paid" | "canceled")} className="mt-1 w-[120px] rounded-xl border border-white/10 bg-zinc-900/80 px-2 py-1 text-[11px] font-bold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="open" style={optionStyle}>Pendente</option>
                        <option value="partial" style={optionStyle}>Parcial</option>
                        <option value="paid" style={optionStyle}>Pago</option>
                        <option value="canceled" style={optionStyle}>Cancelado</option>
                      </select>
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
