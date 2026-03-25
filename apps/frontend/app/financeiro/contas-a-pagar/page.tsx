"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  ContaPagar,
  ContaFinanceira,
  FaturamentoCompra,
  isApiError,
  listContas,
  listContasAPagar,
  listFaturamentosCompra,
  listInsumos,
  listPedidosCompra,
  listSafras,
  updateContaPagarStatus
} from "@/lib/api";

function parseNumber(v: unknown) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function prettyMoney(v: unknown) {
  const n = parseNumber(v);
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function prettyDate(s: string | null | undefined) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("pt-BR");
  } catch {
    return s;
  }
}

type ContaStatus = "open" | "overdue" | "partial" | "paid" | "canceled";

function statusMeta(status: ContaStatus) {
  if (status === "paid") return { label: "Pago", cls: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" };
  if (status === "partial") return { label: "Parcial", cls: "border-sky-400/30 bg-sky-500/15 text-sky-200" };
  if (status === "overdue") return { label: "Vencido", cls: "border-rose-400/30 bg-rose-500/15 text-rose-200" };
  if (status === "canceled") return { label: "Cancelado", cls: "border-zinc-400/30 bg-zinc-500/15 text-zinc-200" };
  return { label: "Pendente", cls: "border-amber-400/30 bg-amber-500/15 text-amber-200" };
}

function normalizeStatus(it: ContaPagar): ContaStatus {
  if (it.status === "paid" || it.status === "partial" || it.status === "canceled" || it.status === "overdue") {
    return it.status;
  }
  if (it.status === "open" && it.due_date && new Date(it.due_date) < new Date(new Date().toDateString())) {
    return "overdue";
  }
  return "open";
}

type PaymentState = {
  payment_date: string;
  payment_increment: string;
  paid_value: string;
  discount_value: string;
  addition_value: string;
  payment_method: "pix" | "boleto" | "transfer" | "card" | "cash" | "other";
  conta_id: number | "";
  status: ContaStatus;
};

const DEFAULT_PAYMENT: PaymentState = {
  payment_date: "",
  payment_increment: "",
  paid_value: "",
  discount_value: "0",
  addition_value: "0",
  payment_method: "pix",
  conta_id: "",
  status: "paid"
};

export default function ContasAPagarPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContaPagar[]>([]);
  const [error, setError] = useState("");
  const [pedidosSafraById, setPedidosSafraById] = useState<Record<number, { id: number; name: string } | null>>({});
  const [safras, setSafras] = useState<Array<{ id: number; name: string }>>([]);
  const [contas, setContas] = useState<ContaFinanceira[]>([]);
  const [faturamentos, setFaturamentos] = useState<FaturamentoCompra[]>([]);
  const [insumos, setInsumos] = useState<Array<{ id: number; categoria: { id: number; name: string } | null }>>([]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | ContaStatus>("all");
  const [reportSafraId, setReportSafraId] = useState<number | "">("");
  const [reportGrupoId, setReportGrupoId] = useState<number | "">("");
  const [reportProdutorId, setReportProdutorId] = useState<number | "">("");
  const [reportFornecedorId, setReportFornecedorId] = useState<number | "">("");
  const [reportCategoria, setReportCategoria] = useState("");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [payment, setPayment] = useState<PaymentState>(DEFAULT_PAYMENT);
  const [paying, setPaying] = useState(false);

  const faturamentoById = useMemo(() => {
    const map = new Map<number, FaturamentoCompra>();
    for (const f of faturamentos) map.set(f.id, f);
    return map;
  }, [faturamentos]);

  const categoriaByInsumoId = useMemo(() => {
    const map = new Map<number, string>();
    for (const i of insumos) map.set(i.id, i.categoria?.name ?? "SEM CATEGORIA");
    return map;
  }, [insumos]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...items]
      .filter((it) => {
        const st = normalizeStatus(it);
        if (status !== "all" && st !== status) return false;
        if (reportSafraId !== "" && (pedidosSafraById[it.pedido?.id ?? -1]?.id ?? null) !== Number(reportSafraId)) return false;
        if (reportGrupoId !== "" && (it.grupo?.id ?? null) !== Number(reportGrupoId)) return false;
        if (reportProdutorId !== "" && (it.produtor?.id ?? null) !== Number(reportProdutorId)) return false;
        if (reportFornecedorId !== "" && (it.fornecedor?.id ?? null) !== Number(reportFornecedorId)) return false;
        if (reportCategoria) {
          const fat = it.faturamento?.id ? faturamentoById.get(it.faturamento.id) : null;
          const hasCategory = (fat?.items || []).some((row) => {
            const pid = row.produto?.id ?? null;
            if (!pid) return false;
            return (categoriaByInsumoId.get(pid) ?? "SEM CATEGORIA") === reportCategoria;
          });
          if (!hasCategory) return false;
        }
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
  }, [items, q, status, reportSafraId, reportGrupoId, reportProdutorId, reportFornecedorId, reportCategoria, reportFrom, reportTo, pedidosSafraById, faturamentoById, categoriaByInsumoId]);

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

  const fornecedores = useMemo(() => {
    const m = new Map<number, string>();
    for (const it of items) if (it.fornecedor?.id) m.set(it.fornecedor.id, it.fornecedor.name);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [items]);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    for (const cp of items) {
      const fat = cp.faturamento?.id ? faturamentoById.get(cp.faturamento.id) : null;
      for (const row of fat?.items || []) {
        const pid = row.produto?.id ?? null;
        if (!pid) continue;
        set.add(categoriaByInsumoId.get(pid) ?? "SEM CATEGORIA");
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items, faturamentoById, categoriaByInsumoId]);

  const stats = useMemo(() => {
    const all = filtered;
    const byStatus = {
      open: all.filter((x) => normalizeStatus(x) === "open"),
      overdue: all.filter((x) => normalizeStatus(x) === "overdue"),
      partial: all.filter((x) => normalizeStatus(x) === "partial"),
      paid: all.filter((x) => normalizeStatus(x) === "paid"),
      canceled: all.filter((x) => normalizeStatus(x) === "canceled")
    };
    const sum = (arr: ContaPagar[]) => arr.reduce((acc, it) => acc + parseNumber(it.total_value), 0);
    return {
      totalValue: sum(all),
      totalQty: all.length,
      openValue: sum(byStatus.open),
      openQty: byStatus.open.length,
      overdueValue: sum(byStatus.overdue),
      overdueQty: byStatus.overdue.length,
      partialValue: sum(byStatus.partial),
      partialQty: byStatus.partial.length,
      paidValue: sum(byStatus.paid),
      paidQty: byStatus.paid.length,
      canceledValue: sum(byStatus.canceled),
      canceledQty: byStatus.canceled.length
    };
  }, [filtered]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const [data, ped, saf, contasData, fats, ins] = await Promise.all([
        listContasAPagar(token),
        listPedidosCompra(token),
        listSafras(token),
        listContas(token),
        listFaturamentosCompra(token),
        listInsumos(token)
      ]);
      setItems(data);
      const map: Record<number, { id: number; name: string } | null> = {};
      for (const p of ped) map[p.id] = p.safra ?? null;
      setPedidosSafraById(map);
      setSafras(saf.map((s) => ({ id: s.id, name: s.name })));
      setContas(contasData);
      setFaturamentos(fats);
      setInsumos(ins.map((i) => ({ id: i.id, categoria: i.categoria ?? null })));
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

  function toggleOne(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    const ids = filtered.map((x) => x.id);
    setSelectedIds((prev) => (ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
  }

  function exportCsv() {
    const header = ["VENCIMENTO", "NF", "FORNECEDOR", "PRODUTOR", "PEDIDO", "TOTAL", "PAGO", "SALDO", "STATUS"];
    const lines = filtered.map((it) => {
      const st = statusMeta(normalizeStatus(it)).label.toUpperCase();
      return [
        prettyDate(it.due_date),
        it.invoice_number || "",
        it.fornecedor?.name ?? "",
        it.produtor?.name ?? "",
        it.pedido?.code ?? "",
        String(it.total_value ?? ""),
        String(it.paid_value ?? ""),
        String(it.balance_value ?? ""),
        st
      ];
    });
    const csv = [header, ...lines]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contas-a-pagar.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openPayFor(ids: number[]) {
    if (!ids.length) return;
    setSelectedIds(ids);
    const first = items.find((x) => x.id === ids[0]);
    const currentStatus = first ? normalizeStatus(first) : "open";
    const canReopen = currentStatus === "paid";
    setPayment({
      ...DEFAULT_PAYMENT,
      status: canReopen ? "open" : "paid",
      paid_value: canReopen ? "0" : ""
    });
    setPayOpen(true);
  }

  async function runPayment() {
    const token = getAccessToken();
    if (!token || !selectedIds.length) return;
    setPaying(true);
    setError("");
    try {
      const payload = {
        payment_date: payment.payment_date || null,
        payment_increment: payment.payment_increment ? parseNumber(payment.payment_increment) : undefined,
        paid_value: payment.paid_value ? parseNumber(payment.paid_value) : undefined,
        discount_value: parseNumber(payment.discount_value || "0"),
        addition_value: parseNumber(payment.addition_value || "0"),
        payment_method: payment.payment_method,
        conta_id: payment.conta_id === "" ? null : Number(payment.conta_id),
        status: payment.status
      };
      const selected = items.filter((x) => selectedIds.includes(x.id));
      const allPaid = selected.every((x) => normalizeStatus(x) === "paid");
      if (allPaid && payload.status === "paid" && (payload.payment_increment ?? 0) > 0) {
        setError("Faturas pagas nao podem receber novo pagamento. Use status/valor para desfazer.");
        setPaying(false);
        return;
      }
      await Promise.all(selectedIds.map((id) => updateContaPagarStatus(token, id, payload)));
      setPayOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao efetuar pagamento.");
    } finally {
      setPaying(false);
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
            <p className="mt-1 text-sm text-zinc-300">Consulta e pagamento individual/lote com reflexo em faturamento.</p>
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="grid gap-3 lg:grid-cols-10">
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
              <select value={reportFornecedorId} onChange={(e) => setReportFornecedorId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={optionStyle}>Fornecedor</option>
                {fornecedores.map((f) => (<option key={f.id} value={f.id} style={optionStyle}>{f.name}</option>))}
              </select>
              <select value={reportCategoria} onChange={(e) => setReportCategoria(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={optionStyle}>Categoria</option>
                {categorias.map((c) => (<option key={c} value={c} style={optionStyle}>{c}</option>))}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value as "all" | ContaStatus)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="all" style={optionStyle}>Todos</option>
                <option value="open" style={optionStyle}>Pendente</option>
                <option value="overdue" style={optionStyle}>Vencido</option>
                <option value="partial" style={optionStyle}>Parcial</option>
                <option value="paid" style={optionStyle}>Pago</option>
                <option value="canceled" style={optionStyle}>Cancelado</option>
              </select>
              <div className="flex gap-2">
                <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
                <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => openPayFor(selectedIds)}
                disabled={!selectedIds.length}
                className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-100 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pagar selecionados ({selectedIds.length})
              </button>
              <button
                onClick={toggleAll}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-zinc-200 hover:bg-white/10"
              >
                {filtered.length > 0 && filtered.every((x) => selectedIds.includes(x.id)) ? "Desmarcar lista" : "Selecionar lista"}
              </button>
              <button
                onClick={exportCsv}
                className="rounded-2xl border border-sky-400/25 bg-sky-500/15 px-4 py-2 text-sm font-black text-sky-100 hover:bg-sky-500/25"
              >
                Exportar CSV
              </button>
            </div>
            {error ? (
              <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
                {error}
              </div>
            ) : null}
          </section>

          <section className="grid gap-4 lg:grid-cols-6">
            {[
              { label: "Valor total", value: prettyMoney(stats.totalValue), qty: stats.totalQty, tone: "border-accent-400/30 bg-accent-500/10" },
              { label: "Pendente", value: prettyMoney(stats.openValue), qty: stats.openQty, tone: "border-amber-400/30 bg-amber-500/10" },
              { label: "Parcial", value: prettyMoney(stats.partialValue), qty: stats.partialQty, tone: "border-sky-400/30 bg-sky-500/10" },
              { label: "Vencido", value: prettyMoney(stats.overdueValue), qty: stats.overdueQty, tone: "border-rose-400/30 bg-rose-500/10" },
              { label: "Pago", value: prettyMoney(stats.paidValue), qty: stats.paidQty, tone: "border-emerald-400/30 bg-emerald-500/10" },
              { label: "Cancelado", value: prettyMoney(stats.canceledValue), qty: stats.canceledQty, tone: "border-zinc-400/30 bg-zinc-500/10" }
            ].map((c) => (
              <div key={c.label} className={`rounded-3xl border p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] ${c.tone}`}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">{c.label}</p>
                <p className="mt-2 text-2xl font-black text-white">{c.value}</p>
                <p className="mt-2 text-xs font-semibold text-zinc-300">Quantidade: {c.qty}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Lista</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
            </div>

            <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 lg:grid">
              <div className="col-span-1">Sel</div>
              <div className="col-span-1">Venc.</div>
              <div className="col-span-1">NF</div>
              <div className="col-span-2">Fornecedor</div>
              <div className="col-span-2">Produtor</div>
              <div className="col-span-1">Pedido</div>
              <div className="col-span-1">Total</div>
              <div className="col-span-1">Pago</div>
              <div className="col-span-1">Saldo</div>
              <div className="col-span-1 text-right">Status / Acoes</div>
            </div>

            <div className="mt-3 space-y-2">
              {filtered.map((it) => {
                const st = normalizeStatus(it);
                const meta = statusMeta(st);
                return (
                  <div key={it.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 hover:bg-white/5">
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-center lg:gap-3">
                      <div className="lg:col-span-1">
                        <input type="checkbox" checked={selectedIds.includes(it.id)} onChange={() => toggleOne(it.id)} className="h-4 w-4 rounded border-white/20 bg-zinc-900" />
                      </div>
                      <div className="lg:col-span-1 text-sm font-semibold text-zinc-100">{prettyDate(it.due_date)}</div>
                      <div className="lg:col-span-1 text-sm font-black text-zinc-100">{it.invoice_number || "-"}</div>
                      <div className="lg:col-span-2 truncate text-sm font-semibold text-zinc-100">{it.fornecedor?.name ?? "-"}</div>
                      <div className="lg:col-span-2 truncate text-sm font-semibold text-zinc-100">{it.produtor?.name ?? "-"}</div>
                      <div className="lg:col-span-1 truncate text-sm font-semibold text-zinc-100">{it.pedido?.code ?? "-"}</div>
                      <div className="lg:col-span-1 text-sm font-black text-zinc-100">{prettyMoney(it.total_value)}</div>
                      <div className="lg:col-span-1 text-sm font-black text-zinc-100">{prettyMoney(it.paid_value)}</div>
                      <div className="lg:col-span-1 text-sm font-black text-zinc-100">{prettyMoney(it.balance_value)}</div>
                      <div className="lg:col-span-1 lg:text-right">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
                        <div className="mt-1 flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
                          <button
                            onClick={() => openPayFor([it.id])}
                            className="rounded-xl border border-emerald-400/25 bg-emerald-500/15 px-2 py-1 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/25"
                          >
                            {st === "paid" ? "Editar" : "Pagar"}
                          </button>
                          <select
                            value={it.status as ContaStatus}
                            onChange={async (e) => {
                              const token = getAccessToken();
                              if (!token) return;
                              const nextStatus = e.target.value as ContaStatus;
                              const isPaidNow = normalizeStatus(it) === "paid";
                              const updated = await updateContaPagarStatus(token, it.id, {
                                status: nextStatus,
                                paid_value: isPaidNow && nextStatus === "open" ? 0 : undefined
                              });
                              setItems((prev) => prev.map((x) => (x.id === it.id ? updated : x)));
                            }}
                            className="rounded-xl border border-white/10 bg-zinc-900/80 px-2 py-1 text-[11px] font-bold text-zinc-100 outline-none focus:border-accent-500/50"
                          >
                            <option value="open" style={optionStyle}>Pendente</option>
                            <option value="overdue" style={optionStyle}>Vencido</option>
                            <option value="partial" style={optionStyle}>Parcial</option>
                            <option value="paid" style={optionStyle}>Pago</option>
                            <option value="canceled" style={optionStyle}>Cancelado</option>
                          </select>
                        </div>
                        {(st === "partial" || st === "open" || st === "overdue") && (
                          <p className="mt-1 text-[11px] font-semibold text-zinc-400">Saldo: {prettyMoney(it.balance_value)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {payOpen ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setPayOpen(false)} aria-label="Fechar" />
              <div className="relative w-full max-w-[860px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/90 shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <p className="text-sm font-black text-white">Pagamento ({selectedIds.length} conta(s))</p>
                    <p className="mt-1 text-xs text-zinc-400">Individual ou lote com data, descontos, acrescimos, forma e conta.</p>
                  </div>
                  <button onClick={() => setPayOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">x</button>
                </div>
                <div className="grid gap-4 p-5 lg:grid-cols-3">
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Status</label>
                    <select value={payment.status} onChange={(e) => setPayment((p) => ({ ...p, status: e.target.value as ContaStatus }))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                      <option value="open" style={optionStyle}>Pendente</option>
                      <option value="overdue" style={optionStyle}>Vencido</option>
                      <option value="partial" style={optionStyle}>Parcial</option>
                      <option value="paid" style={optionStyle}>Pago</option>
                      <option value="canceled" style={optionStyle}>Cancelado</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data pagamento</label>
                    <input type="date" value={payment.payment_date} onChange={(e) => setPayment((p) => ({ ...p, payment_date: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Valor pagamento</label>
                    <input value={payment.payment_increment} onChange={(e) => setPayment((p) => ({ ...p, payment_increment: e.target.value }))} inputMode="decimal" placeholder="0,00" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100 outline-none focus:border-accent-500/50" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Valor pago (edicao)</label>
                    <input value={payment.paid_value} onChange={(e) => setPayment((p) => ({ ...p, paid_value: e.target.value }))} inputMode="decimal" placeholder="Opcional: define valor pago final" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100 outline-none focus:border-accent-500/50" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Forma pagamento</label>
                    <select value={payment.payment_method} onChange={(e) => setPayment((p) => ({ ...p, payment_method: e.target.value as PaymentState["payment_method"] }))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                      <option value="pix" style={optionStyle}>PIX</option>
                      <option value="boleto" style={optionStyle}>Boleto</option>
                      <option value="transfer" style={optionStyle}>Transferencia</option>
                      <option value="card" style={optionStyle}>Cartao</option>
                      <option value="cash" style={optionStyle}>Dinheiro</option>
                      <option value="other" style={optionStyle}>Outro</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Desconto</label>
                    <input value={payment.discount_value} onChange={(e) => setPayment((p) => ({ ...p, discount_value: e.target.value }))} inputMode="decimal" placeholder="0,00" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100 outline-none focus:border-accent-500/50" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Acrescimo</label>
                    <input value={payment.addition_value} onChange={(e) => setPayment((p) => ({ ...p, addition_value: e.target.value }))} inputMode="decimal" placeholder="0,00" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100 outline-none focus:border-accent-500/50" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Conta</label>
                    <select value={payment.conta_id} onChange={(e) => setPayment((p) => ({ ...p, conta_id: e.target.value === "" ? "" : Number(e.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                      <option value="" style={optionStyle}>Selecione</option>
                      {contas.map((c) => (<option key={c.id} value={c.id} style={optionStyle}>{c.name}</option>))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-white/10 p-5">
                  <button onClick={() => setPayOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200 hover:bg-white/10">Cancelar</button>
                  <button onClick={runPayment} disabled={paying} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-60">
                    {paying ? "Processando..." : "Efetuar pagamento"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}
