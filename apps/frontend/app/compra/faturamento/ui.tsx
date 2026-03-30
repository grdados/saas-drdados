"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { produtorDisplayLabel } from "@/lib/produtorLabel";
import {
  createFaturamentoCompra,
  deleteFaturamentoCompra,
  Deposito,
  FaturamentoCompra,
  isApiError,
  listContasAPagar,
  listDepositos,
  listFaturamentosCompra,
  listFornecedoresGerencial,
  listGruposProdutores,
  listInsumos,
  listPecas,
  listOperacoes,
  listPedidosCompra,
  listProdutores,
  listSafras,
  Operacao,
  Peca,
  PedidoCompra,
  Produtor,
  Safra,
  updateFaturamentoCompra
} from "@/lib/api";
import { APP_LOCALE, formatCurrencyBRL, formatDateBR } from "@/lib/locale";
import { toUpperText } from "@/lib/text";

function toApiDecimal(v: unknown) {
  const raw = String(v ?? "").trim();
  if (!raw) return "0";
  const s = raw.replace(/\s+/g, "");
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) return s.replace(/\./g, "").replace(",", ".");
  if (hasComma) return s.replace(",", ".");
  return s;
}

function parseNumber(v: unknown) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function focusNextInForm(current: HTMLElement) {
  const form = current.closest("form");
  if (!form) return;
  const selectors = "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";
  const fields = Array.from(form.querySelectorAll<HTMLElement>(selectors)).filter((el) => el.tabIndex !== -1);
  const idx = fields.indexOf(current);
  if (idx >= 0 && idx < fields.length - 1) fields[idx + 1].focus();
}

function money(n: number) {
  return formatCurrencyBRL(n);
}
function prettyDateBR(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return value;
  return formatDateBR(dt);
}

type FatStatus = "pending" | "overdue" | "partial" | "paid" | "canceled";

function monthLabel(date: Date) {
  return date.toLocaleDateString(APP_LOCALE, { month: "short", year: "2-digit" }).replace(".", "");
}

