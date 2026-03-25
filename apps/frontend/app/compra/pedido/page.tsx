"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  createPedidoCompra,
  deletePedidoCompra,
  FaturamentoCompra,
  FornecedorGerencial,
  GrupoProdutor,
  Insumo,
  isApiError,
  listFaturamentosCompra,
  listFornecedoresGerencial,
  listGruposProdutores,
  listInsumos,
  listOperacoes,
  listPedidosCompra,
  listProdutores,
  listSafras,
  Operacao,
  PedidoCompra,
  Produtor,
  Safra,
  updatePedidoCompra
} from "@/lib/api";
import { toUpperText } from "@/lib/text";

function toApiDecimal(v: unknown) {
  // DRF DecimalField aceita "5.50" mas não "5,50". Também lidamos com "1.234,56".
  const raw = String(v ?? "").trim();
  if (!raw) return "0";
  const s = raw.replace(/\s+/g, "");
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Assume "." como milhar e "," como decimal.
    return s.replace(/\./g, "").replace(",", ".");
  }
  if (hasComma) return s.replace(",", ".");
  return s;
}

function parseNumber(v: unknown) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function prettyDateBR(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("pt-BR");
}

function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "delivered" || s === "confirmed" || s === "paid") return { label: "Faturado", cls: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" };
  if (s === "partial") return { label: "Fat. Parcial", cls: "border-sky-400/30 bg-sky-500/15 text-sky-200" };
  if (s === "canceled") return { label: "Cancelado", cls: "border-zinc-400/30 bg-zinc-500/15 text-zinc-200" };
  return { label: "Pendente", cls: "border-amber-400/30 bg-amber-500/15 text-amber-200" };
}

function resolvePedidoStatus(
  p: PedidoCompra,
  billedByPedidoItem: Map<number, number>
): "pending" | "partial" | "delivered" | "canceled" {
  const original = String(p.status || "").toLowerCase();
  if (original === "canceled") return "canceled";
  const items = p.items || [];
  if (!items.length) return "pending";
  const totalQty = items.reduce((acc, it) => acc + parseNumber(it.quantity), 0);
  const totalReceived = items.reduce((acc, it) => {
    const billed = billedByPedidoItem.get(it.id);
    return acc + (typeof billed === "number" ? billed : parseNumber(it.received_quantity ?? "0"));
  }, 0);
  if (totalReceived <= 0) return "pending";
  if (totalQty > 0 && totalReceived >= totalQty) return "delivered";
  return "partial";
}

