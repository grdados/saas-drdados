"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { produtorDisplayLabel } from "@/lib/produtorLabel";
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
import { formatDateBR } from "@/lib/locale";
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

function focusNextInForm(current: HTMLElement) {
  const form = current.closest("form");
  if (!form) return;
  const selectors = "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";
  const fields = Array.from(form.querySelectorAll<HTMLElement>(selectors)).filter((el) => el.tabIndex !== -1);
  const idx = fields.indexOf(current);
  if (idx >= 0 && idx < fields.length - 1) fields[idx + 1].focus();
}

function prettyDateBR(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return value;
  return formatDateBR(dt);
}

function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "delivered" || s === "confirmed" || s === "paid") return { label: "Faturado", cls: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" };
  if (s === "partial") return { label: "Fat. Parcial", cls: "border-sky-400/30 bg-sky-500/15 text-sky-200" };
  if (s === "canceled") return { label: "Cancelado", cls: "border-zinc-400/30 bg-zinc-500/15 text-zinc-200" };
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

function isPedidoLockedForChanges(
  p: PedidoCompra,
  billedByPedidoItem: Map<number, number>
): boolean {
  const status = resolvePedidoStatus(p, billedByPedidoItem);
  return status === "delivered" || status === "partial";
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

  const [reportSafraId, setReportSafraId] = useState<number | "">("");
  const [reportGrupoId, setReportGrupoId] = useState<number | "">("");
  const [reportProdutorId, setReportProdutorId] = useState<number | "">("");
  const [reportCategoria, setReportCategoria] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

  const [open, setOpen] = useState(false);
  const [formStep, setFormStep] = useState(0);
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
      return true;
    });
  }, [
    pedidos,
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
        tone: "border-accent-400/30 bg-accent-500/10",
        iconTone: "amber" as const
      },
      {
        label: "Faturados",
        value: `R$ ${val(faturadosList).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        qty: `${faturados} pedido(s)`,
        tone: "border-emerald-400/30 bg-emerald-500/10",
        iconTone: "emerald" as const
      },
      {
        label: "Pendentes",
        value: `R$ ${val(pendentesList).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        qty: `${pendentes} pedido(s)`,
        tone: "border-amber-400/30 bg-amber-500/10",
        iconTone: "amber" as const
      },
      {
        label: "Parciais",
        value: `R$ ${val(parciaisList).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        qty: `${parciais} pedido(s)`,
        tone: "border-sky-400/30 bg-sky-500/10",
        iconTone: "sky" as const
      },
      {
        label: "A faturar",
        value: `R$ ${val([...pendentesList, ...parciaisList]).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        qty: `${aFaturar} pedido(s)`,
        tone: "border-rose-400/30 bg-rose-500/10",
        iconTone: "rose" as const
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
    setFormStep(0);
    setOpen(true);
  }

  function openEdit(id: number) {
    const p = pedidos.find((x) => x.id === id);
    if (!p) return;
    if (isPedidoLockedForChanges(p, billedByPedidoItem)) {
      window.alert("Não é permitido editar pedido com status Faturado ou Fat. Parcial.");
      return;
    }
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
    setFormStep(0);
    setOpen(true);
  }

  function patchRow(i: number, patch: Partial<(typeof rows)[number]>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    if (!editingId) setFormStatus("pending");
    if (editingId) {
      const current = pedidos.find((p) => p.id === editingId);
      if (current && isPedidoLockedForChanges(current, billedByPedidoItem)) {
        window.alert("Não é permitido editar pedido com status Faturado ou Fat. Parcial.");
        return;
      }
    }
    const confirmText = editingId ? "Confirmar edição do pedido?" : "Confirmar novo pedido?";
    if (!window.confirm(confirmText)) return;
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
        status: editingId ? formStatus : "pending",
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
      setFormStep(0);
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
    const pedido = pedidos.find((p) => p.id === id);
    if (pedido && isPedidoLockedForChanges(pedido, billedByPedidoItem)) {
      window.alert("Não é permitido excluir pedido com status Faturado ou Fat. Parcial.");
      return;
    }
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
            .no-print { display: none !important; }
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
    const pedidoIds = new Set(filtered.map((p) => p.id));
    const faturamentosValidos = faturamentos.filter(
      (f) => (f.pedido?.id ? pedidoIds.has(f.pedido.id) : false) && (f.status || "").toLowerCase() !== "canceled"
    );

    type GroupSummary = {
      safra: string;
      grupo: string;
      produtor: string;
      pedidos: number;
      valorPedido: number;
      valorFaturado: number;
      saldoFaturar: number;
    };

    const map = new Map<string, GroupSummary>();
    for (const p of filtered) {
      const safra = p.safra?.name ?? "SEM SAFRA";
      const grupo = p.grupo?.name ?? "SEM GRUPO";
      const produtor = p.produtor?.name ?? "SEM PRODUTOR";
      const key = `${safra}__${grupo}__${produtor}`;
      const valorPedido = parseNumber(p.total_value);
      const valorFaturado = faturamentosValidos
        .filter((f) => (f.pedido?.id ?? null) === p.id)
        .reduce((acc, f) => acc + parseNumber(f.total_value), 0);
      const saldoFaturar = Math.max(0, valorPedido - valorFaturado);
      const curr = map.get(key) ?? { safra, grupo, produtor, pedidos: 0, valorPedido: 0, valorFaturado: 0, saldoFaturar: 0 };
      curr.pedidos += 1;
      curr.valorPedido += valorPedido;
      curr.valorFaturado += valorFaturado;
      curr.saldoFaturar += saldoFaturar;
      map.set(key, curr);
    }

    const groups = [...map.values()].sort((a, b) =>
      `${a.safra}|${a.grupo}|${a.produtor}`.localeCompare(`${b.safra}|${b.grupo}|${b.produtor}`, "pt-BR")
    );

    const totalPedido = groups.reduce((acc, g) => acc + g.valorPedido, 0);
    const totalFaturado = groups.reduce((acc, g) => acc + g.valorFaturado, 0);
    const totalSaldo = groups.reduce((acc, g) => acc + g.saldoFaturar, 0);

    const rows = groups
      .map(
        (g) => `
          <tr>
            <td>${escapeHtml(g.safra)}</td>
            <td>${escapeHtml(g.grupo)}</td>
            <td>${escapeHtml(g.produtor)}</td>
            <td class="num">${g.pedidos}</td>
            <td class="num">R$ ${g.valorPedido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="num">R$ ${g.valorFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="num">R$ ${g.saldoFaturar.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `
      )
      .join("");

    openPrintHtml(
      "Resumo de Pedidos",
      `
        <h1>Relatório Resumo de Pedidos</h1>
        <p class="muted">Agrupado por Safra, Grupo e Produtor · Gerado em ${new Date().toLocaleString("pt-BR")}</p>
        <div class="kpi" style="margin-top:12px">
          <div class="card"><div class="label">Total de pedidos</div><div class="value">${filtered.length}</div></div>
          <div class="card"><div class="label">Valor dos pedidos</div><div class="value">R$ ${totalPedido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
          <div class="card"><div class="label">Valor faturado</div><div class="value">R$ ${totalFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
          <div class="card"><div class="label">Saldo a faturar</div><div class="value">R$ ${totalSaldo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Safra</th>
              <th>Grupo</th>
              <th>Produtor</th>
              <th class="num">Pedidos</th>
              <th class="num">Valor pedido</th>
              <th class="num">Valor faturado</th>
              <th class="num">Saldo a faturar</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7">Sem dados para os filtros selecionados.</td></tr>'}</tbody>
        </table>
      `,
      "portrait"
    );
  }

  function openAnaliticoReport() {
    const pedidoIds = new Set(filtered.map((p) => p.id));
    const faturamentosValidos = faturamentos.filter(
      (f) => (f.pedido?.id ? pedidoIds.has(f.pedido.id) : false) && (f.status || "").toLowerCase() !== "canceled"
    );

    type Analitico = {
      safra: string;
      grupo: string;
      produtor: string;
      pedidos: Array<{
        id: number;
        code: string;
        valorPedido: number;
        valorFaturado: number;
        saldoFaturar: number;
        notas: Array<{ nf: string; date: string; valor: number }>;
      }>;
    };

    const groupMap = new Map<string, Analitico>();
    for (const p of filtered) {
      const safra = p.safra?.name ?? "SEM SAFRA";
      const grupo = p.grupo?.name ?? "SEM GRUPO";
      const produtor = p.produtor?.name ?? "SEM PRODUTOR";
      const key = `${safra}__${grupo}__${produtor}`;

      const notas = faturamentosValidos
        .filter((f) => (f.pedido?.id ?? null) === p.id)
        .map((f) => ({
          nf: f.invoice_number || `NF-${f.id}`,
          date: prettyDateBR(f.date),
          valor: parseNumber(f.total_value)
        }));
      const valorFaturado = notas.reduce((acc, n) => acc + n.valor, 0);
      const valorPedido = parseNumber(p.total_value);
      const saldoFaturar = Math.max(0, valorPedido - valorFaturado);

      const group = groupMap.get(key) ?? { safra, grupo, produtor, pedidos: [] };
      group.pedidos.push({
        id: p.id,
        code: p.code || `#${p.id}`,
        valorPedido,
        valorFaturado,
        saldoFaturar,
        notas
      });
      groupMap.set(key, group);
    }

    const groups = [...groupMap.values()].sort((a, b) =>
      `${a.safra}|${a.grupo}|${a.produtor}`.localeCompare(`${b.safra}|${b.grupo}|${b.produtor}`, "pt-BR")
    );

    const htmlGroups = groups
      .map((g) => {
        const totalPedido = g.pedidos.reduce((acc, p) => acc + p.valorPedido, 0);
        const totalFaturado = g.pedidos.reduce((acc, p) => acc + p.valorFaturado, 0);
        const totalSaldo = g.pedidos.reduce((acc, p) => acc + p.saldoFaturar, 0);
        const rows = g.pedidos
          .map((p) => {
            const nfs = p.notas.length
              ? p.notas
                  .map(
                    (n) =>
                      `${escapeHtml(n.nf)} (${escapeHtml(n.date)}) - R$ ${n.valor.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}`
                  )
                  .join("<br/>")
              : "Sem faturamento";
            return `
              <tr>
                <td>${escapeHtml(p.code)}</td>
                <td>${nfs}</td>
                <td class="num">R$ ${p.valorPedido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="num">R$ ${p.valorFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="num">R$ ${p.saldoFaturar.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `;
          })
          .join("");

        return `
          <section class="group">
            <h3>${escapeHtml(g.safra)} · ${escapeHtml(g.grupo)} · ${escapeHtml(g.produtor)}</h3>
            <div class="kpi">
              <div class="card"><div class="label">Pedidos</div><div class="value">${g.pedidos.length}</div></div>
              <div class="card"><div class="label">Valor pedido</div><div class="value">R$ ${totalPedido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
              <div class="card"><div class="label">Valor faturado</div><div class="value">R$ ${totalFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
              <div class="card"><div class="label">Saldo a faturar</div><div class="value">R$ ${totalSaldo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Notas fiscais faturadas</th>
                  <th class="num">Valor pedido</th>
                  <th class="num">Valor faturado</th>
                  <th class="num">Saldo a faturar</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>
        `;
      })
      .join("");

    openPrintHtml(
      "Relatório Analítico de Pedidos",
      `
        <h1>Relatório Analítico de Pedidos</h1>
        <p class="muted">Agrupado por Safra, Grupo e Produtor · Gerado em ${new Date().toLocaleString("pt-BR")}</p>
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
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Pedido</h1>
              <p className="mt-1 text-sm text-zinc-300">Pedidos de compra de insumos.</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-2.5">
              <div className="flex h-full flex-col justify-between gap-1.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Relatórios</p>
                <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                  <button onClick={openResumoReport} className="min-h-[36px] rounded-2xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-zinc-100 hover:bg-white/10">Relatório resumo</button>
                  <button onClick={openAnaliticoReport} className="min-h-[36px] rounded-2xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-zinc-100 hover:bg-white/10">Relatório analítico</button>
                  <button onClick={openCreate} className="min-h-[36px] rounded-2xl bg-accent-500 px-3.5 py-1.5 text-[12px] font-black text-zinc-950 hover:bg-accent-400">Novo pedido</button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <select value={reportSafraId} onChange={(e) => setReportSafraId(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-[126px] flex-1 rounded-2xl border border-white/15 bg-zinc-950/40 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={optionStyle}>Safra</option>
                {safras.map((s) => (<option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>))}
              </select>
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
              <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className="min-w-[126px] flex-1 rounded-2xl border border-white/15 bg-zinc-950/40 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="all" style={optionStyle}>Status (todos)</option>
                <option value="pending" style={optionStyle}>Pendente</option>
                <option value="partial" style={optionStyle}>Fat. Parcial</option>
                <option value="delivered" style={optionStyle}>Faturado</option>
                <option value="canceled" style={optionStyle}>Cancelado</option>
              </select>
              <div className="flex min-w-[260px] flex-1 gap-2">
                <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="w-full rounded-2xl border border-white/15 bg-zinc-950/40 px-3 py-1.5 text-[11px] text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
                <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="w-full rounded-2xl border border-white/15 bg-zinc-950/40 px-3 py-1.5 text-[11px] text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
              </div>
            </div>
          </section>

          {error ? (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((c) => (
              <div key={c.label} className={`flex h-[88px] items-center gap-3 rounded-3xl border p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] ${c.tone}`}>
                <CardIcon tone={c.iconTone}>
                  {c.label === "Valor total" ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22" /><path d="M17 5.5c0-1.7-2.2-3-5-3s-5 1.3-5 3 2.2 3 5 3 5 1.3 5 3-2.2 3-5 3-5-1.3-5-3" /></svg>
                  ) : c.label === "Faturados" ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 13 4 4L19 7" /></svg>
                  ) : c.label === "Pendentes" ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v5" /><circle cx="12" cy="16" r="1" /><path d="M10.3 3.5 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0z" /></svg>
                  ) : c.label === "Parciais" ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="9" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.5 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0z" /></svg>
                  )}
                </CardIcon>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{c.label}</p>
                  <p className="mt-1.5 truncate text-[16px] font-black leading-tight text-white">{c.value}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-zinc-300">{c.qty}</p>
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-black text-white">Lista</p>
              <p className="text-[11px] font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
            </div>
            <div className="mt-3 overflow-x-auto">
              <div className="hidden min-w-[1120px] grid-cols-[84px_80px_78px_88px_86px_156px_96px_74px_78px_102px_118px] gap-1.5 rounded-2xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 md:grid">
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
              {filtered.map((p) => {
                const locked = isPedidoLockedForChanges(p, billedByPedidoItem);
                return (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2.5 hover:bg-white/5">
                  <div className="grid min-w-[1120px] grid-cols-1 gap-1.5 md:grid-cols-[84px_80px_78px_88px_86px_156px_96px_74px_78px_102px_118px] md:items-center md:gap-1.5">
                    <div>
                      {(() => {
                        const meta = statusBadge(resolvePedidoStatus(p, billedByPedidoItem));
                        return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${meta.cls}`}>{meta.label}</span>;
                      })()}
                    </div>
                    <div><p className="text-[11px] font-medium text-zinc-100">{prettyDateBR(p.date)}</p></div>
                    <div>
                      <button
                        onClick={() => openEdit(p.id)}
                        disabled={locked}
                        className={`truncate text-left text-[11px] font-medium ${locked ? "cursor-not-allowed text-zinc-500" : "text-white hover:text-accent-200"}`}
                      >
                        {p.code || `#${p.id}`}
                      </button>
                    </div>
                    <div><p className="text-[11px] font-medium text-zinc-100">{prettyDateBR(p.due_date)}</p></div>
                    <div><p className="truncate text-[11px] font-medium text-zinc-100">{p.grupo?.name ?? "-"}</p></div>
                    <div><p className="truncate text-[11px] font-medium text-zinc-100">{p.produtor?.name ?? "-"}</p></div>
                    <div><p className="truncate text-[11px] font-medium text-zinc-100">{p.fornecedor?.name ?? "-"}</p></div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-zinc-100">
                        {(p.items || []).reduce((acc, it) => acc + parseNumber(it.quantity), 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const qty = (p.items || []).reduce((acc, it) => acc + parseNumber(it.quantity), 0);
                        const price = qty > 0 ? parseNumber(p.total_value) / qty : 0;
                        return <p className="text-[11px] font-medium text-zinc-100">{price.toLocaleString("pt-BR", { minimumFractionDigits: 5, maximumFractionDigits: 5 })}</p>;
                      })()}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-zinc-100">R$ {Number(p.total_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="whitespace-nowrap">
                      <div className="flex w-full flex-nowrap justify-end gap-1 whitespace-nowrap">
                        <button
                          onClick={() => openEdit(p.id)}
                          disabled={locked}
                          className={`rounded-lg border p-1.5 ${
                            locked
                              ? "cursor-not-allowed border-zinc-500/25 bg-zinc-500/10 text-zinc-300"
                              : "border-sky-400/25 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
                          }`}
                          title={locked ? "Pedido já faturado/parcial não pode ser editado" : "Editar"}
                          aria-label="Editar"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(p.id)}
                          disabled={locked}
                          className={`rounded-lg border p-1.5 ${
                            locked
                              ? "cursor-not-allowed border-zinc-500/25 bg-zinc-500/10 text-zinc-300"
                              : "border-rose-400/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                          }`}
                          title={locked ? "Pedido já faturado/parcial não pode ser excluído" : "Excluir"}
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
                          onClick={() => window.open(`/compra/pedido/${p.id}/print?t=${Date.now()}`, "_blank", "noopener,noreferrer")}
                          className="whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 text-[9px] font-medium text-white hover:bg-white/10"
                          title="Imprimir / PDF"
                          aria-label="Imprimir / PDF"
                        >
                          Imprimir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )})}
              {!loading && filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">Nenhum pedido encontrado.</div>
              ) : null}
              </div>
            </div>
          </section>

          {/* Modal */}
          {open ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => { setOpen(false); setFormStep(0); }} aria-label="Fechar" />
              <div className="relative w-full max-w-[1100px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/85 shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <p className="text-sm font-black text-white">{editing ? "Editar pedido" : "Novo pedido"}</p>
                    <p className="mt-1 text-xs text-zinc-400">Etapa {formStep + 1} de 3</p>
                  </div>
                  <button
                    onClick={() => { setOpen(false); setFormStep(0); }}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                    aria-label="Fechar modal"
                    title="Fechar"
                  >
                    ×
                  </button>
                </div>
                <form
                  className="max-h-[78vh] overflow-auto p-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void onSave();
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
                    const target = e.target as HTMLElement;
                    if (!target || target.tagName === "TEXTAREA") return;
                    e.preventDefault();
                    focusNextInForm(target);
                  }}
                >
                  <div className="mb-4 grid grid-cols-3 gap-1">
                    {["Dados gerais", "Itens", "Resumo"].map((label, idx) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setFormStep(idx)}
                        className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                          formStep === idx
                            ? "border-accent-400/45 bg-accent-500/18 text-accent-100"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {formStep === 0 ? (
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
                            {produtorDisplayLabel(p)}
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
                        disabled={!editingId}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="pending" style={optionStyle}>
                          Pendente
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
                  ) : null}

                  {formStep === 1 ? (
                  <div className="mt-1 rounded-3xl border border-white/10 bg-white/5 p-4">
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
                  ) : null}

                  {formStep === 2 ? (
                    <section className="mt-1 rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Resumo para confirmação</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-zinc-950/35 px-3 py-2 text-xs text-zinc-300">Pedido: {formCode || "-"}</div>
                        <div className="rounded-xl border border-white/10 bg-zinc-950/35 px-3 py-2 text-xs text-zinc-300">Data: {formDate || "-"}</div>
                        <div className="rounded-xl border border-white/10 bg-zinc-950/35 px-3 py-2 text-xs text-zinc-300">Fornecedor: {fornecedores.find((f) => f.id === Number(formFornecedorId))?.name || "-"}</div>
                        <div className="rounded-xl border border-white/10 bg-zinc-950/35 px-3 py-2 text-xs text-zinc-300">Produtor: {produtores.find((p) => p.id === Number(formProdutorId))?.name || "-"}</div>
                        <div className="rounded-xl border border-white/10 bg-zinc-950/35 px-3 py-2 text-xs text-zinc-300">Itens: {rows.length}</div>
                        <div className="rounded-xl border border-white/10 bg-zinc-950/35 px-3 py-2 text-xs text-zinc-300">Total: R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    </section>
                  ) : null}

                  {saveMessage ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-semibold text-zinc-200">{saveMessage}</div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <button
                      disabled={saving}
                      onClick={() => { setOpen(false); setFormStep(0); }}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormStep((s) => Math.max(s - 1, 0))}
                        disabled={formStep === 0}
                        className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Voltar
                      </button>
                      {formStep < 2 ? (
                        <button
                          type="button"
                          onClick={() => setFormStep((s) => Math.min(s + 1, 2))}
                          className="inline-flex items-center justify-center rounded-2xl border border-accent-400/25 bg-accent-500/20 px-4 py-2.5 text-sm font-black text-accent-100"
                        >
                          Próximo
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={saving || formCode.trim().length < 2}
                          className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? "Salvando..." : "Confirmar e salvar"}
                        </button>
                      )}
                    </div>
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