function daysUntilDue(dueDate: string | null | undefined) {
  if (!dueDate) return null;
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(dueDate + "T00:00:00");
  const diff = Math.ceil((due.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function resolveFatStatus(fat: FaturamentoCompra, cpStatus?: "open" | "partial" | "paid" | "canceled"): FatStatus {
  if (cpStatus === "paid") return "paid";
  if (cpStatus === "partial") return "partial";
  if (cpStatus === "canceled") return "canceled";
  const s = fat.status as string | undefined;
  if (s === "paid" || s === "partial" || s === "overdue" || s === "pending") return s;
  if (fat.due_date && new Date(fat.due_date) < new Date(new Date().toDateString())) return "overdue";
  return "pending";
}

function fatStatusMeta(status: FatStatus) {
  if (status === "paid") return { label: "Pago", cls: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" };
  if (status === "partial") return { label: "Parcial", cls: "border-sky-400/30 bg-sky-500/15 text-sky-200" };
  if (status === "overdue") return { label: "Vencido", cls: "border-rose-400/30 bg-rose-500/15 text-rose-200" };
  if (status === "canceled") return { label: "Cancelado", cls: "border-zinc-400/30 bg-zinc-500/15 text-zinc-200" };
  return { label: "Pendente", cls: "border-amber-400/30 bg-amber-500/15 text-amber-200" };
}

function CardIcon({
  tone,
  children
}: {
  tone: "amber" | "slate" | "sky" | "emerald" | "rose";
  children: ReactNode;
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-400/35 bg-amber-500/10 text-amber-300"
      : tone === "sky"
      ? "border-sky-400/35 bg-sky-500/10 text-sky-300"
      : tone === "emerald"
      ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-300"
      : tone === "rose"
      ? "border-rose-400/35 bg-rose-500/10 text-rose-300"
      : "border-white/20 bg-white/10 text-zinc-300";
  return <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${toneClass}`}>{children}</div>;
}

function SimpleLineChart({ points }: { points: Array<{ label: string; value: number }> }) {
  const w = 720;
  const h = 170;
  const pad = 22;
  const max = Math.max(1, ...points.map((p) => p.value));

  const chartPoints = points.map((p, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
    const y = pad + (1 - p.value / max) * (h - pad * 2);
    return { ...p, x, y };
  });
  const poly = chartPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
        <defs>
          <linearGradient id="fillA" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(223,152,48,0.22)" />
            <stop offset="1" stopColor="rgba(223,152,48,0)" />
          </linearGradient>
        </defs>
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <line key={t} x1="0" x2={w} y1={h * t} y2={h * t} stroke="rgba(255,255,255,0.06)" />
        ))}
        <polyline points={poly} fill="none" stroke="rgba(223,152,48,0.95)" strokeWidth="3" />
        <polygon points={`${poly} ${w - pad},${h - pad} ${pad},${h - pad}`} fill="url(#fillA)" />
        {chartPoints.map((p) => (
          <g key={`${p.label}-${p.x}`}>
            <circle cx={p.x} cy={p.y} r="5.5" fill="rgba(223,152,48,0.95)" stroke="rgba(24,24,27,1)" strokeWidth="2" />
            <text x={p.x} y={Math.max(14, p.y - 10)} textAnchor="middle" fontSize="11" fontWeight="700" fill="rgba(244,244,245,0.95)">
              {money(p.value)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function BarList({ title, items }: { title: string; items: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
      <p className="text-[13px] font-black text-white">{title}</p>
      <div className="mt-4 space-y-2">
        {items.slice(0, 8).map((it) => (
          <div key={it.label} className="rounded-2xl border border-white/10 bg-zinc-950/35 p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <p className="truncate text-[11px] font-medium text-zinc-100">{it.label}</p>
              <p className="text-[11px] font-semibold text-zinc-100">{money(it.value)}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-accent-500/80" style={{ width: `${Math.round((it.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
        {items.length === 0 ? <p className="text-[11px] text-zinc-400">Sem dados.</p> : null}
      </div>
    </section>
  );
}

export default function FaturamentoCompraPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [safras, setSafras] = useState<Safra[]>([]);
  const [safraId, setSafraId] = useState<number | "">("");

  const [fats, setFats] = useState<FaturamentoCompra[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [grupos, setGrupos] = useState<Array<{ id: number; name: string }>>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [fornecedores, setFornecedores] = useState<Array<{ id: number; name: string }>>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [insumos, setInsumos] = useState<Array<{ id: number; name: string; categoria?: { id: number; name: string } | null }>>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [cpStatusByFatId, setCpStatusByFatId] = useState<Record<number, "open" | "partial" | "paid" | "canceled">>({});

  const [reportGrupoId, setReportGrupoId] = useState<number | "">("");
  const [reportProdutorId, setReportProdutorId] = useState<number | "">("");
  const [reportCategoria, setReportCategoria] = useState("");
  const [reportStatus, setReportStatus] = useState<"all" | FatStatus>("all");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

  const [open, setOpen] = useState(false);
  const [formStep, setFormStep] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formNF, setFormNF] = useState("");
  const [formSafraId, setFormSafraId] = useState<number | "">("");
  const [formGrupoId, setFormGrupoId] = useState<number | "">("");
  const [formProdutorId, setFormProdutorId] = useState<number | "">("");
  const [formPedidoId, setFormPedidoId] = useState<number | "">("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formFornecedorId, setFormFornecedorId] = useState<number | "">("");
  const [formDepositoId, setFormDepositoId] = useState<number | "">("");
  const [formOperacaoId, setFormOperacaoId] = useState<number | "">("");
  const [formPaymentMethod, setFormPaymentMethod] = useState<"pix" | "boleto" | "transfer" | "card" | "cash" | "other">("pix");
  const [rows, setRows] = useState<Array<{ pedido_item_id: number | null; produto_id: number | null; peca_id: number | null; quantity: string; price: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FaturamentoCompra | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const pedidosDaSafra = useMemo(() => {
    if (safraId === "") return pedidos;
    const sid = Number(safraId);
    return pedidos.filter((p) => p.safra?.id === sid);
  }, [pedidos, safraId]);

  const fatsDaSafra = useMemo(() => {
    if (safraId === "") return fats;
    const sid = Number(safraId);
    const pedidoById = new Map(pedidos.map((p) => [p.id, p]));
    return fats.filter((f) => {
      const pid = f.pedido?.id ?? null;
      // Faturamentos sem pedido não carregam safra no payload atual.
      // Mantemos visível para não "sumir" da lista quando o usuário salva.
      if (!pid) return true;
      const p = pedidoById.get(pid);
      // Se o pedido não vier no carregamento ou estiver sem safra, também
      // mantemos visível para evitar falso "sumiço" na tela.
      if (!p || !p.safra?.id) return true;
      return p.safra.id === sid;
    });
  }, [fats, pedidos, safraId]);

  const filtered = useMemo(() => {
    return fatsDaSafra.filter((f) => {
      const st = resolveFatStatus(f, cpStatusByFatId[f.id]);
      if (reportGrupoId !== "" && (f.grupo?.id ?? null) !== Number(reportGrupoId)) return false;
      if (reportProdutorId !== "" && (f.produtor?.id ?? null) !== Number(reportProdutorId)) return false;
      if (reportStatus !== "all" && st !== reportStatus) return false;
      if (reportFrom && f.date && f.date < reportFrom) return false;
      if (reportTo && f.date && f.date > reportTo) return false;
      if (reportCategoria) {
        const hasCategory = (f.items || []).some((it) => {
          const prodId = it.produto?.id ?? null;
          const found = prodId ? insumos.find((x) => x.id === prodId) : null;
          return (found?.categoria?.name ?? "") === reportCategoria;
        });
        if (!hasCategory) return false;
      }
      return true;
    });
  }, [
    fatsDaSafra,
    reportGrupoId,
    reportProdutorId,
    reportStatus,
    reportFrom,
    reportTo,
    reportCategoria,
    cpStatusByFatId,
    insumos
  ]);

  const produtoresDoGrupo = useMemo(() => {
    if (formGrupoId === "") return produtores;
    const gid = Number(formGrupoId);
    return produtores.filter((p) => (p.grupo?.id ?? null) === gid);
  }, [produtores, formGrupoId]);

  const pedidosDaSafraFormulario = useMemo(() => {
    if (formSafraId === "") return pedidos;
    const sid = Number(formSafraId);
    return pedidos.filter((p) => p.safra?.id === sid);
  }, [pedidos, formSafraId]);

  const pedidosDoProdutor = useMemo(() => {
    if (formProdutorId === "") return pedidosDaSafraFormulario;
    const pid = Number(formProdutorId);
    return pedidosDaSafraFormulario.filter((p) => (p.produtor?.id ?? null) === pid);
  }, [pedidosDaSafraFormulario, formProdutorId]);

  const pedidoSelecionado = useMemo(() => {
    if (formPedidoId === "") return null;
    const id = Number(formPedidoId);
    return pedidos.find((p) => p.id === id) ?? null;
  }, [pedidos, formPedidoId]);

  const faturadoPorPedidoItem = useMemo(() => {
    const map = new Map<number, number>();
    for (const fat of fats) {
      if (editingId && fat.id === editingId) continue;
      if ((fat.status || "").toLowerCase() === "canceled") continue;
      for (const it of fat.items || []) {
        const pedidoItemId = it.pedido_item_id ?? null;
        if (!pedidoItemId) continue;
        map.set(pedidoItemId, (map.get(pedidoItemId) ?? 0) + parseNumber(it.quantity));
      }
    }
    return map;
  }, [fats, editingId]);

  const itensPendentes = useMemo(() => {
    const p = pedidoSelecionado;
    if (!p) return [];
    return (p.items || []).map((it) => {
      const qty = parseNumber(it.quantity);
      const billed = faturadoPorPedidoItem.get(it.id) ?? 0;
      const remaining = Math.max(0, qty - billed);
      return { ...it, remaining };
    });
  }, [pedidoSelecionado, faturadoPorPedidoItem]);

  const operacoesDespesa = useMemo(() => {
    return [...operacoes].filter((o) => o.kind === "debit").sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [operacoes]);

  const total = useMemo(() => rows.reduce((acc, r) => acc + Math.max(0, parseNumber(r.quantity) * parseNumber(r.price)), 0), [rows]);

  const reportCategorias = useMemo(() => {
    const s = new Set<string>();
    for (const i of insumos) {
      const name = i.categoria?.name?.trim();
      if (name) s.add(name);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [insumos]);

  const statusCounts = useMemo(() => {
    const acc: Record<FatStatus, number> = { pending: 0, overdue: 0, partial: 0, paid: 0, canceled: 0 };
    for (const f of filtered) {
      acc[resolveFatStatus(f, cpStatusByFatId[f.id])] += 1;
    }
    return acc;
  }, [filtered, cpStatusByFatId]);

  const cards = useMemo(() => {
    const totalFat = filtered.reduce((acc, f) => acc + parseNumber(f.total_value), 0);
    const notas = filtered.length;
    const ticket = notas ? totalFat / notas : 0;
    const pedidosUnicos = new Set(filtered.map((f) => f.pedido?.id).filter(Boolean) as number[]);
    return [
      { label: "Total faturado", value: money(totalFat), note: `${notas} NF(s)`, tone: "border-accent-400/30 bg-accent-500/10", iconTone: "amber" as const },
      { label: "Ticket médio", value: money(ticket), note: "Por nota", tone: "border-sky-400/30 bg-sky-500/10", iconTone: "sky" as const },
      { label: "Pendentes/Vencidos", value: String(statusCounts.pending + statusCounts.overdue), note: "A pagar", tone: "border-rose-400/30 bg-rose-500/10", iconTone: "rose" as const },
      { label: "Pagos", value: String(statusCounts.paid), note: "Liquidados", tone: "border-emerald-400/30 bg-emerald-500/10", iconTone: "emerald" as const },
      { label: "Pedidos", value: String(pedidosUnicos.size), note: "Com faturamento", tone: "border-white/15 bg-white/5", iconTone: "slate" as const }
    ];
  }, [filtered, statusCounts]);

  const temporalPoints = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of filtered) {
      const d = f.date ? new Date(f.date) : null;
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + parseNumber(f.total_value));
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, value]) => {
        const [y, m] = k.split("-");
        return { label: monthLabel(new Date(Number(y), Number(m) - 1, 1)), value };
      });
  }, [filtered]);

  const byFornecedor = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fatsDaSafra) m.set(f.fornecedor?.name ?? "SEM FORNECEDOR", (m.get(f.fornecedor?.name ?? "SEM FORNECEDOR") ?? 0) + parseNumber(f.total_value));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [fatsDaSafra]);

  const byProdutor = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fatsDaSafra) m.set(f.produtor?.name ?? "SEM PRODUTOR", (m.get(f.produtor?.name ?? "SEM PRODUTOR") ?? 0) + parseNumber(f.total_value));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [fatsDaSafra]);

  const byCategoria = useMemo(() => {
    const catByInsumoId = new Map<number, string>();
    for (const i of insumos) catByInsumoId.set(i.id, i.categoria?.name ?? "SEM CATEGORIA");
    const m = new Map<string, number>();
    for (const f of fatsDaSafra) {
      for (const it of f.items || []) {
        const pid = it.produto?.id ?? null;
        const cat = pid ? catByInsumoId.get(pid) ?? "SEM CATEGORIA" : "SEM CATEGORIA";
        m.set(cat, (m.get(cat) ?? 0) + parseNumber(it.total_item));
      }
    }
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [fatsDaSafra, insumos]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const [sf, fat, ped, grp, pro, forn, dep, ope, ins, pcs, cpa] = await Promise.all([
        listSafras(token),
        listFaturamentosCompra(token),
        listPedidosCompra(token),
        listGruposProdutores(token),
        listProdutores(token),
        listFornecedoresGerencial(token),
        listDepositos(token),
        listOperacoes(token),
        listInsumos(token),
        listPecas(token),
        listContasAPagar(token)
      ]);
      setSafras(sf);
      setFats(fat);
      setPedidos(ped);
      setGrupos(grp);
      setProdutores(pro);
      setFornecedores(forn);
      setDepositos(dep);
      setOperacoes(ope);
      setInsumos(ins as unknown as typeof insumos);
      setPecas(pcs);
      const statusMap: Record<number, "open" | "partial" | "paid" | "canceled"> = {};
      for (const cp of cpa) {
        if (cp.faturamento?.id) {
          statusMap[cp.faturamento.id] = cp.status as "open" | "partial" | "paid" | "canceled";
        }
      }
      setCpStatusByFatId(statusMap);
      // Mantém "todas as safras" por padrão para não esconder
      // faturamentos sem vínculo de pedido.
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao carregar faturamento.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPickPedido(nextId: number | "") {
    setFormPedidoId(nextId);
    const p = nextId === "" ? null : pedidos.find((x) => x.id === nextId) ?? null;
    if (!p) return;
    setFormDueDate(p.due_date ?? "");
    setFormFornecedorId(p.fornecedor?.id ?? "");
    setFormDepositoId("");
    setFormOperacaoId(p.operacao?.id ?? "");
    setFormSafraId(p.safra?.id ?? "");
    setFormGrupoId(p.grupo?.id ?? "");
    setFormProdutorId(p.produtor?.id ?? "");
    setRows([{ pedido_item_id: null, produto_id: null, peca_id: null, quantity: "0", price: "0" }]);
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        date: formDate || null,
        invoice_number: formNF.trim(),
        grupo_id: formGrupoId === "" ? null : Number(formGrupoId),
        produtor_id: formProdutorId === "" ? null : Number(formProdutorId),
        pedido_id: formPedidoId === "" ? null : Number(formPedidoId),
        fornecedor_id: formFornecedorId === "" ? null : Number(formFornecedorId),
        deposito_id: formDepositoId === "" ? null : Number(formDepositoId),
        operacao_id: formOperacaoId === "" ? null : Number(formOperacaoId),
        payment_method: formPaymentMethod,
        due_date: formDueDate || null,
        items: rows.map((r) => ({
          pedido_item_id: r.pedido_item_id,
          produto_id: r.produto_id,
          peca_id: r.peca_id,
          quantity: toApiDecimal(r.quantity),
          price: toApiDecimal(r.price)
        }))
      };
      const res = editingId
        ? await updateFaturamentoCompra(token, editingId, payload)
        : await createFaturamentoCompra(token, payload);
      if (editingId) setFats((prev) => prev.map((x) => (x.id === editingId ? res : x)));
      else setFats((prev) => [res, ...prev]);
      setOpen(false);
      setFormStep(0);
      setEditingId(null);
      await refresh();
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setSaveMessage(err instanceof Error ? err.message : "Falha ao salvar faturamento.");
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setSaveConfirmOpen(false);
    setOpen(true);
    setFormStep(0);
    setFormDate("");
    setFormNF("");
    setFormSafraId(safraId === "" ? "" : Number(safraId));
    setFormGrupoId("");
    setFormProdutorId("");
    setFormPedidoId("");
    setFormDueDate("");
    setFormFornecedorId("");
    setFormDepositoId("");
    setFormOperacaoId("");
    setFormPaymentMethod("pix");
    setRows([{ pedido_item_id: null, produto_id: null, peca_id: null, quantity: "0", price: "0" }]);
  }

  function openEdit(f: FaturamentoCompra) {
    setSaveConfirmOpen(false);
    setEditingId(f.id);
    setOpen(true);
    setFormStep(0);
    setFormDate(f.date ?? "");
    setFormNF(f.invoice_number ?? "");
    setFormSafraId(f.pedido?.id ? (pedidos.find((p) => p.id === f.pedido?.id)?.safra?.id ?? "") : "");
    setFormGrupoId(f.grupo?.id ?? "");
    setFormProdutorId(f.produtor?.id ?? "");
    setFormPedidoId(f.pedido?.id ?? "");
    setFormDueDate(f.due_date ?? "");
    setFormFornecedorId(f.fornecedor?.id ?? "");
    setFormDepositoId(f.deposito?.id ?? "");
    setFormOperacaoId(f.operacao?.id ?? "");
    setFormPaymentMethod((f.payment_method as typeof formPaymentMethod) ?? "pix");
    setRows(
      (f.items || []).map((it) => ({
        pedido_item_id: (it as unknown as { pedido_item_id?: number | null }).pedido_item_id ?? null,
        produto_id: (it as unknown as { produto_id?: number | null }).produto_id ?? null,
        peca_id: (it as unknown as { peca_id?: number | null }).peca_id ?? null,
        quantity: String(it.quantity ?? "0"),
        price: String(it.price ?? "0")
      }))
    );
    if ((f.items || []).length === 0) setRows([{ pedido_item_id: null, produto_id: null, peca_id: null, quantity: "0", price: "0" }]);
  }

  async function onDelete(id: number) {
    const token = getAccessToken();
    if (!token) return;
    const fat = deleteTarget ?? fats.find((x) => x.id === id) ?? null;
    if (fat) {
      const status = resolveFatStatus(fat, cpStatusByFatId[id]);
      if (status === "paid" || status === "partial") {
        window.alert("Não é possível excluir um faturamento com pagamento registrado. Estorne o pagamento em Contas a Pagar e tente novamente.");
        return;
      }
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteFaturamentoCompra(token, id);
      setFats((prev) => prev.filter((x) => x.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao excluir faturamento.";
      setDeleteError(message);
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function openPrintHtml(title: string, htmlBody: string, orientation: "portrait" | "landscape" = "landscape") {
    const generatedAt = new Date().toLocaleString("pt-BR");
    const logoUrl = `${window.location.origin}/logo_horizontal.png`;
    const html = `
      <!doctype html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4 ${orientation}; margin: 12mm 10mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #111; background: #fff; }
          .page { padding: 14px 10px 10px; }
          .header {
            display: grid;
            grid-template-columns: 260px 1fr;
            gap: 12px;
            align-items: center;
            border: 1px solid #e4e4e7;
            border-radius: 10px;
            padding: 8px 10px;
            margin-bottom: 12px;
          }
          .logo-wrap { display: flex; align-items: center; }
          .logo-wrap img { max-height: 52px; width: auto; object-fit: contain; }
          .header-info { text-align: right; }
          .header-title { margin: 0; font-size: 18px; font-weight: 800; }
          .header-meta { margin-top: 4px; color: #52525b; font-size: 11px; line-height: 1.4; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          .muted { color: #555; font-size: 12px; }
          .group { border: 1px solid #d7d7d7; border-radius: 10px; padding: 10px; margin-top: 12px; }
          .group h3 { margin: 0 0 8px; font-size: 15px; }
          .kpi { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
          .card { border: 1px solid #e2e2e2; border-radius: 8px; padding: 8px; }
          .label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
          .value { margin-top: 4px; font-size: 18px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #e2e2e2; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #f7f7f7; }
          td.num, th.num { text-align: right; }
          .footer {
            margin-top: 16px;
            border-top: 1px solid #e4e4e7;
            padding-top: 8px;
            color: #52525b;
            font-size: 11px;
            line-height: 1.45;
          }
          @media print {
            .page { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <header class="header">
            <div class="logo-wrap">
              <img src="${logoUrl}" alt="GR Dados" />
            </div>
            <div class="header-info">
              <p class="header-title">${escapeHtml(title)}</p>
              <div class="header-meta">
                Cliente: GR Dados Demo<br/>
                Emissão: ${generatedAt}
              </div>
            </div>
          </header>
          ${htmlBody}
          <footer class="footer">
            <strong>GR Dados</strong> · Todos os direitos reservados<br/>
            AV 22 de Abril, 519 - Centro - Laguna Carapã - MS · CEP 79920-000<br/>
            Contato: (67) 99869-8159
          </footer>
        </div>
      </body>
      </html>
    `;
    try {
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
    } catch {
      // noop
    }
  }

  function openResumoReport() {
    const pedidoById = new Map(pedidos.map((p) => [p.id, p]));
    const insumoById = new Map(insumos.map((i) => [i.id, i]));
    type GroupSummary = {
      safra: string;
      categoria: string;
      vencimento: string;
      notas: number;
      totalFaturado: number;
      totalPago: number;
      saldoPagar: number;
    };
    const map = new Map<string, GroupSummary>();
    for (const f of filtered) {
      const pedidoRef = (f.pedido?.id ? pedidoById.get(f.pedido.id) : null) ?? null;
      const safra = pedidoRef?.safra?.name ?? "SEM SAFRA";
      const totalFaturado = parseNumber(f.total_value);
      const cp = (f as unknown as { conta_pagar?: { paid_amount?: string | number; amount?: string | number } | null }).conta_pagar;
      const paidAmount = parseNumber(cp?.paid_amount ?? 0);
      const saldo = Math.max(0, totalFaturado - paidAmount);
      const dueDateRaw = f.due_date ?? "";
      const vencimento = prettyDateBR(dueDateRaw) || "-";

      const categories = new Set<string>();
      for (const it of f.items || []) {
        const pid = it.produto?.id ?? null;
        const found = pid ? insumoById.get(pid) : null;
        const cat = found?.categoria?.name?.trim();
        if (cat) categories.add(cat);
      }
      if (categories.size === 0) categories.add("SEM CATEGORIA");

      const perCategoryFaturado = totalFaturado / categories.size;
      const perCategoryPago = paidAmount / categories.size;
      const perCategorySaldo = saldo / categories.size;

      for (const categoria of categories) {
        const key = `${safra}__${categoria}__${dueDateRaw || "SEM_VENCIMENTO"}`;
        const curr = map.get(key) ?? { safra, categoria, vencimento, notas: 0, totalFaturado: 0, totalPago: 0, saldoPagar: 0 };
        curr.notas += 1;
        curr.totalFaturado += perCategoryFaturado;
        curr.totalPago += perCategoryPago;
        curr.saldoPagar += perCategorySaldo;
        map.set(key, curr);
      }
    }
    const groups = [...map.values()].sort((a, b) =>
      `${a.safra}|${a.categoria}|${a.vencimento}`.localeCompare(`${b.safra}|${b.categoria}|${b.vencimento}`, "pt-BR")
    );
    const totalFat = groups.reduce((acc, g) => acc + g.totalFaturado, 0);
    const totalPago = groups.reduce((acc, g) => acc + g.totalPago, 0);
    const totalSaldo = groups.reduce((acc, g) => acc + g.saldoPagar, 0);
    const rows = groups
      .map(
        (g) => `
          <tr>
            <td>${escapeHtml(g.safra)}</td>
            <td>${escapeHtml(g.categoria)}</td>
            <td>${escapeHtml(g.vencimento)}</td>
            <td class="num">${g.notas}</td>
            <td class="num">${money(g.totalFaturado)}</td>
            <td class="num">${money(g.totalPago)}</td>
            <td class="num">${money(g.saldoPagar)}</td>
          </tr>
        `
      )
      .join("");

    openPrintHtml(
      "Resumo de Faturamento",
      `
        <h1>Relatório Resumo de Faturamento</h1>
        <p class="muted">Agrupado por Safra, Categoria e Vencimento · Gerado em ${new Date().toLocaleString("pt-BR")}</p>
        <div class="kpi" style="margin-top:12px">
          <div class="card"><div class="label">Notas fiscais</div><div class="value">${filtered.length}</div></div>
          <div class="card"><div class="label">Total faturado</div><div class="value">${money(totalFat)}</div></div>
          <div class="card"><div class="label">Total pago</div><div class="value">${money(totalPago)}</div></div>
          <div class="card"><div class="label">Saldo a pagar</div><div class="value">${money(totalSaldo)}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Safra</th>
              <th>Categoria</th>
              <th>Vencimento</th>
              <th class="num">NFs</th>
              <th class="num">Total faturado</th>
              <th class="num">Total pago</th>
              <th class="num">Saldo a pagar</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="8">Sem dados para os filtros selecionados.</td></tr>'}</tbody>
        </table>
      `,
      "portrait"
    );
  }

  function openAnaliticoReport() {
    const pedidoById = new Map(pedidos.map((p) => [p.id, p]));
    const insumoById = new Map(insumos.map((i) => [i.id, i]));
    type GroupAnalitico = {
      safra: string;
      grupo: string;
      produtor: string;
      docs: Array<{
        nf: string;
        data: string;
        venc: string;
        vencSort: string;
        pedido: string;
        fornecedor: string;
        status: string;
        produto: string;
        quantidade: number;
        preco: number;
        totalItem: number;
        valor: number;
      }>;
    };
    const map = new Map<string, GroupAnalitico>();
    for (const f of filtered) {
      const pedidoRef = (f.pedido?.id ? pedidoById.get(f.pedido.id) : null) ?? null;
      const safra = pedidoRef?.safra?.name ?? "SEM SAFRA";
      const grupo = f.grupo?.name ?? "SEM GRUPO";
      const produtor = f.produtor?.name ?? "SEM PRODUTOR";
      const key = `${safra}__${grupo}__${produtor}`;
      const status = fatStatusMeta(resolveFatStatus(f, cpStatusByFatId[f.id])).label;
      const group = map.get(key) ?? { safra, grupo, produtor, docs: [] };
      for (const it of f.items || []) {
        const prodId = it.produto?.id ?? null;
        const found = prodId ? insumoById.get(prodId) : null;
        const quantidade = parseNumber(it.quantity);
        const preco = parseNumber(it.price);
        const totalItem = Math.max(0, quantidade * preco);
        group.docs.push({
          nf: f.invoice_number || `NF-${f.id}`,
          data: prettyDateBR(f.date),
          venc: prettyDateBR(f.due_date),
          vencSort: f.due_date ?? "",
          pedido: f.pedido?.code ?? "-",
          fornecedor: f.fornecedor?.name ?? "-",
          status,
          produto: found?.name ?? it.produto?.name ?? "PRODUTO",
          quantidade,
          preco,
          totalItem,
          valor: parseNumber(f.total_value)
        });
      }
      map.set(key, group);
    }
    const groups = [...map.values()].sort((a, b) =>
      `${a.safra}|${a.grupo}|${a.produtor}`.localeCompare(`${b.safra}|${b.grupo}|${b.produtor}`, "pt-BR")
    );
    const htmlGroups = groups
      .map((g) => {
        const total = g.docs.reduce((acc, d) => acc + d.valor, 0);
        const docsByVenc = [...g.docs].sort((a, b) => a.vencSort.localeCompare(b.vencSort));
        const rows = docsByVenc
          .map(
            (d) => `
              <tr>
                <td>${escapeHtml(d.nf)}</td>
                <td>${escapeHtml(d.data)}</td>
                <td>${escapeHtml(d.venc)}</td>
                <td>${escapeHtml(d.pedido)}</td>
                <td>${escapeHtml(d.fornecedor)}</td>
                <td>${escapeHtml(d.status)}</td>
                <td>${escapeHtml(d.produto)}</td>
                <td class="num">${d.preco.toLocaleString("pt-BR", { minimumFractionDigits: 5, maximumFractionDigits: 5 })}</td>
                <td class="num">${d.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                <td class="num">${money(d.totalItem)}</td>
              </tr>
            `
          )
          .join("");
        return `
          <section class="group">
            <h3>${escapeHtml(g.safra)} · ${escapeHtml(g.grupo)} · ${escapeHtml(g.produtor)}</h3>
            <div class="kpi">
              <div class="card"><div class="label">NFs</div><div class="value">${g.docs.length}</div></div>
              <div class="card"><div class="label">Total faturado</div><div class="value">${money(total)}</div></div>
              <div class="card"><div class="label">Produtor</div><div class="value" style="font-size:16px">${escapeHtml(g.produtor)}</div></div>
              <div class="card"><div class="label">Grupo</div><div class="value" style="font-size:16px">${escapeHtml(g.grupo)}</div></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nota fiscal</th>
                  <th>Data</th>
                  <th>Vencimento</th>
                  <th>Pedido</th>
                  <th>Fornecedor</th>
                  <th>Status</th>
                  <th>Produto</th>
                  <th class="num">Preço</th>
                  <th class="num">Quantidade</th>
                  <th class="num">Total item</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>
        `;
      })
      .join("");
    openPrintHtml(
      "Analítico de Faturamento",
      `
        <h1>Relatório Analítico de Faturamento</h1>
        <p class="muted">Agrupado por Safra, Grupo, Produtor e Vencimento · Gerado em ${new Date().toLocaleString("pt-BR")}</p>
        ${htmlGroups || '<p class="muted">Sem dados para os filtros selecionados.</p>'}
      `
    );
  }

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-5">
          <section className="grid gap-3 xl:grid-cols-[minmax(0,420px)_1fr] xl:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Compra</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Faturamento</h1>
              <p className="mt-1 text-sm text-zinc-300">Nota fiscal de recebimento + geração automática em Contas a Pagar.</p>
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-2.5">
                <div className="flex h-full flex-col justify-between gap-1.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Filtros</p>
                  <div className="relative w-full">
                    <span className="pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.16)] animate-pulse" />
                    <select value={safraId} onChange={(e) => setSafraId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-accent-500/40 bg-accent-500/15 pl-8 pr-3 py-1.5 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-400">
                      <option value="" style={optionStyle}>Safra</option>
                      {safras.map((s) => (
                        <option key={s.id} value={s.id} style={optionStyle}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-2.5">
                <div className="flex h-full flex-col justify-between gap-1.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Relatórios</p>
                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    <button onClick={openResumoReport} className="min-h-[36px] rounded-2xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-zinc-100 hover:bg-white/10">Resumo</button>
                    <button onClick={openAnaliticoReport} className="min-h-[36px] rounded-2xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-zinc-100 hover:bg-white/10">Analítico</button>
                    <button onClick={openCreate} className="min-h-[36px] rounded-2xl bg-accent-500 px-3.5 py-1.5 text-[12px] font-black text-zinc-950 hover:bg-accent-400">Novo faturamento</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {error ? <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}

          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <select value={reportGrupoId} onChange={(e) => setReportGrupoId(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-[126px] flex-1 rounded-2xl border border-white/15 bg-zinc-950/40 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={optionStyle}>Grupo</option>
                {grupos.map((g) => (<option key={g.id} value={g.id} style={optionStyle}>{g.name}</option>))}
              </select>
              <select value={reportProdutorId} onChange={(e) => setReportProdutorId(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-[126px] flex-1 rounded-2xl border border-white/15 bg-zinc-950/40 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={optionStyle}>Produtor</option>
                {produtores.map((p) => (<option key={p.id} value={p.id} style={optionStyle}>{produtorDisplayLabel(p)}</option>))}
              </select>
              <select value={reportCategoria} onChange={(e) => setReportCategoria(e.target.value)} className="min-w-[126px] flex-1 rounded-2xl border border-white/15 bg-zinc-950/40 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={optionStyle}>Categoria</option>
                {reportCategorias.map((c) => (<option key={c} value={c} style={optionStyle}>{c}</option>))}
              </select>
              <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value as typeof reportStatus)} className="min-w-[126px] flex-1 rounded-2xl border border-white/15 bg-zinc-950/40 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="all" style={optionStyle}>Status (todos)</option>
                <option value="pending" style={optionStyle}>Pendente</option>
                <option value="overdue" style={optionStyle}>Vencido</option>
                <option value="partial" style={optionStyle}>Parcial</option>
                <option value="paid" style={optionStyle}>Pago</option>
              </select>
              <div className="flex min-w-[260px] flex-1 gap-2">
                <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="w-full rounded-2xl border border-white/15 bg-zinc-950/40 px-3 py-1.5 text-[11px] text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
                <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="w-full rounded-2xl border border-white/15 bg-zinc-950/40 px-3 py-1.5 text-[11px] text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((c) => (
              <div key={c.label} className={`flex h-[88px] items-center gap-3 rounded-3xl border p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] ${c.tone}`}>
                <CardIcon tone={c.iconTone}>
                  {c.label === "Total faturado" ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22" /><path d="M17 5.5c0-1.7-2.2-3-5-3s-5 1.3-5 3 2.2 3 5 3 5 1.3 5 3-2.2 3-5 3-5-1.3-5-3" /></svg>
                  ) : c.label === "Ticket médio" ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v14H3z" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
                  ) : c.label === "Pagos" ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 13 4 4L19 7" /></svg>
                  ) : c.label === "Pendentes/Vencidos" ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.5 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0z" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h10M4 17h16" /></svg>
                  )}
                </CardIcon>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{c.label}</p>
                  <p className="mt-1.5 truncate text-[16px] font-black leading-tight text-white">{c.value}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-zinc-300">{c.note}</p>
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">Faturamento por período</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {(() => {
                    const s = safras.find((x) => x.id === (safraId === "" ? -1 : Number(safraId)));
                    if (!s) return "Selecione uma safra para visualizar o período.";
                    return `Safra: ${s.name} (${s.start_date ?? "-"} a ${s.end_date ?? "-"})`;
                  })()}
                </p>
              </div>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} NF(s)`}</div>
            </div>
            <div className="mt-4">
              <SimpleLineChart points={temporalPoints} />
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <BarList title="Por categoria" items={byCategoria} />
            <BarList title="Por fornecedor" items={byFornecedor} />
            <BarList title="Por produtor" items={byProdutor} />
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-black text-white">Notas fiscais</p>
              <p className="text-[11px] font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
            </div>
            <div className="mt-3 overflow-x-auto">
              <div className="hidden min-w-[1180px] grid-cols-[78px_74px_84px_84px_80px_66px_112px_112px_72px_74px_78px_92px_78px] gap-1.5 rounded-2xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 xl:grid">
                <div>Status</div>
                <div>Data</div>
                <div>Nota Fiscal</div>
                <div>Venc.</div>
                <div>Grupo</div>
                <div>Dias</div>
                <div>Produtor</div>
                <div>Fornecedor</div>
                <div>Pedido</div>
                <div className="text-right">Qtd.</div>
                <div className="text-right">Preço</div>
                <div className="text-right">Valor</div>
                <div className="text-right">Ações</div>
              </div>
              <div className="mt-3 space-y-2">
              {filtered.map((f) => {
                const fatStatus = resolveFatStatus(f, cpStatusByFatId[f.id]);
                const hasPayment = fatStatus === "paid" || fatStatus === "partial";
                return (
                <div key={f.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2.5 hover:bg-white/5">
                  <div className="grid xl:min-w-[1180px] grid-cols-1 gap-1.5 xl:grid-cols-[78px_74px_84px_84px_80px_66px_112px_112px_72px_74px_78px_92px_78px] xl:items-center xl:gap-1.5">
                    <div>
                      {(() => {
                        const meta = fatStatusMeta(fatStatus);
                        return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${meta.cls}`}>{meta.label}</span>;
                      })()}
                    </div>
                    <div><p className="text-[11px] font-medium text-zinc-100">{prettyDateBR(f.date)}</p></div>
                    <div><p className="truncate text-[11px] font-medium text-white">{f.invoice_number || `#${f.id}`}</p></div>
                    <div><p className="truncate text-[11px] font-medium text-zinc-100">{prettyDateBR(f.due_date)}</p></div>
                    <div><p className="truncate text-[11px] font-medium text-zinc-100">{f.grupo?.name ?? "-"}</p></div>
                    <div>
                      {(() => {
                        const d = daysUntilDue(f.due_date);
                        if (d === null) return <p className="text-[11px] font-medium text-zinc-400">-</p>;
                        const cls = d < 0 ? "text-rose-300" : d <= 5 ? "text-amber-300" : "text-emerald-300";
                        return <p className={`text-[11px] font-medium ${cls}`}>{d < 0 ? `${Math.abs(d)} atras.` : `${d} dia(s)`}</p>;
                      })()}
                    </div>
                    <div><p className="truncate text-[11px] font-medium text-zinc-100">{f.produtor?.name ?? "-"}</p></div>
                    <div><p className="truncate text-[11px] font-medium text-zinc-100">{f.fornecedor?.name ?? "-"}</p></div>
                    <div><p className="text-[11px] font-medium text-zinc-100">{f.pedido?.code ?? "-"}</p></div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-zinc-100">
                        {(f.items || []).reduce((acc, it) => acc + parseNumber(it.quantity), 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const qty = (f.items || []).reduce((acc, it) => acc + parseNumber(it.quantity), 0);
                        const price = qty > 0 ? parseNumber(f.total_value) / qty : 0;
                        return (
                          <p className="text-[11px] font-medium text-zinc-100">
                            {price.toLocaleString("pt-BR", { minimumFractionDigits: 5, maximumFractionDigits: 5 })}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-zinc-100">
                        {parseNumber(f.total_value).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right">
                      <div className="inline-flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
                        <button
                          onClick={() => openEdit(f)}
                          className="rounded-lg border border-sky-400/25 bg-sky-500/10 p-1.5 text-sky-200 hover:bg-sky-500/20"
                          title="Editar"
                          aria-label="Editar"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(f);
                          }}
                          disabled={hasPayment}
                          className={`rounded-lg border p-1.5 ${
                            hasPayment
                              ? "cursor-not-allowed border-zinc-500/25 bg-zinc-500/10 text-zinc-300"
                              : "border-rose-400/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                          }`}
                          title={hasPayment ? "Estorne o pagamento para excluir" : "Excluir"}
                          aria-label="Excluir"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )})}
              {!loading && filtered.length === 0 ? <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">Nenhum faturamento encontrado.</div> : null}
              </div>
            </div>
          </section>

          {deleteTarget ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} aria-label="Fechar confirmação de exclusão" />
              <div className="relative w-full max-w-[560px] rounded-3xl border border-white/15 bg-zinc-900/90 p-5 shadow-2xl">
                <p className="text-base font-black text-white">Excluir faturamento</p>
                <p className="mt-1 text-sm text-zinc-300">
                  Você está excluindo a nota <span className="font-semibold text-white">{deleteTarget.invoice_number || `#${deleteTarget.id}`}</span>.
                </p>
                <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-[12px] text-rose-100">
                  <p className="font-semibold">O que será feito automaticamente:</p>
                  <p className="mt-1">1. Exclui o faturamento e todos os itens da nota.</p>
                  <p>2. Exclui a fatura vinculada em Contas a Pagar (quando não há pagamento).</p>
                  <p>3. Recalcula saldos do pedido e o que falta faturar.</p>
                  <p>4. Atualiza o estoque removendo as entradas desta nota.</p>
                </div>
                <p className="mt-3 text-[12px] text-zinc-400">A ação é irreversível.</p>
                {deleteError ? (
                  <div className="mt-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 text-[12px] text-rose-100">
                    {deleteError}
                  </div>
                ) : null}
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(deleteTarget.id)}
                    disabled={deleting}
                    className="rounded-2xl border border-rose-400/30 bg-rose-500/20 px-4 py-2 text-sm font-black text-rose-100 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? "Excluindo..." : "Confirmar exclusão"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {saveConfirmOpen ? (
            <div className="fixed inset-0 z-[60] grid place-items-center px-4">
              <button
                className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
                onClick={() => !saving && setSaveConfirmOpen(false)}
                aria-label="Fechar confirmação de salvamento"
              />
              <div className="relative w-full max-w-[520px] rounded-3xl border border-white/15 bg-zinc-900/90 p-5 shadow-2xl">
                <p className="text-base font-black text-white">Confirmar salvamento</p>
                <p className="mt-1 text-sm text-zinc-300">
                  {editingId
                    ? "Você está prestes a salvar alterações no faturamento. Os saldos vinculados serão recalculados."
                    : "Você está prestes a criar um novo faturamento e gerar os vínculos financeiros."}
                </p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveConfirmOpen(false)}
                    disabled={saving}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSaveConfirmOpen(false);
                      void onSave();
                    }}
                    disabled={saving}
                    className="rounded-2xl border border-accent-400/30 bg-accent-500/20 px-4 py-2 text-sm font-black text-accent-100 hover:bg-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Salvando..." : "Confirmar"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {open ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => { setOpen(false); setFormStep(0); }} aria-label="Fechar" />
              <div className="relative w-full max-w-[980px] xl:max-w-[1100px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/85 shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <p className="text-sm font-black text-white">{editingId ? "Editar faturamento" : "Novo faturamento"}</p>
                    <p className="mt-1 text-xs text-zinc-400">Etapa {formStep + 1} de 3</p>
                  </div>
                  <button onClick={() => { setOpen(false); setFormStep(0); }} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10" aria-label="Fechar modal" title="Fechar">
                    ×
                  </button>
                </div>
                <form
                  className="max-h-[78vh] overflow-auto p-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSaveConfirmOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
                    const target = e.target as HTMLElement;
                    if (!target || target.tagName === "TEXTAREA") return;
                    e.preventDefault();
                    focusNextInForm(target);
                  }}
                >
                  <div className="mb-4 grid grid-cols-3 gap-2 text-[11px] font-black uppercase tracking-[0.18em]">
                    <button type="button" onClick={() => setFormStep(0)} className={`rounded-xl border px-3 py-2 ${formStep === 0 ? "border-accent-400/60 bg-accent-500/15 text-accent-200" : "border-white/15 bg-white/5 text-zinc-400"}`}>Dados</button>
                    <button type="button" onClick={() => setFormStep(1)} className={`rounded-xl border px-3 py-2 ${formStep === 1 ? "border-accent-400/60 bg-accent-500/15 text-accent-200" : "border-white/15 bg-white/5 text-zinc-400"}`}>Itens</button>
                    <button type="button" onClick={() => setFormStep(2)} className={`rounded-xl border px-3 py-2 ${formStep === 2 ? "border-accent-400/60 bg-accent-500/15 text-accent-200" : "border-white/15 bg-white/5 text-zinc-400"}`}>Resumo</button>
                  </div>

                  {formStep === 0 ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data</label>
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Nota fiscal</label>
                      <input value={formNF} onChange={(e) => setFormNF(toUpperText(e.target.value))} placeholder="Ex: 000123" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Safra</label>
                      <select value={formSafraId} onChange={(e) => { const next = e.target.value === "" ? "" : Number(e.target.value); setFormSafraId(next); setFormPedidoId(""); }} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {safras.map((s) => (<option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Grupo</label>
                      <select value={formGrupoId} onChange={(e) => { const next = e.target.value === "" ? "" : Number(e.target.value); setFormGrupoId(next); setFormProdutorId(""); setFormPedidoId(""); }} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {grupos.map((g) => (<option key={g.id} value={g.id} style={optionStyle}>{g.name}</option>))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produtor</label>
                      <select value={formProdutorId} onChange={(e) => { const next = e.target.value === "" ? "" : Number(e.target.value); setFormProdutorId(next); setFormPedidoId(""); }} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {produtoresDoGrupo.map((p) => (<option key={p.id} value={p.id} style={optionStyle}>{produtorDisplayLabel(p)}</option>))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Pedido</label>
                      <select value={formPedidoId} onChange={(e) => onPickPedido(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {pedidosDoProdutor.map((p) => (<option key={p.id} value={p.id} style={optionStyle}>{p.code || `#${p.id}`}</option>))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Vencimento</label>
                      <input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Fornecedor</label>
                      <select value={formFornecedorId} onChange={(e) => setFormFornecedorId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {fornecedores.map((f) => (<option key={f.id} value={f.id} style={optionStyle}>{f.name}</option>))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Depósito</label>
                      <select value={formDepositoId} onChange={(e) => setFormDepositoId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {depositos.map((d) => (<option key={d.id} value={d.id} style={optionStyle}>{d.name}</option>))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Operação</label>
                      <select value={formOperacaoId} onChange={(e) => setFormOperacaoId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {operacoesDespesa.map((o) => (<option key={o.id} value={o.id} style={optionStyle}>{o.name}</option>))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Forma pagamento</label>
                      <select value={formPaymentMethod} onChange={(e) => setFormPaymentMethod(e.target.value as typeof formPaymentMethod)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="pix" style={optionStyle}>PIX</option>
                        <option value="boleto" style={optionStyle}>Boleto</option>
                        <option value="transfer" style={optionStyle}>Transferência</option>
                        <option value="card" style={optionStyle}>Cartão</option>
                        <option value="cash" style={optionStyle}>Dinheiro</option>
                        <option value="other" style={optionStyle}>Outro</option>
                      </select>
                    </div>
                  </div>
                  ) : null}

                  {formStep === 1 ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-white">Itens</p>
                      <button type="button" onClick={() => setRows((prev) => [...prev, { pedido_item_id: null, produto_id: null, peca_id: null, quantity: "0", price: "0" }])} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-3 py-2 text-sm font-black text-emerald-100 hover:bg-emerald-500/20">
                        Adicionar
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {rows.map((r, idx) => {
                        const pi = itensPendentes.find((x) => x.id === r.pedido_item_id) ?? null;
                        const allPedidoItems = pedidoSelecionado?.items || [];
                        const selectedFromPedido = allPedidoItems.find((x) => x.id === r.pedido_item_id);
                        const pendingPedidoItems = [...itensPendentes];
                        if (selectedFromPedido && !pendingPedidoItems.some((x) => x.id === selectedFromPedido.id)) {
                          pendingPedidoItems.push({
                            ...selectedFromPedido,
                            remaining: Math.max(0, parseNumber(selectedFromPedido.quantity) - (faturadoPorPedidoItem.get(selectedFromPedido.id) ?? 0))
                          });
                        }
                        const selectedValue = r.pedido_item_id
                          ? `pedido:${r.pedido_item_id}`
                          : r.produto_id
                            ? `insumo:${r.produto_id}`
                            : r.peca_id
                              ? `peca:${r.peca_id}`
                              : "";
                        const optionsItems: Array<{ value: string; label: string; price: string; remaining: number; source: "pedido" | "insumo" | "peca" }> = [
                          ...pendingPedidoItems
                            .filter((it) => it.remaining > 0 || it.id === r.pedido_item_id)
                            .map((it) => ({
                              value: `pedido:${it.id}`,
                              label: `[Pedido] ${it.produto?.name ?? "PRODUTO"}`,
                              price: String(it.price ?? "0"),
                              remaining: it.remaining,
                              source: "pedido" as const
                            })),
                          ...insumos.map((it) => ({
                            value: `insumo:${it.id}`,
                            label: `[Insumo] ${it.name}`,
                            price: "0",
                            remaining: 0,
                            source: "insumo" as const
                          })),
                          ...pecas.map((it) => ({
                            value: `peca:${it.id}`,
                            label: `[Peca] ${it.name}`,
                            price: "0",
                            remaining: 0,
                            source: "peca" as const
                          }))
                        ];
                        const selectedOption = optionsItems.find((it) => it.value === selectedValue) ?? null;
                        const remaining = pi?.remaining ?? 0;
                        const isPedidoSelection = selectedOption?.source === "pedido";
                        return (
                          <div key={idx} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-zinc-950/35 p-3 lg:grid-cols-[1.6fr_190px_170px_56px]">
                            <div className="grid gap-1">
                              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Produto</label>
                              <select value={selectedValue} onChange={(e) => {
                                const next = e.target.value;
                                if (!next) {
                                  setRows((prev) =>
                                    prev.map((row, i) =>
                                      i === idx ? { ...row, pedido_item_id: null, produto_id: null, peca_id: null } : row
                                    )
                                  );
                                  return;
                                }
                                const found = optionsItems.find((x) => x.value === next) ?? null;
                                if (next.startsWith("pedido:")) {
                                  const id = Number(next.split(":")[1] || "0");
                                  setRows((prev) =>
                                    prev.map((row, i) =>
                                      i === idx ? { ...row, pedido_item_id: id || null, produto_id: null, peca_id: null, price: String(found?.price ?? row.price) } : row
                                    )
                                  );
                                } else if (next.startsWith("insumo:")) {
                                  const id = Number(next.split(":")[1] || "0");
                                  setRows((prev) =>
                                    prev.map((row, i) =>
                                      i === idx ? { ...row, pedido_item_id: null, produto_id: id || null, peca_id: null, price: String(found?.price ?? row.price) } : row
                                    )
                                  );
                                } else if (next.startsWith("peca:")) {
                                  const id = Number(next.split(":")[1] || "0");
                                  setRows((prev) =>
                                    prev.map((row, i) =>
                                      i === idx ? { ...row, pedido_item_id: null, produto_id: null, peca_id: id || null, price: String(found?.price ?? row.price) } : row
                                    )
                                  );
                                }
                              }} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                                <option value="" style={optionStyle}>Selecione o produto...</option>
                                {optionsItems.map((it) => (
                                  <option key={it.value} value={it.value} style={optionStyle}>
                                    {it.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid gap-1">
                              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                                {isPedidoSelection
                                  ? `Quantidade (saldo pendente: ${remaining.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })})`
                                  : "Quantidade"}
                              </label>
                              <input value={r.quantity} onChange={(e) => { const next = e.target.value; const n = parseNumber(next); if (isPedidoSelection && remaining > 0 && n > remaining) { setRows((prev) => prev.map((row, i) => i === idx ? { ...row, quantity: String(remaining) } : row)); return; } setRows((prev) => prev.map((row, i) => i === idx ? { ...row, quantity: next } : row)); }} inputMode="decimal" placeholder="Qtd" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50" />
                            </div>
                            <div className="grid gap-1">
                              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Preco (5 casas)</label>
                              <input value={r.price} onChange={(e) => setRows((prev) => prev.map((row, i) => i === idx ? { ...row, price: e.target.value } : row))} inputMode="decimal" placeholder="Preco" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50" />
                            </div>
                            <div className="grid gap-1">
                              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Acao</label>
                              <button type="button" onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))} className="grid place-items-center rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-sm font-black text-rose-200 hover:bg-rose-500/15" aria-label="Remover" title="Remover">
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Total</p>
                        <p className="mt-1 text-lg font-black text-white">{money(total)}</p>
                      </div>
                    </div>
                  </div>
                  ) : null}

                  {formStep === 2 ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-black text-white">Resumo para confirmação</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/35 p-3 text-[12px] text-zinc-200">NF: <span className="font-semibold text-white">{formNF || "-"}</span></div>
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/35 p-3 text-[12px] text-zinc-200">Data: <span className="font-semibold text-white">{prettyDateBR(formDate) || "-"}</span></div>
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/35 p-3 text-[12px] text-zinc-200">Pedido: <span className="font-semibold text-white">{formPedidoId === "" ? "-" : pedidos.find((p) => p.id === Number(formPedidoId))?.code ?? "-"}</span></div>
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/35 p-3 text-[12px] text-zinc-200">Fornecedor: <span className="font-semibold text-white">{formFornecedorId === "" ? "-" : fornecedores.find((f) => f.id === Number(formFornecedorId))?.name ?? "-"}</span></div>
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/35 p-3 text-[12px] text-zinc-200">Vencimento: <span className="font-semibold text-white">{prettyDateBR(formDueDate) || "-"}</span></div>
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/35 p-3 text-[12px] text-zinc-200">Forma pagto: <span className="font-semibold text-white">{String(formPaymentMethod).toUpperCase()}</span></div>
                    </div>
                    <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-950/35 p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Itens ({rows.length})</p>
                      <div className="mt-2 space-y-1.5">
                        {rows.map((r, idx) => {
                          const itemPedido = itensPendentes.find((x) => x.id === r.pedido_item_id) ?? null;
                          const insumo = r.produto_id ? insumos.find((x) => x.id === r.produto_id) ?? null : null;
                          const peca = r.peca_id ? pecas.find((x) => x.id === r.peca_id) ?? null : null;
                          const nome = itemPedido?.produto?.name ?? insumo?.name ?? peca?.name ?? "Item";
                          const qtd = parseNumber(r.quantity);
                          const preco = parseNumber(r.price);
                          const subtotal = Math.max(0, qtd * preco);
                          return (
                            <div key={idx} className="flex items-center justify-between gap-2 text-[12px]">
                              <p className="truncate text-zinc-200">{nome}</p>
                              <p className="whitespace-nowrap text-zinc-100">{qtd.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} x {preco.toLocaleString("pt-BR", { minimumFractionDigits: 5, maximumFractionDigits: 5 })}</p>
                              <p className="whitespace-nowrap font-semibold text-white">{money(subtotal)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Total</p>
                        <p className="mt-1 text-lg font-black text-white">{money(total)}</p>
                      </div>
                    </div>
                  </div>
                  ) : null}

                  {saveMessage ? (
                    <div
                      className={`mt-4 rounded-2xl border p-3 text-sm font-semibold ${
                        /saldo|quantidade acima/i.test(saveMessage)
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                          : "border-white/10 bg-white/5 text-zinc-200"
                      }`}
                    >
                      {saveMessage}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button type="button" disabled={saving} onClick={() => { setOpen(false); setFormStep(0); }} className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={saving || formStep === 0}
                      onClick={() => setFormStep((s) => Math.max(0, s - 1))}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Voltar
                    </button>
                    {formStep < 2 ? (
                      <button
                        type="button"
                        disabled={saving || (formStep === 0 && formNF.trim().length < 1)}
                        onClick={() => setFormStep((s) => Math.min(2, s + 1))}
                        className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Proximo
                      </button>
                    ) : (
                      <button type="submit" disabled={saving || formNF.trim().length < 1} className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60">
                        {saving ? "Salvando..." : "Confirmar e salvar"}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}

