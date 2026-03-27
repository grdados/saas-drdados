"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { produtorDisplayLabel } from "@/lib/produtorLabel";
import {
  ClienteGerencial,
  ContratoVenda,
  GrupoProdutor,
  Operacao,
  ProdutoItem,
  Produtor,
  Safra,
  createContratoVenda,
  deleteContratoVenda,
  isApiError,
  listClientesGerencial,
  listContratosVenda,
  listGruposProdutores,
  listOperacoes,
  listProdutosEstoque,
  listProdutores,
  listSafras,
  updateContratoVenda
} from "@/lib/api";
import { formatDateBR, formatDateTimeBR } from "@/lib/locale";
import { toUpperText } from "@/lib/text";

function toApiDecimal(v: unknown) {
  const raw = String(v ?? "").trim();
  if (!raw) return "0";
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  if (hasComma && hasDot) return raw.replace(/\./g, "").replace(",", ".");
  if (hasComma) return raw.replace(",", ".");
  return raw;
}
function n(v: unknown) {
  const x = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}
function d(s?: string | null) {
  if (!s) return "-";
  const dt = new Date(`${s}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? s : formatDateBR(dt);
}
function brMoney(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatCompactNumber(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}
function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function openPrintHtml(title: string, htmlBody: string, orientation: "portrait" | "landscape" = "landscape") {
  const generatedAt = formatDateTimeBR(new Date());
  const logoUrl = `${window.location.origin}/logo_horizontal.png`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title><style>@page{size:A4 ${orientation};margin:12mm 10mm;}body{font-family:Arial,sans-serif;margin:0;color:#111}.page{padding:14px 10px 10px}.header{display:grid;grid-template-columns:260px 1fr;gap:12px;align-items:center;border:1px solid #e4e4e7;border-radius:10px;padding:8px 10px;margin-bottom:12px}.header-info{text-align:right}.header-title{margin:0;font-size:18px;font-weight:800}.header-meta{margin-top:4px;color:#52525b;font-size:11px}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.card{border:1px solid #e2e2e2;border-radius:8px;padding:8px}.label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.08em}.value{margin-top:4px;font-size:18px;font-weight:700}.group{border:1px solid #d7d7d7;border-radius:10px;padding:10px;margin-top:12px}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #e2e2e2;padding:6px 8px;text-align:left}th{background:#f7f7f7}.num{text-align:right;white-space:nowrap}</style></head><body><div class="page"><header class="header"><div><img src="${logoUrl}" alt="GR Dados" style="max-height:52px"/></div><div class="header-info"><p class="header-title">${escapeHtml(title)}</p><div class="header-meta">Cliente: GR Dados Demo<br/>Emissão: ${generatedAt}</div></div></header>${htmlBody}</div></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "width=1280,height=900");
  if (!w) return;
  setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 350);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function statusLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "delivered") return "Entregue";
  if (s === "canceled") return "Cancelado";
  return "Pendente";
}
function statusMeta(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "delivered") return { label: "Entregue", cls: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" };
  if (s === "canceled") return { label: "Cancelado", cls: "border-zinc-400/30 bg-zinc-500/15 text-zinc-200" };
  return { label: "Pendente", cls: "border-amber-400/30 bg-amber-500/15 text-amber-200" };
}

export default function ContratoVendaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contracts, setContracts] = useState<ContratoVenda[]>([]);
  const [grupos, setGrupos] = useState<GrupoProdutor[]>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [clientes, setClientes] = useState<ClienteGerencial[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);

  const [filterSafra, setFilterSafra] = useState<number | "">("");
  const [filterGrupo, setFilterGrupo] = useState<number | "">("");
  const [filterProdutor, setFilterProdutor] = useState<number | "">("");
  const [filterFornecedor, setFilterFornecedor] = useState<number | "">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [viewUnit, setViewUnit] = useState<"KG" | "SC">("KG");
  const [sackWeight, setSackWeight] = useState<60 | 40>(60);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContratoVenda | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: "", code: "", grupo_id: "", produtor_id: "", cliente_id: "", safra_id: "", due_date: "", operacao_id: "", status: "pending", notes: "", rows: [{ produto_id: "", unit: "KG", quantity: "0", price: "0", discount: "0" }] });

  const filtered = useMemo(() => contracts.filter((c) => {
    if (filterSafra !== "" && (c.safra?.id ?? null) !== Number(filterSafra)) return false;
    if (filterGrupo !== "" && (c.grupo?.id ?? null) !== Number(filterGrupo)) return false;
    if (filterProdutor !== "" && (c.produtor?.id ?? null) !== Number(filterProdutor)) return false;
    if (filterFornecedor !== "" && (c.cliente?.id ?? null) !== Number(filterFornecedor)) return false;
    if (filterFrom && c.date && c.date < filterFrom) return false;
    if (filterTo && c.date && c.date > filterTo) return false;
    return true;
  }), [contracts, filterSafra, filterGrupo, filterProdutor, filterFornecedor, filterFrom, filterTo]);

  const cards = useMemo(() => {
    const totalValue = filtered.reduce((acc, c) => acc + n(c.total_value), 0);
    const qtyContracts = filtered.length;
    const qtyKg = filtered.reduce((acc, c) => acc + (c.items || []).reduce((s, i) => s + n(i.quantity), 0), 0);
    const sacks = qtyKg / sackWeight;
    const done = filtered.filter((c) => (c.status || "").toLowerCase() === "delivered").length;
    const pending = filtered.filter((c) => (c.status || "").toLowerCase() !== "delivered" && (c.status || "").toLowerCase() !== "canceled").length;
    return { totalValue, qtyContracts, qtyKg, sacks, done, pending };
  }, [filtered, sackWeight]);

  const viewUnitLabel = viewUnit === "KG" ? "KG" : `SC${sackWeight}`;
  function toViewUnit(kgValue: number) {
    if (viewUnit === "KG") return kgValue;
    return kgValue / sackWeight;
  }
  function formatViewUnit(kgValue: number) {
    return `${toViewUnit(kgValue).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${viewUnitLabel}`;
  }
  function formatViewUnitValue(kgValue: number) {
    return toViewUnit(kgValue).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  }

  const chartData = useMemo(() => filtered.slice(0, 10).map((c) => {
    const qty = (c.items || []).reduce((acc, i) => acc + n(i.quantity), 0);
    const delivered = (c.items || []).reduce((acc, i) => acc + n(i.delivered_quantity), 0);
    return {
      code: c.code || `#${c.id}`,
      qty,
      delivered,
      cliente: c.cliente?.name ?? "-",
      produtor: c.produtor?.name ?? "-"
    };
  }), [filtered]);

  const totalForm = useMemo(() => form.rows.reduce((acc, r) => Math.max(0, acc + (n(r.quantity) * n(r.price) - n(r.discount))), 0), [form.rows]);

  useEffect(() => { void refresh(); }, []);
  async function refresh() {
    const token = getAccessToken(); if (!token) return;
    setLoading(true); setError("");
    try {
      const [a, b, c, d, e, f, g] = await Promise.all([listContratosVenda(token), listGruposProdutores(token), listProdutores(token), listClientesGerencial(token), listSafras(token), listOperacoes(token), listProdutosEstoque(token)]);
      setContracts(a); setGrupos(b); setProdutores(c); setClientes(d); setSafras(e); setOperacoes(f); setProdutos(g);
    } catch (err) {
      if (isApiError(err) && err.status === 401) { window.location.href = "/login"; return; }
      setError(err instanceof Error ? err.message : "Falha ao carregar contratos.");
    } finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ date: "", code: "", grupo_id: "", produtor_id: "", cliente_id: "", safra_id: "", due_date: "", operacao_id: "", status: "pending", notes: "", rows: [{ produto_id: "", unit: "KG", quantity: "0", price: "0", discount: "0" }] });
    setOpen(true);
  }
  function openEdit(c: ContratoVenda) {
    setEditing(c);
    setForm({ date: c.date ?? "", code: c.code ?? "", grupo_id: String(c.grupo?.id ?? ""), produtor_id: String(c.produtor?.id ?? ""), cliente_id: String(c.cliente?.id ?? ""), safra_id: String(c.safra?.id ?? ""), due_date: c.due_date ?? "", operacao_id: String(c.operacao?.id ?? ""), status: ["pending", "delivered", "canceled"].includes((c.status || "").toLowerCase()) ? c.status : "pending", notes: c.notes ?? "", rows: (c.items || []).map((r) => ({ produto_id: String(r.produto?.id ?? ""), unit: r.unit || "KG", quantity: String(r.quantity ?? "0"), price: String(r.price ?? "0"), discount: String(r.discount ?? "0") })) });
    setOpen(true);
  }

  async function save() {
    const token = getAccessToken(); if (!token) return;
    if (!window.confirm(editing ? "Confirmar edição do contrato?" : "Confirmar novo contrato?")) return;
    setSaving(true);
    try {
      const payload = { date: form.date || null, code: form.code.trim(), grupo_id: form.grupo_id ? Number(form.grupo_id) : null, produtor_id: form.produtor_id ? Number(form.produtor_id) : null, cliente_id: form.cliente_id ? Number(form.cliente_id) : null, safra_id: form.safra_id ? Number(form.safra_id) : null, due_date: form.due_date || null, operacao_id: form.operacao_id ? Number(form.operacao_id) : null, status: form.status, notes: form.notes, items: form.rows.map((r) => ({ produto_id: r.produto_id ? Number(r.produto_id) : null, unit: r.unit, quantity: toApiDecimal(r.quantity), price: toApiDecimal(r.price), discount: toApiDecimal(r.discount) })) };
      if (editing) await updateContratoVenda(token, editing.id, payload); else await createContratoVenda(token, payload);
      setOpen(false); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao salvar contrato."); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    const token = getAccessToken(); if (!token) return;
    if (!window.confirm("Excluir este contrato?")) return;
    try { await deleteContratoVenda(token, id); await refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Falha ao excluir contrato."); }
  }

  function reportResumo() {
    const total = filtered.reduce((acc, c) => acc + n(c.total_value), 0);
    const kg = filtered.reduce((acc, c) => acc + (c.items || []).reduce((s, i) => s + n(i.quantity), 0), 0);
    openPrintHtml("Resumo de Contratos", `<h1>Relatório resumo de contratos</h1><div class="kpi"><div class="card"><div class="label">Contratos</div><div class="value">${filtered.length}</div></div><div class="card"><div class="label">Valor total</div><div class="value">${brMoney(total)}</div></div><div class="card"><div class="label">Quantidade KG</div><div class="value">${kg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div></div><div class="card"><div class="label">Sacas 60KG</div><div class="value">${(kg / 60).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div></div></div><table><thead><tr><th>Status</th><th>Data</th><th>Contrato</th><th>Cliente</th><th>Produtor</th><th>Venc.</th><th class="num">Quantidade</th><th class="num">Preço médio</th><th class="num">Valor</th></tr></thead><tbody>${filtered.map((c) => { const qty = (c.items || []).reduce((a, i) => a + n(i.quantity), 0); const avgPrice = qty > 0 ? n(c.total_value) / qty : 0; return `<tr><td>${escapeHtml(statusLabel(c.status))}</td><td>${escapeHtml(d(c.date))}</td><td>${escapeHtml(c.code || `#${c.id}`)}</td><td>${escapeHtml(c.cliente?.name ?? "-")}</td><td>${escapeHtml(c.produtor?.name ?? "-")}</td><td>${escapeHtml(d(c.due_date))}</td><td class="num">${qty.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${brMoney(avgPrice)}</td><td class="num">${brMoney(n(c.total_value))}</td></tr>`; }).join("") || '<tr><td colspan="9">Sem dados.</td></tr>'}</tbody></table>`, "landscape");
  }

  function reportAnalitico() {
    const groups = new Map<string, ContratoVenda[]>();
    for (const c of filtered) {
      const key = `${c.safra?.name ?? "SEM SAFRA"}__${c.grupo?.name ?? "SEM GRUPO"}__${c.produtor?.name ?? "SEM PRODUTOR"}`;
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    const htmlGroups = [...groups.entries()].map(([key, arr]) => {
      const [safra, grupo, produtor] = key.split("__");
      const total = arr.reduce((acc, c) => acc + n(c.total_value), 0);
      const rows = arr.map((c) => { const qty = (c.items || []).reduce((a, i) => a + n(i.quantity), 0); const avgPrice = qty > 0 ? n(c.total_value) / qty : 0; return `<tr><td>${escapeHtml(statusLabel(c.status))}</td><td>${escapeHtml(c.code || `#${c.id}`)}</td><td>${escapeHtml(c.cliente?.name ?? "-")}</td><td>${escapeHtml(d(c.date))}</td><td>${escapeHtml(d(c.due_date))}</td><td class="num">${qty.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${brMoney(avgPrice)}</td><td class="num">${brMoney(n(c.total_value))}</td></tr>`; }).join("");
      return `<section class="group"><h3>${escapeHtml(safra)} · ${escapeHtml(grupo)} · ${escapeHtml(produtor)}</h3><div class="kpi"><div class="card"><div class="label">Contratos</div><div class="value">${arr.length}</div></div><div class="card"><div class="label">Valor total</div><div class="value">${brMoney(total)}</div></div></div><table><thead><tr><th>Status</th><th>Contrato</th><th>Cliente</th><th>Data</th><th>Venc.</th><th class="num">Quantidade</th><th class="num">Preço médio</th><th class="num">Valor</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    }).join("");
    openPrintHtml("Analítico de Contratos", `<h1>Relatório analítico de contratos</h1>${htmlGroups || '<p>Sem dados.</p>'}`, "landscape");
  }

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Produção</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Contratos</h1>
            <p className="mt-1 text-sm text-zinc-300">Contrato de venda com geração automática em Contas a Receber.</p>
          </div>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-emerald-400/80 shadow-[0_0_0_4px_rgba(16,185,129,0.16)]" />
                  <select value={filterSafra} onChange={(e) => setFilterSafra(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-[200px] rounded-2xl border border-accent-500/40 bg-accent-500/15 pl-8 pr-8 py-2 text-[13px] font-semibold text-zinc-100 outline-none focus:border-accent-400">
                    <option value="" style={optionStyle}>Selecione a safra</option>
                    {safras.map((s) => (<option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>))}
                  </select>
                </div>
                <select value={viewUnit} onChange={(e) => setViewUnit(e.target.value as "KG" | "SC")} className="min-w-[112px] rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-[13px] font-semibold text-zinc-100 outline-none focus:border-white/30">
                  <option value="KG" style={optionStyle}>KG</option>
                  <option value="SC" style={optionStyle}>Sacas</option>
                </select>
                <select value={String(sackWeight)} onChange={(e) => setSackWeight(Number(e.target.value) as 60 | 40)} disabled={viewUnit !== "SC"} className="min-w-[132px] rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-[13px] font-semibold text-zinc-100 outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="60" style={optionStyle}>Saca 60</option>
                  <option value="40" style={optionStyle}>Saca 40</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
              <button onClick={reportResumo} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-[13px] font-black text-zinc-100 hover:bg-white/10">Relatório resumido</button>
              <button onClick={reportAnalitico} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-[13px] font-black text-zinc-100 hover:bg-white/10">Relatório analítico</button>
              <button onClick={openCreate} className="rounded-2xl bg-accent-500 px-4 py-2 text-[13px] font-black text-zinc-950 hover:bg-accent-400">Novo contrato</button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3.5">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
              <select value={filterGrupo} onChange={(e) => setFilterGrupo(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-0 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"><option value="" style={optionStyle}>Grupo</option>{grupos.map((g) => <option key={g.id} value={g.id} style={optionStyle}>{g.name}</option>)}</select>
              <select value={filterProdutor} onChange={(e) => setFilterProdutor(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-0 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"><option value="" style={optionStyle}>Produtor</option>{produtores.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{produtorDisplayLabel(p)}</option>)}</select>
              <select value={filterFornecedor} onChange={(e) => setFilterFornecedor(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-0 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"><option value="" style={optionStyle}>Fornecedor</option>{clientes.map((c) => <option key={c.id} value={c.id} style={optionStyle}>{c.name}</option>)}</select>
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100 [color-scheme:dark]" />
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100 [color-scheme:dark]" />
            </div>
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="flex h-[88px] flex-col items-center justify-center rounded-3xl border border-accent-400/30 bg-accent-500/10 p-3 text-center">
              <p className="min-h-[24px] text-[9px] font-black uppercase tracking-[0.14em] text-zinc-400">Valor total contratos</p>
              <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{brMoney(cards.totalValue)}</p>
            </div>
            <div className="flex h-[88px] flex-col items-center justify-center rounded-3xl border border-white/15 bg-white/5 p-3 text-center">
              <p className="min-h-[24px] text-[9px] font-black uppercase tracking-[0.14em] text-zinc-400">Qtd. de contratos</p>
              <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{formatCompactNumber(cards.qtyContracts)}</p>
            </div>
            <div className="flex h-[88px] flex-col items-center justify-center rounded-3xl border border-sky-400/30 bg-sky-500/10 p-3 text-center">
              <p className="min-h-[24px] text-[9px] font-black uppercase tracking-[0.14em] text-zinc-400">Quantidade ({viewUnitLabel})</p>
              <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{formatViewUnitValue(cards.qtyKg)}</p>
            </div>
            <div className="flex h-[88px] flex-col items-center justify-center rounded-3xl border border-white/15 bg-white/5 p-3 text-center">
              <p className="min-h-[24px] text-[9px] font-black uppercase tracking-[0.14em] text-zinc-400">Nº de contratos</p>
              <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{formatCompactNumber(cards.qtyContracts)}</p>
            </div>
            <div className="flex h-[88px] flex-col items-center justify-center rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-center">
              <p className="min-h-[24px] text-[9px] font-black uppercase tracking-[0.14em] text-zinc-400">Nº contratos cumpridos</p>
              <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{formatCompactNumber(cards.done)}</p>
            </div>
            <div className="flex h-[88px] flex-col items-center justify-center rounded-3xl border border-amber-400/30 bg-amber-500/10 p-3 text-center">
              <p className="min-h-[24px] text-[9px] font-black uppercase tracking-[0.14em] text-zinc-400">Nº contratos pendentes</p>
              <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{formatCompactNumber(cards.pending)}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-3.5">
            <p className="text-[13px] font-black text-white">Quantidade contratada x entregue</p>
            <div className="mt-2.5 overflow-x-auto">
              <div className="min-w-[760px] space-y-2">
                {chartData.map((r) => {
                  const max = Math.max(r.qty, r.delivered, 1);
                  const qtyPct = (r.qty / max) * 100;
                  const delPct = (r.delivered / max) * 100;
                  return <div key={r.code} className="rounded-2xl border border-white/10 bg-zinc-950/30 p-2.5"><p className="mb-1 text-[11px] font-black text-zinc-300">{r.code}</p><p className="mb-2 text-[10px] font-semibold text-zinc-400">{r.cliente} / {r.produtor}</p><div className="space-y-1"><div className="h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-amber-400" style={{ width: `${qtyPct}%` }} /></div><div className="h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-emerald-400" style={{ width: `${delPct}%` }} /></div></div><p className="mt-2 text-[11px] text-zinc-400">Contratada: {formatViewUnit(r.qty)} · Entregue: {formatViewUnit(r.delivered)}</p></div>;
                })}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center justify-between"><p className="text-[13px] font-black text-white">Lista</p><p className="text-[11px] font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} contrato(s)`}</p></div>
            <div className="mt-2.5 overflow-x-auto">
              <div className="hidden min-w-[1480px] grid-cols-[96px_88px_132px_170px_170px_110px_112px_110px_118px_110px] gap-2.5 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 xl:grid"><div>Status</div><div>Data</div><div>Contrato</div><div>Cliente</div><div>Produtor</div><div>Vencimento</div><div>Quantidade</div><div>Preço</div><div>Valor</div><div className="text-right">Ações</div></div>
              <div className="mt-2.5 space-y-2 xl:min-w-[1480px]">
                {filtered.map((c) => {
                  const qty = (c.items || []).reduce((acc, i) => acc + n(i.quantity), 0);
                  const avgPrice = qty > 0 ? n(c.total_value) / qty : 0;
                  const st = statusMeta(c.status);
                  return <div key={c.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2.5"><div className="grid grid-cols-1 gap-2 xl:grid-cols-[96px_88px_132px_170px_170px_110px_112px_110px_118px_110px] xl:items-center xl:gap-2.5"><div><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${st.cls}`}>{st.label}</span></div><div className="text-[12px] text-zinc-100">{d(c.date)}</div><div className="text-[12px] font-black text-zinc-100">{c.code || `#${c.id}`}</div><div className="truncate text-[12px] text-zinc-100">{c.cliente?.name ?? "-"}</div><div className="truncate text-[12px] text-zinc-100">{c.produtor?.name ?? "-"}</div><div className="text-[12px] text-zinc-100">{d(c.due_date)}</div><div className="text-[12px] text-zinc-100">{formatViewUnit(qty)}</div><div className="text-[12px] text-zinc-100">{brMoney(avgPrice)}</div><div className="text-[12px] font-black text-zinc-100">{brMoney(n(c.total_value))}</div><div className="text-right"><div className="flex w-full flex-nowrap justify-end gap-1.5 whitespace-nowrap"><button onClick={() => openEdit(c)} className="rounded-lg border border-sky-400/25 bg-sky-500/10 p-1.5 text-sky-200 hover:bg-sky-500/20" title="Editar" aria-label="Editar"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg></button><button onClick={() => void remove(c.id)} className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-1.5 text-rose-200 hover:bg-rose-500/20" title="Excluir" aria-label="Excluir"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg></button></div></div></div></div>;
                })}
              </div>
            </div>
          </section>

          {open ? <div className="fixed inset-0 z-50 grid place-items-center px-4"><button className="absolute inset-0 bg-zinc-950/60" onClick={() => setOpen(false)} aria-label="Fechar" /><div className="relative w-full max-w-[1200px] rounded-3xl border border-white/15 bg-zinc-900/95 p-5 space-y-4"><p className="text-sm font-black text-white">{editing ? "Editar contrato" : "Novo contrato"}</p><div className="grid gap-3 lg:grid-cols-3"><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data</label><input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" /></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Contrato</label><input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: toUpperText(e.target.value) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Status</label><select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="pending" style={optionStyle}>Pendente</option><option value="delivered" style={optionStyle}>Entregue</option><option value="canceled" style={optionStyle}>Cancelado</option></select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Grupo</label><select value={form.grupo_id} onChange={(e) => setForm((p) => ({ ...p, grupo_id: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{grupos.map((g) => <option key={g.id} value={g.id} style={optionStyle}>{g.name}</option>)}</select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produtor</label><select value={form.produtor_id} onChange={(e) => setForm((p) => ({ ...p, produtor_id: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{produtores.map((x) => <option key={x.id} value={x.id} style={optionStyle}>{produtorDisplayLabel(x)}</option>)}</select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Fornecedor</label><select value={form.cliente_id} onChange={(e) => setForm((p) => ({ ...p, cliente_id: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{clientes.map((x) => <option key={x.id} value={x.id} style={optionStyle}>{x.name}</option>)}</select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Safra</label><select value={form.safra_id} onChange={(e) => setForm((p) => ({ ...p, safra_id: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{safras.map((x) => <option key={x.id} value={x.id} style={optionStyle}>{x.name}</option>)}</select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Vencimento</label><input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" /></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Operação</label><select value={form.operacao_id} onChange={(e) => setForm((p) => ({ ...p, operacao_id: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{operacoes.filter((o) => o.kind === "credit").map((x) => <option key={x.id} value={x.id} style={optionStyle}>{x.name}</option>)}</select></div></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Observação</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div><div className="hidden gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 lg:grid lg:grid-cols-[1.3fr_0.5fr_0.7fr_0.7fr_0.7fr_0.8fr_auto]"><div>Produto</div><div>UN</div><div>Quantidade</div><div>Preço</div><div>Desconto</div><div>Total Item</div><div className="text-center">Remover</div></div><div className="space-y-2">{form.rows.map((r, idx) => { const rowTotal = Math.max(0, n(r.quantity) * n(r.price) - n(r.discount)); return <div key={idx} className="grid gap-2 lg:grid-cols-[1.3fr_0.5fr_0.7fr_0.7fr_0.7fr_0.8fr_auto]"><select aria-label="Produto" value={r.produto_id} onChange={(e) => setForm((p) => ({ ...p, rows: p.rows.map((x, i) => i === idx ? { ...x, produto_id: e.target.value } : x) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Produto</option>{produtos.map((x) => <option key={x.id} value={x.id} style={optionStyle}>{x.name}</option>)}</select><input aria-label="Unidade" value={r.unit} onChange={(e) => setForm((p) => ({ ...p, rows: p.rows.map((x, i) => i === idx ? { ...x, unit: e.target.value } : x) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /><input aria-label="Quantidade" value={r.quantity} onChange={(e) => setForm((p) => ({ ...p, rows: p.rows.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 text-right" /><input aria-label="Preço" value={r.price} onChange={(e) => setForm((p) => ({ ...p, rows: p.rows.map((x, i) => i === idx ? { ...x, price: e.target.value } : x) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 text-right" /><input aria-label="Desconto" value={r.discount} onChange={(e) => setForm((p) => ({ ...p, rows: p.rows.map((x, i) => i === idx ? { ...x, discount: e.target.value } : x) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 text-right" /><input aria-label="Total item" readOnly value={rowTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="rounded-2xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 text-right" /><button type="button" onClick={() => setForm((p) => ({ ...p, rows: p.rows.filter((_, i) => i !== idx) }))} className="rounded-2xl border border-rose-400/25 bg-rose-500/15 px-3 py-2.5 text-sm font-black text-rose-100">x</button></div>; })}</div><div className="flex items-center justify-between"><button type="button" onClick={() => setForm((p) => ({ ...p, rows: [...p.rows, { produto_id: "", unit: "KG", quantity: "0", price: "0", discount: "0" }] }))} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-100">Adicionar item</button><p className="text-sm font-black text-white">Valor total: {brMoney(totalForm)}</p></div><div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Cancelar</button><button onClick={() => void save()} disabled={saving} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100">{saving ? "Salvando..." : "Salvar"}</button></div></div></div> : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}