export default function PedidoCompraPage() {
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [error, setError] = useState("");

  const [grupos, setGrupos] = useState<GrupoProdutor[]>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorGerencial[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [faturamentos, setFaturamentos] = useState<FaturamentoCompra[]>([]);

  const [q, setQ] = useState("");
  const [reportSafraId, setReportSafraId] = useState<number | "">("");
  const [reportGrupoId, setReportGrupoId] = useState<number | "">("");
  const [reportProdutorId, setReportProdutorId] = useState<number | "">("");
  const [reportCategoria, setReportCategoria] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => pedidos.find((p) => p.id === editingId) ?? null, [pedidos, editingId]);

  const [formDate, setFormDate] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formGrupoId, setFormGrupoId] = useState<number | "">("");
  const [formProdutorId, setFormProdutorId] = useState<number | "">("");
  const [formFornecedorId, setFormFornecedorId] = useState<number | "">("");
  const [formSafraId, setFormSafraId] = useState<number | "">("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formOperacaoId, setFormOperacaoId] = useState<number | "">("");
  const [formStatus, setFormStatus] = useState("pending");
  const [rows, setRows] = useState<
    Array<{ produto_id: number | null; unit: string; quantity: string; price: string; discount: string }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const billedByPedidoItem = useMemo(() => {
    const map = new Map<number, number>();
    for (const fat of faturamentos) {
      if ((fat.status || "").toLowerCase() === "canceled") continue;
      for (const it of fat.items || []) {
        const pid = it.pedido_item_id ?? null;
        if (!pid) continue;
        map.set(pid, (map.get(pid) ?? 0) + parseNumber(it.quantity));
      }
    }
    return map;
  }, [faturamentos]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return pedidos.filter((p) => {
      const resolvedStatus = resolvePedidoStatus(p, billedByPedidoItem);
      if (reportSafraId !== "" && (p.safra?.id ?? null) !== Number(reportSafraId)) return false;
      if (reportGrupoId !== "" && (p.grupo?.id ?? null) !== Number(reportGrupoId)) return false;
      if (reportProdutorId !== "" && (p.produtor?.id ?? null) !== Number(reportProdutorId)) return false;
      if (reportStatus !== "all" && resolvedStatus !== reportStatus) return false;
      if (reportFrom && p.date && p.date < reportFrom) return false;
      if (reportTo && p.date && p.date > reportTo) return false;
      if (reportCategoria) {
        const hasCategory = (p.items || []).some((it) => {
          const prodId = it.produto?.id ?? null;
          const found = prodId ? insumos.find((x) => x.id === prodId) : null;
          return (found?.categoria?.name ?? "") === reportCategoria;
        });
        if (!hasCategory) return false;
      }
      if (!needle) return true;
      return (
        (p.code || "").toLowerCase().includes(needle) ||
        (p.fornecedor?.name ?? "").toLowerCase().includes(needle) ||
        (p.produtor?.name ?? "").toLowerCase().includes(needle)
      );
    });
  }, [
    pedidos,
    q,
    reportSafraId,
    reportGrupoId,
    reportProdutorId,
    reportStatus,
    reportFrom,
    reportTo,
    reportCategoria,
    insumos,
    billedByPedidoItem
  ]);

  const total = useMemo(() => {
    return rows.reduce((acc, r) => {
      const qty = parseFloat((r.quantity || "0").replace(",", "."));
      const price = parseFloat((r.price || "0").replace(",", "."));
      const discount = parseFloat((r.discount || "0").replace(",", "."));
      const t = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(price) ? price : 0) - (Number.isFinite(discount) ? discount : 0);
      return acc + (t > 0 ? t : 0);
    }, 0);
  }, [rows]);

  const produtoresFiltrados = useMemo(() => {
    if (formGrupoId === "") return produtores;
    const gid = Number(formGrupoId);
    return produtores.filter((p) => (p.grupo?.id ?? null) === gid);
  }, [produtores, formGrupoId]);

  const operacoesDespesa = useMemo(() => {
    return [...operacoes].filter((o) => o.kind === "debit").sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [operacoes]);

  const reportCategorias = useMemo(() => {
    const s = new Set<string>();
    for (const i of insumos) {
      const name = i.categoria?.name?.trim();
      if (name) s.add(name);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [insumos]);

  const cards = useMemo(() => {
    const total = filtered.reduce((acc, p) => acc + parseNumber(p.total_value), 0);
    const faturadosList = filtered.filter((p) => resolvePedidoStatus(p, billedByPedidoItem) === "delivered");
    const pendentesList = filtered.filter((p) => resolvePedidoStatus(p, billedByPedidoItem) === "pending");
    const parciaisList = filtered.filter((p) => resolvePedidoStatus(p, billedByPedidoItem) === "partial");
    const faturados = faturadosList.length;
    const pendentes = pendentesList.length;
    const parciais = parciaisList.length;
    const aFaturar = pendentes + parciais;
    const val = (arr: PedidoCompra[]) =>
      arr.reduce((acc, p) => acc + parseNumber(p.total_value), 0);
    return [
      {
        label: "Valor total",
        value: `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        qty: `${filtered.length} pedido(s)`,
        tone: "border-accent-400/30 bg-accent-500/10"
      },
      {
        label: "Faturados",
        value: `R$ ${val(faturadosList).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        qty: `${faturados} pedido(s)`,
        tone: "border-emerald-400/30 bg-emerald-500/10"
      },
      {
        label: "Pendentes",
        value: `R$ ${val(pendentesList).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        qty: `${pendentes} pedido(s)`,
        tone: "border-amber-400/30 bg-amber-500/10"
      },
      {
        label: "Parciais",
        value: `R$ ${val(parciaisList).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        qty: `${parciais} pedido(s)`,
        tone: "border-sky-400/30 bg-sky-500/10"
      },
      {
        label: "A faturar",
        value: `R$ ${val([...pendentesList, ...parciaisList]).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        qty: `${aFaturar} pedido(s)`,
        tone: "border-white/15 bg-white/5"
      }
    ];
  }, [filtered, billedByPedidoItem]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const [ped, grp, pro, forn, saf, ope, ins, fats] = await Promise.all([
        listPedidosCompra(token),
        listGruposProdutores(token),
        listProdutores(token),
        listFornecedoresGerencial(token),
        listSafras(token),
        listOperacoes(token),
        listInsumos(token),
        listFaturamentosCompra(token)
      ]);
      setPedidos(ped);
      setGrupos(grp);
      setProdutores(pro);
      setFornecedores(forn);
      setSafras(saf);
      setOperacoes(ope);
      setInsumos(ins);
      setFaturamentos(fats);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
    setError((msg || "").trim() || "Falha ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditingId(null);
    setFormDate("");
    setFormCode("");
    setFormGrupoId("");
    setFormProdutorId("");
    setFormFornecedorId("");
    setFormSafraId("");
    setFormDueDate("");
    setFormOperacaoId("");
    setFormStatus("pending");
    setRows([{ produto_id: null, unit: "", quantity: "0", price: "0", discount: "0" }]);
    setSaveMessage("");
    setOpen(true);
  }

  function openEdit(id: number) {
    const p = pedidos.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setFormDate(p.date ?? "");
    setFormCode(p.code ?? "");
    setFormGrupoId(p.grupo?.id ?? "");
    setFormProdutorId(p.produtor?.id ?? "");
    setFormFornecedorId(p.fornecedor?.id ?? "");
    setFormSafraId(p.safra?.id ?? "");
    setFormDueDate(p.due_date ?? "");
    setFormOperacaoId(p.operacao?.id ?? "");
    setFormStatus(p.status ?? "pending");
    setRows(
      (p.items || []).map((it) => ({
        produto_id: it.produto?.id ?? null,
        unit: it.unit ?? "",
        quantity: String(it.quantity ?? "0"),
        price: String(it.price ?? "0"),
        discount: String(it.discount ?? "0")
      }))
    );
    if ((p.items || []).length === 0) setRows([{ produto_id: null, unit: "", quantity: "0", price: "0", discount: "0" }]);
    setSaveMessage("");
    setOpen(true);
  }

  function patchRow(i: number, patch: Partial<(typeof rows)[number]>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        date: formDate || null,
        code: formCode.trim(),
        grupo_id: formGrupoId === "" ? null : Number(formGrupoId),
        produtor_id: formProdutorId === "" ? null : Number(formProdutorId),
        fornecedor_id: formFornecedorId === "" ? null : Number(formFornecedorId),
        safra_id: formSafraId === "" ? null : Number(formSafraId),
        due_date: formDueDate || null,
        operacao_id: formOperacaoId === "" ? null : Number(formOperacaoId),
        status: formStatus,
        items: rows.map((r) => ({
          produto_id: r.produto_id,
          unit: r.unit,
          quantity: toApiDecimal(r.quantity),
          price: toApiDecimal(r.price),
          discount: toApiDecimal(r.discount)
        }))
      };

      if (!editingId) {
        const created = await createPedidoCompra(token, payload);
        setPedidos((prev) => [...prev, created]);
      } else {
        const updated = await updatePedidoCompra(token, editingId, payload);
        setPedidos((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      }
      setOpen(false);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setSaveMessage((msg || "").trim() || "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number) {
    const token = getAccessToken();
    if (!token) return;
    const ok = window.confirm("Excluir este pedido?");
    if (!ok) return;
    try {
      await deletePedidoCompra(token, id);
      setPedidos((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) {
        setOpen(false);
        setEditingId(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError((msg || "").trim() || "Falha ao excluir pedido.");
    }
  }

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-5">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Compra</p>
          <h1 className="text-2xl font-black tracking-tight text-white">Pedido</h1>
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="grid gap-3 lg:grid-cols-10">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por pedido, fornecedor ou produtor..." className="lg:col-span-2 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
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
              <select value={reportCategoria} onChange={(e) => setReportCategoria(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={optionStyle}>Categoria</option>
                {reportCategorias.map((c) => (<option key={c} value={c} style={optionStyle}>{c}</option>))}
              </select>
              <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="all" style={optionStyle}>Status (todos)</option>
                <option value="pending" style={optionStyle}>Pendente</option>
                <option value="partial" style={optionStyle}>Fat. Parcial</option>
                <option value="delivered" style={optionStyle}>Faturado</option>
                <option value="canceled" style={optionStyle}>Cancelado</option>
              </select>
              <div className="flex min-w-0 gap-2 lg:col-span-2">
                <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
                <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={openCreate} className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400">Novo pedido</button>
            </div>
          </section>

          {error ? (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-5">
            {cards.map((c) => (
              <div key={c.label} className={`rounded-3xl border p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] ${c.tone}`}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">{c.label}</p>
                <p className="mt-2 text-2xl font-black text-white">{c.value}</p>
                <p className="mt-2 text-xs font-semibold text-zinc-300">{c.qty}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Lista</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
            </div>
            <div className="mt-3 hidden grid-cols-[120px_96px_130px_120px_150px_150px_150px_110px_110px_110px_120px] gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 md:grid">
              <div>Status</div>
              <div>Data</div>
              <div>Pedido</div>
              <div>Venc.</div>
              <div>Grupo</div>
              <div>Produtor</div>
              <div>Fornecedor</div>
              <div className="text-right">Qtd.</div>
              <div className="text-right">Preço</div>
              <div className="text-right">Valor</div>
              <div className="text-right">Ações</div>
            </div>
            <div className="mt-3 space-y-2">
              {filtered.map((p) => (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-4 py-3 hover:bg-white/5">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_96px_130px_120px_150px_150px_150px_110px_110px_110px_120px] md:items-center md:gap-3">
                    <div>
                      {(() => {
                        const meta = statusBadge(resolvePedidoStatus(p, billedByPedidoItem));
                        return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>;
                      })()}
                    </div>
                    <div><p className="text-sm font-semibold text-zinc-100">{prettyDateBR(p.date)}</p></div>
                    <div>
                      <button onClick={() => openEdit(p.id)} className="truncate text-left text-sm font-black text-white hover:text-accent-200">{p.code || `#${p.id}`}</button>
                    </div>
                    <div><p className="text-sm font-semibold text-zinc-100">{prettyDateBR(p.due_date)}</p></div>
                    <div><p className="truncate text-sm font-semibold text-zinc-100">{p.grupo?.name ?? "-"}</p></div>
                    <div><p className="truncate text-sm font-semibold text-zinc-100">{p.produtor?.name ?? "-"}</p></div>
                    <div><p className="truncate text-sm font-semibold text-zinc-100">{p.fornecedor?.name ?? "-"}</p></div>
                    <div className="text-right">
                      <p className="text-sm font-black text-zinc-100">
                        {(p.items || []).reduce((acc, it) => acc + parseNumber(it.quantity), 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                      </p>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const qty = (p.items || []).reduce((acc, it) => acc + parseNumber(it.quantity), 0);
                        const price = qty > 0 ? parseNumber(p.total_value) / qty : 0;
                        return <p className="text-sm font-black text-zinc-100">{price.toLocaleString("pt-BR", { minimumFractionDigits: 5, maximumFractionDigits: 5 })}</p>;
                      })()}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-zinc-100">R$ {Number(p.total_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="min-w-[120px] whitespace-nowrap">
                      <div className="flex w-full flex-nowrap justify-end gap-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openEdit(p.id)}
                          className="rounded-xl border border-sky-400/25 bg-sky-500/10 p-2 text-sky-200 hover:bg-sky-500/20"
                          title="Editar"
                          aria-label="Editar"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(p.id)}
                          className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-2 text-rose-200 hover:bg-rose-500/20"
                          title="Excluir"
                          aria-label="Excluir"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => window.open(`/compra/pedido/${p.id}/print`, "_blank", "noopener,noreferrer")}
                          className="whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white hover:bg-white/10"
                          title="Imprimir / PDF"
                          aria-label="Imprimir / PDF"
                        >
                          Imprimir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">Nenhum pedido encontrado.</div>
              ) : null}
            </div>
          </section>

          {/* Modal */}
          {open ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Fechar" />
              <div className="relative w-full max-w-[1100px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/85 shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <p className="text-sm font-black text-white">{editing ? "Editar pedido" : "Novo pedido"}</p>
                    <p className="mt-1 text-xs text-zinc-400">Formulário pai e itens (filho).</p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                    aria-label="Fechar modal"
                    title="Fechar"
                  >
                    ×
                  </button>
                </div>
                <div className="max-h-[78vh] overflow-auto p-5">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data</label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      />
                    </div>
                    <div className="grid gap-2 lg:col-span-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Pedido</label>
                      <input
                        value={formCode}
                        onChange={(e) => setFormCode(toUpperText(e.target.value))}
                        placeholder="Ex: PC-2026-001"
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Grupo</label>
                      <select
                        value={formGrupoId}
                        onChange={(e) => {
                          const next = e.target.value === "" ? "" : Number(e.target.value);
                          setFormGrupoId(next);
                          setFormProdutorId("");
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="" style={optionStyle}>
                          Selecione
                        </option>
                        {grupos.map((g) => (
                          <option key={g.id} value={g.id} style={optionStyle}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produtor</label>
                      <select
                        value={formProdutorId}
                        onChange={(e) => setFormProdutorId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="" style={optionStyle}>
                          Selecione
                        </option>
                        {produtoresFiltrados.map((p) => (
                          <option key={p.id} value={p.id} style={optionStyle}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Fornecedor</label>
                      <select
                        value={formFornecedorId}
                        onChange={(e) => setFormFornecedorId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="" style={optionStyle}>
                          Selecione
                        </option>
                        {fornecedores.map((f) => (
                          <option key={f.id} value={f.id} style={optionStyle}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Safra</label>
                      <select
                        value={formSafraId}
                        onChange={(e) => setFormSafraId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="" style={optionStyle}>
                          Selecione
                        </option>
                        {safras.map((s) => (
                          <option key={s.id} value={s.id} style={optionStyle}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Vencimento</label>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Operação</label>
                      <select
                        value={formOperacaoId}
                        onChange={(e) => setFormOperacaoId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="" style={optionStyle}>
                          Selecione
                        </option>
                        {operacoesDespesa.map((o) => (
                          <option key={o.id} value={o.id} style={optionStyle}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="pending" style={optionStyle}>
                          Pendente
                        </option>
                        <option value="draft" style={optionStyle}>
                          Rascunho
                        </option>
                        <option value="open" style={optionStyle}>
                          Em aberto
                        </option>
                        <option value="confirmed" style={optionStyle}>
                          Confirmado
                        </option>
                        <option value="canceled" style={optionStyle}>
                          Cancelado
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-white">Itens</p>
                      <button
                        onClick={() =>
                          setRows((prev) => [...prev, { produto_id: null, unit: "", quantity: "0", price: "0", discount: "0" }])
                        }
                        className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-3 py-2 text-sm font-black text-emerald-100 hover:bg-emerald-500/20"
                      >
                        Adicionar
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {rows.map((r, idx) => (
                        <div key={idx} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-zinc-950/35 p-3 lg:grid-cols-[1fr_90px_110px_110px_110px_50px]">
                          <select
                            value={r.produto_id ?? ""}
                            onChange={(e) => patchRow(idx, { produto_id: e.target.value === "" ? null : Number(e.target.value) })}
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                          >
                            <option value="" style={optionStyle}>
                              Produto (Insumo)
                            </option>
                            {insumos.map((p) => (
                              <option key={p.id} value={p.id} style={optionStyle}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <input
                            value={r.unit}
                            onChange={(e) => patchRow(idx, { unit: toUpperText(e.target.value) })}
                            placeholder="UN"
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                          />
                          <input
                            value={r.quantity}
                            onChange={(e) => patchRow(idx, { quantity: e.target.value })}
                            inputMode="decimal"
                            placeholder="Qtd"
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                          />
                          <input
                            value={r.price}
                            onChange={(e) => patchRow(idx, { price: e.target.value })}
                            inputMode="decimal"
                            placeholder="Preco"
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                          />
                          <input
                            value={r.discount}
                            onChange={(e) => patchRow(idx, { discount: e.target.value })}
                            inputMode="decimal"
                            placeholder="Desc."
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                          />
                          <button
                            onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                            className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-sm font-black text-rose-200 hover:bg-rose-500/15"
                            aria-label="Remover"
                            title="Remover"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Total</p>
                        <p className="mt-1 text-lg font-black text-white">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>

                  {saveMessage ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-semibold text-zinc-200">{saveMessage}</div>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      disabled={saving || formCode.trim().length < 2}
                      onClick={onSave}
                      className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}
