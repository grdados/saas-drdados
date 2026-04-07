"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { produtorDisplayLabel } from "@/lib/produtorLabel";
import {
  ContaFinanceira,
  ContaReceber,
  ContratoVenda,
  isApiError,
  listContas,
  listContasAReceber,
  listContratosVenda,
  listSafras,
  updateContaReceberStatus
} from "@/lib/api";
import { formatCurrencyBRL, formatDateBR, formatDateTimeBR } from "@/lib/locale";

function n(v: unknown) {
  const x = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}
function money(v: unknown) {
  return formatCurrencyBRL(n(v));
}
function d(s: string | null | undefined) {
  if (!s) return "-";
  const dt = new Date(`${s}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? s : formatDateBR(dt);
}
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function openPrintHtml(title: string, htmlBody: string, orientation: "portrait" | "landscape" = "landscape") {
  const generatedAt = formatDateTimeBR(new Date());
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
        .header { display: grid; grid-template-columns: 260px 1fr; gap: 12px; align-items: center; border: 1px solid #e4e4e7; border-radius: 10px; padding: 8px 10px; margin-bottom: 12px; }
        .logo-wrap img { max-height: 52px; width: auto; object-fit: contain; }
        .header-info { text-align: right; }
        .header-title { margin: 0; font-size: 18px; font-weight: 800; }
        .header-meta { margin-top: 4px; color: #52525b; font-size: 11px; line-height: 1.4; }
        h1 { margin: 0 0 8px; font-size: 24px; }
        .muted { color: #555; font-size: 12px; }
        .group { border: 1px solid #d7d7d7; border-radius: 10px; padding: 10px; margin-top: 12px; }
        .group h3 { margin: 0 0 8px; font-size: 15px; }
        .kpi { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
        .card { border: 1px solid #e2e2e2; border-radius: 8px; padding: 8px; }
        .label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
        .value { margin-top: 4px; font-size: 18px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #e2e2e2; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f7f7f7; }
        td.num, th.num { text-align: right; white-space: nowrap; }
      </style>
    </head>
    <body>
      <div class="page">
        <header class="header">
          <div class="logo-wrap"><img src="${logoUrl}" alt="GR Dados" /></div>
          <div class="header-info">
            <p class="header-title">${escapeHtml(title)}</p>
            <div class="header-meta">Cliente: GR Dados Demo<br/>Emissão: ${generatedAt}</div>
          </div>
        </header>
        ${htmlBody}
      </div>
    </body>
    </html>
  `;
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
}

type Status = "open" | "overdue" | "partial" | "paid" | "canceled";
type ReceiveState = {
  receive_date: string;
  receive_increment: string;
  discount_value: string;
  addition_value: string;
  payment_method: "pix" | "boleto" | "transfer" | "card" | "cash" | "other";
  conta_id: number | "";
  status: Status;
};
type ReceiveStep = 1 | 2 | 3 | 4;

const DEFAULT_RECEIVE: ReceiveState = {
  receive_date: "",
  receive_increment: "",
  discount_value: "0",
  addition_value: "0",
  payment_method: "pix",
  conta_id: "",
  status: "paid"
};

function statusMeta(s: Status) {
  if (s === "paid") return { label: "Recebido", cls: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" };
  if (s === "partial") return { label: "Parcial", cls: "border-sky-400/30 bg-sky-500/15 text-sky-200" };
  if (s === "overdue") return { label: "Vencido", cls: "border-rose-400/30 bg-rose-500/15 text-rose-200" };
  if (s === "canceled") return { label: "Cancelado", cls: "border-zinc-400/30 bg-zinc-500/15 text-zinc-200" };
  return { label: "Pendente", cls: "border-amber-400/30 bg-amber-500/15 text-amber-200" };
}
function CardIcon({
  tone,
  children
}: {
  tone: "amber" | "sky" | "emerald" | "rose" | "slate";
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
function normalizeStatus(it: ContaReceber): Status {
  if (it.status === "paid" || it.status === "partial" || it.status === "canceled" || it.status === "overdue") return it.status;
  if (it.status === "open" && it.due_date && new Date(it.due_date) < new Date(new Date().toDateString())) return "overdue";
  return "open";
}
function origem(it: ContaReceber) {
  if (it.origem === "contrato") return "Contrato";
  if (it.origem === "nota_fiscal") return "Nota Fiscal";
  if (it.origem === "fixacao") return "Fixação";
  return "Duplicata";
}

export default function ContasAReceberPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContaReceber[]>([]);
  const [contratos, setContratos] = useState<ContratoVenda[]>([]);
  const [safras, setSafras] = useState<Array<{ id: number; name: string }>>([]);
  const [contas, setContas] = useState<ContaFinanceira[]>([]);
  const [error, setError] = useState("");

  const [status, setStatus] = useState<"all" | Status>("all");
  const [safraId, setSafraId] = useState<number | "">("");
  const [grupoId, setGrupoId] = useState<number | "">("");
  const [produtorId, setProdutorId] = useState<number | "">("");
  const [clienteId, setClienteId] = useState<number | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [receiveWizardOpen, setReceiveWizardOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false);
  const [receiveStep, setReceiveStep] = useState<ReceiveStep>(1);
  const [receive, setReceive] = useState<ReceiveState>(DEFAULT_RECEIVE);
  const [receiving, setReceiving] = useState(false);

  const [estornoOpen, setEstornoOpen] = useState(false);
  const [estornoIds, setEstornoIds] = useState<number[]>([]);
  const [estornando, setEstornando] = useState(false);

  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const contractById = useMemo(() => {
    const map = new Map<number, ContratoVenda>();
    for (const c of contratos) map.set(c.id, c);
    return map;
  }, [contratos]);

  const grupos = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of contratos) {
      if (c.grupo?.id) map.set(c.grupo.id, c.grupo.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [contratos]);
  const produtores = useMemo(() => {
    const map = new Map<number, string>();
    for (const it of items) {
      if (it.produtor?.id) map.set(it.produtor.id, it.produtor.name);
    }
    for (const c of contratos) {
      if (c.produtor?.id) map.set(c.produtor.id, c.produtor.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [items, contratos]);
  const clientes = useMemo(() => {
    const map = new Map<number, string>();
    for (const it of items) {
      if (it.cliente?.id) map.set(it.cliente.id, it.cliente.name);
    }
    for (const c of contratos) {
      if (c.cliente?.id) map.set(c.cliente.id, c.cliente.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [items, contratos]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const st = normalizeStatus(it);
      if (status !== "all" && st !== status) return false;
      const ct = it.contrato?.id ? contractById.get(it.contrato.id) : null;
      if (safraId !== "" && (ct?.safra?.id ?? null) !== Number(safraId)) return false;
      if (grupoId !== "" && (ct?.grupo?.id ?? null) !== Number(grupoId)) return false;
      if (produtorId !== "" && (it.produtor?.id ?? ct?.produtor?.id ?? null) !== Number(produtorId)) return false;
      if (clienteId !== "" && (it.cliente?.id ?? ct?.cliente?.id ?? null) !== Number(clienteId)) return false;
      const periodValue = it.due_date || it.date || "";
      if (fromDate && periodValue && periodValue < fromDate) return false;
      if (toDate && periodValue && periodValue > toDate) return false;
      return true;
    });
  }, [items, status, safraId, grupoId, produtorId, clienteId, fromDate, toDate, contractById]);

  const monthlySales = useMemo(() => {
    const year = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i, label: new Date(year, i, 1).toLocaleString("pt-BR", { month: "short" }), value: 0 }));
    for (const it of filtered) {
      const base = it.date || it.due_date;
      if (!base) continue;
      const dt = new Date(`${base}T00:00:00`);
      if (Number.isNaN(dt.getTime()) || dt.getFullYear() !== year) continue;
      months[dt.getMonth()].value += n(it.total_value);
    }
    const max = Math.max(...months.map((m) => m.value), 1);
    return { year, max, months };
  }, [filtered]);

  const stats = useMemo(() => {
    const sum = (arr: ContaReceber[]) => arr.reduce((acc, x) => acc + n(x.total_value), 0);
    const open = filtered.filter((x) => normalizeStatus(x) === "open");
    const partial = filtered.filter((x) => normalizeStatus(x) === "partial");
    const overdue = filtered.filter((x) => normalizeStatus(x) === "overdue");
    const paid = filtered.filter((x) => normalizeStatus(x) === "paid");
    return { total: sum(filtered), open: sum(open), partial: sum(partial), overdue: sum(overdue), paid: sum(paid) };
  }, [filtered]);

  const selectedPending = useMemo(() => items.filter((x) => selectedIds.includes(x.id)).reduce((a, b) => a + Math.max(n(b.balance_value), 0), 0), [items, selectedIds]);
  const reversibleIds = useMemo(() => filtered.filter((x) => ["paid", "partial"].includes(normalizeStatus(x))).map((x) => x.id), [filtered]);

  useEffect(() => { void refresh(); }, []);
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  function showToast(kind: "success" | "error", msg: string) {
    setToast({ kind, msg });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3800);
  }

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true); setError("");
    try {
      const [cr, ct, sf, cc] = await Promise.all([listContasAReceber(token), listContratosVenda(token), listSafras(token), listContas(token)]);
      setItems(cr); setContratos(ct); setSafras(sf.map((x) => ({ id: x.id, name: x.name }))); setContas(cc);
    } catch (err) {
      if (isApiError(err) && err.status === 401) { window.location.href = "/login"; return; }
      setError(err instanceof Error ? err.message : "Falha ao carregar contas a receber.");
    } finally { setLoading(false); }
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleAll() {
    const ids = filtered.filter((x) => normalizeStatus(x) !== "paid").map((x) => x.id);
    setSelectedIds((prev) => (ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
  }
  function openReceive(ids: number[]) {
    const receivable = ids.filter((id) => {
      const r = items.find((x) => x.id === id);
      return r && normalizeStatus(r) !== "paid";
    });
    if (!receivable.length) return;
    setSelectedIds(receivable);
    setReceive({ ...DEFAULT_RECEIVE, status: "paid" });
    setReceiveOpen(false);
    setReceiveConfirmOpen(false);
    setReceiveWizardOpen(true);
    setReceiveStep(1);
  }
  function closeReceiveModal() {
    if (receiving) return;
    setReceiveWizardOpen(false);
    setReceiveOpen(false);
    setReceiveConfirmOpen(false);
    setReceiveStep(1);
  }
  function requestEstorno(ids: number[]) {
    const rev = ids.filter((id) => {
      const r = items.find((x) => x.id === id);
      if (!r) return false;
      const st = normalizeStatus(r);
      return st === "paid" || st === "partial";
    });
    if (!rev.length) return;
    setEstornoIds(rev); setEstornoOpen(true);
  }

  async function runReceive() {
    const token = getAccessToken();
    if (!token || !selectedIds.length) return;
    setReceiving(true); setError("");
    try {
      const increment = receive.receive_increment ? n(receive.receive_increment) : 0;
      if (increment > selectedPending + 0.00001) { setError(`Valor acima do saldo pendente (${money(selectedPending)}).`); setReceiving(false); return; }
      const payload = {
        receive_date: receive.receive_date || null,
        receive_increment: increment > 0 ? increment : undefined,
        discount_value: n(receive.discount_value),
        addition_value: n(receive.addition_value),
        payment_method: receive.payment_method,
        conta_id: receive.conta_id === "" ? null : Number(receive.conta_id),
        status: receive.status
      };
      await Promise.all(selectedIds.map((id) => updateContaReceberStatus(token, id, payload)));
      closeReceiveModal(); await refresh(); showToast("success", "Recebimento efetuado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao efetuar recebimento.");
      showToast("error", err instanceof Error ? err.message : "Falha ao efetuar recebimento.");
    } finally { setReceiving(false); }
  }

  async function confirmEstorno() {
    const token = getAccessToken();
    if (!token || !estornoIds.length) return;
    setEstornando(true); setError("");
    try {
      await Promise.all(estornoIds.map((id) => updateContaReceberStatus(token, id, { status: "open", received_value: 0, receive_increment: 0, receive_date: null })));
      setEstornoOpen(false); setEstornoIds([]); await refresh(); showToast("success", "Estorno efetuado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao estornar recebimento.");
      showToast("error", err instanceof Error ? err.message : "Falha ao estornar recebimento.");
    } finally { setEstornando(false); }
  }

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;
  const receiveSteps: Array<{ id: ReceiveStep; label: string }> = [
    { id: 1, label: "Recebimento" },
    { id: 2, label: "Ajustes" },
    { id: 3, label: "Conta" },
    { id: 4, label: "Resumo" }
  ];

  function validateReceiveStep(step: ReceiveStep) {
    if (step === 1) {
      const increment = n(receive.receive_increment || "0");
      if (!receive.receive_date) {
        setError("Informe a data de recebimento.");
        return false;
      }
      if (increment <= 0) {
        setError("Informe um valor de recebimento maior que zero.");
        return false;
      }
      if (increment > selectedPending + 0.00001) {
        setError(`Valor acima do saldo pendente (${money(selectedPending)}).`);
        return false;
      }
    }
    if (step === 3 && receive.conta_id === "") {
      setError("Selecione a conta financeira para concluir.");
      return false;
    }
    return true;
  }

  function nextReceiveStep() {
    if (!validateReceiveStep(receiveStep)) return;
    setError("");
    setReceiveStep((prev) => Math.min(4, (prev + 1) as ReceiveStep) as ReceiveStep);
  }

  function prevReceiveStep() {
    setError("");
    setReceiveStep((prev) => Math.max(1, (prev - 1) as ReceiveStep) as ReceiveStep);
  }

  function openResumoReport() {
    const rowsMap = new Map<string, { safra: string; cliente: string; venc: string; contas: number; total: number; recebido: number; saldo: number }>();
    for (const it of filtered) {
      const ct = it.contrato?.id ? contractById.get(it.contrato.id) : null;
      const safra = ct?.safra?.name ?? "SEM SAFRA";
      const cliente = it.cliente?.name ?? ct?.cliente?.name ?? "SEM CLIENTE";
      const venc = d(it.due_date);
      const key = `${safra}__${cliente}__${it.due_date || "SEM_VENC"}`;
      const curr = rowsMap.get(key) ?? { safra, cliente, venc, contas: 0, total: 0, recebido: 0, saldo: 0 };
      curr.contas += 1;
      curr.total += n(it.total_value);
      curr.recebido += n(it.received_value);
      curr.saldo += n(it.balance_value);
      rowsMap.set(key, curr);
    }
    const rows = [...rowsMap.values()].sort((a, b) => `${a.safra}|${a.cliente}|${a.venc}`.localeCompare(`${b.safra}|${b.cliente}|${b.venc}`, "pt-BR"));
    const total = rows.reduce((acc, r) => acc + r.total, 0);
    const recebido = rows.reduce((acc, r) => acc + r.recebido, 0);
    const saldo = rows.reduce((acc, r) => acc + r.saldo, 0);
    const htmlRows = rows.map((r) => `
      <tr>
        <td>${escapeHtml(r.safra)}</td>
        <td>${escapeHtml(r.cliente)}</td>
        <td>${escapeHtml(r.venc)}</td>
        <td class="num">${r.contas}</td>
        <td class="num">${money(r.total)}</td>
        <td class="num">${money(r.recebido)}</td>
        <td class="num">${money(r.saldo)}</td>
      </tr>
    `).join("");
    openPrintHtml(
      "Resumo de Contas a Receber",
      `
        <h1>Relatório resumo de Contas a Receber</h1>
        <p class="muted">Agrupado por Safra, Cliente e Vencimento</p>
        <div class="kpi">
          <div class="card"><div class="label">Títulos</div><div class="value">${filtered.length}</div></div>
          <div class="card"><div class="label">Valor total</div><div class="value">${money(total)}</div></div>
          <div class="card"><div class="label">Valor recebido</div><div class="value">${money(recebido)}</div></div>
          <div class="card"><div class="label">Saldo</div><div class="value">${money(saldo)}</div></div>
        </div>
        <table>
          <thead><tr><th>Safra</th><th>Cliente</th><th>Vencimento</th><th class="num">Contas</th><th class="num">Total</th><th class="num">Recebido</th><th class="num">Saldo</th></tr></thead>
          <tbody>${htmlRows || '<tr><td colspan="7">Sem dados para os filtros selecionados.</td></tr>'}</tbody>
        </table>
      `,
      "portrait"
    );
  }

  function openAnaliticoReport() {
    const groups = new Map<string, { safra: string; produtor: string; cliente: string; contas: ContaReceber[] }>();
    for (const it of filtered) {
      const ct = it.contrato?.id ? contractById.get(it.contrato.id) : null;
      const safra = ct?.safra?.name ?? "SEM SAFRA";
      const produtor = it.produtor?.name ?? ct?.produtor?.name ?? "SEM PRODUTOR";
      const cliente = it.cliente?.name ?? ct?.cliente?.name ?? "SEM CLIENTE";
      const key = `${safra}__${produtor}__${cliente}`;
      const g = groups.get(key) ?? { safra, produtor, cliente, contas: [] };
      g.contas.push(it);
      groups.set(key, g);
    }
    const htmlGroups = [...groups.values()].map((g) => {
      const total = g.contas.reduce((acc, c) => acc + n(c.total_value), 0);
      const recebido = g.contas.reduce((acc, c) => acc + n(c.received_value), 0);
      const saldo = g.contas.reduce((acc, c) => acc + n(c.balance_value), 0);
      const rows = g.contas.map((c) => `
        <tr>
          <td>${escapeHtml(statusMeta(normalizeStatus(c)).label)}</td>
          <td>${escapeHtml(origem(c))}</td>
          <td>${escapeHtml(c.document_number || "-")}</td>
          <td>${escapeHtml(c.contrato?.code ?? "-")}</td>
          <td>${escapeHtml(d(c.date))}</td>
          <td>${escapeHtml(d(c.due_date))}</td>
          <td class="num">${money(c.total_value)}</td>
          <td class="num">${money(c.received_value)}</td>
          <td class="num">${money(c.balance_value)}</td>
        </tr>
      `).join("");
      return `
        <section class="group">
          <h3>${escapeHtml(g.safra)} · ${escapeHtml(g.produtor)} · ${escapeHtml(g.cliente)}</h3>
          <div class="kpi">
            <div class="card"><div class="label">Títulos</div><div class="value">${g.contas.length}</div></div>
            <div class="card"><div class="label">Total</div><div class="value">${money(total)}</div></div>
            <div class="card"><div class="label">Recebido</div><div class="value">${money(recebido)}</div></div>
            <div class="card"><div class="label">Saldo</div><div class="value">${money(saldo)}</div></div>
          </div>
          <table>
            <thead><tr><th>Status</th><th>Origem</th><th>Documento</th><th>Contrato</th><th>Data</th><th>Vencimento</th><th class="num">Total</th><th class="num">Recebido</th><th class="num">Saldo</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
      `;
    }).join("");
    openPrintHtml(
      "Analítico de Contas a Receber",
      `<h1>Relatório analítico de Contas a Receber</h1><p class="muted">Agrupado por Safra, Produtor e Cliente</p>${htmlGroups || '<p class="muted">Sem dados para os filtros selecionados.</p>'}`
    );
  }

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-5">
          {toast ? <div className="pointer-events-none fixed right-4 top-4 z-[70]"><div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${toast.kind === "success" ? "border-emerald-400/35 bg-emerald-500/20 text-emerald-100" : "border-rose-400/35 bg-rose-500/20 text-rose-100"}`}>{toast.msg}</div></div> : null}
          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Financeiro</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Contas a receber</h1>
              <p className="mt-1 text-sm text-zinc-300">Faturas de Contratos e Vendas de produtos.</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Relatorios</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={openResumoReport} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/10">Resumo</button>
                  <button onClick={openAnaliticoReport} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/10">Analitico</button>
                </div>
              </div>
            </div>
          </section>
          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3.5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
            <div className="flex flex-wrap items-center gap-2">
              <select value={safraId} onChange={(e) => setSafraId(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-[126px] flex-1 rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100"><option value="" style={optionStyle}>Safra</option>{safras.map((s) => <option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>)}</select>
              <select value={grupoId} onChange={(e) => setGrupoId(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-[126px] flex-1 rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100"><option value="" style={optionStyle}>Grupo</option>{grupos.map((g) => <option key={g.id} value={g.id} style={optionStyle}>{g.name}</option>)}</select>
              <select value={produtorId} onChange={(e) => setProdutorId(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-[126px] flex-1 rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100"><option value="" style={optionStyle}>Produtor</option>{produtores.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{produtorDisplayLabel(p)}</option>)}</select>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-[126px] flex-1 rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100"><option value="" style={optionStyle}>Cliente</option>{clientes.map((c) => <option key={c.id} value={c.id} style={optionStyle}>{c.name}</option>)}</select>
              <select value={status} onChange={(e) => setStatus(e.target.value as "all" | Status)} className="min-w-[126px] flex-1 rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100"><option value="all" style={optionStyle}>Status</option><option value="open" style={optionStyle}>Pendente</option><option value="overdue" style={optionStyle}>Vencido</option><option value="partial" style={optionStyle}>Parcial</option><option value="paid" style={optionStyle}>Recebido</option><option value="canceled" style={optionStyle}>Cancelado</option></select>
              <div className="flex min-w-[260px] flex-1 gap-2"><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100 [color-scheme:dark]" /><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100 [color-scheme:dark]" /></div>
            </div>
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
          </section>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[
              { label: "Valor total", value: stats.total, tone: "border-amber-400/30 bg-amber-500/10", icon: "R$", itone: "amber" as const },
              { label: "Pendente (R$)", value: stats.open, tone: "border-amber-400/30 bg-amber-500/10", icon: "P", itone: "amber" as const },
              { label: "Parcial (R$)", value: stats.partial, tone: "border-sky-400/30 bg-sky-500/10", icon: "1/2", itone: "sky" as const },
              { label: "Vencido (R$)", value: stats.overdue, tone: "border-rose-400/30 bg-rose-500/10", icon: "!", itone: "rose" as const },
              { label: "Recebido (R$)", value: stats.paid, tone: "border-emerald-400/30 bg-emerald-500/10", icon: "✓", itone: "emerald" as const }
            ].map((card) => (
              <article key={card.label} className={`h-[96px] rounded-3xl border px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] ${card.tone}`}>
                <div className="grid h-full grid-cols-[40px_1fr] items-center gap-2.5">
                  <CardIcon tone={card.itone}>
                    <span className="text-[12px] font-black">{card.icon}</span>
                  </CardIcon>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300/90">{card.label}</p>
                    <p className="mt-0.5 text-[16px] font-black leading-none text-white">{money(card.value).replace(/^R\$\s?/, "")}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-black text-white">Volume mensal de vendas ({monthlySales.year})</p>
            <p className="mt-1 text-xs text-zinc-400">Total mensal de contas a receber no ano atual.</p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/30 p-3">
              <div className="h-56 w-full">
                <svg viewBox="0 0 1000 280" className="h-full w-full">
                  <line x1="44" y1="20" x2="44" y2="230" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                  <line x1="44" y1="230" x2="968" y2="230" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                  {[0, 1, 2, 3].map((i) => {
                    const y = 230 - (i * 70);
                    return <line key={`grid-${i}`} x1="44" y1={y} x2="968" y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />;
                  })}
                  {(() => {
                    const max = monthlySales.max || 1;
                    const stepX = (968 - 44) / 11;
                    const toY = (value: number) => 230 - ((value / max) * 210);
                    const points = monthlySales.months.map((m, i) => ({ x: 44 + (i * stepX), y: toY(m.value), label: m.label, value: m.value }));
                    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                    return <>
                      <path d={path} fill="none" stroke="rgba(16,185,129,0.95)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                      {points.map((p) => (
                        <g key={`pt-${p.label}`}>
                          <text
                            x={p.x}
                            y={Math.max(p.y - 12, 14)}
                            textAnchor="middle"
                            fontSize="10"
                            fill="rgba(228,228,231,0.95)"
                            fontWeight="700"
                          >
                            {money(p.value)}
                          </text>
                          <circle cx={p.x} cy={p.y} r="4.5" fill="rgb(16,185,129)" />
                          <circle cx={p.x} cy={p.y} r="8" fill="rgba(16,185,129,0.22)" />
                        </g>
                      ))}
                    </>;
                  })()}
                  {monthlySales.months.map((m, i) => {
                    const stepX = (968 - 44) / 11;
                    const x = 44 + (i * stepX);
                    return <text key={`x-${m.month}`} x={x} y="252" textAnchor="middle" fontSize="11" fill="rgba(228,228,231,0.8)" className="uppercase">{m.label}</text>;
                  })}
                </svg>
              </div>
            </div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-white">Lista</p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
                <button onClick={toggleAll} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-200">Selecionar lista</button>
                <button onClick={() => requestEstorno(reversibleIds)} disabled={!reversibleIds.length} className="rounded-2xl border border-zinc-400/25 bg-zinc-500/15 px-3 py-1.5 text-xs font-medium text-zinc-100 disabled:opacity-50">Estornar ({reversibleIds.length})</button>
                <button onClick={() => openReceive(selectedIds)} disabled={!selectedIds.length} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-3 py-1.5 text-xs font-black text-emerald-100 disabled:opacity-50">Receber selecionados ({selectedIds.length})</button>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <div className="hidden min-w-[1188px] grid-cols-[40px_88px_82px_78px_84px_96px_130px_130px_96px_96px_96px_82px] gap-2 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 xl:grid">
                <div>Sel</div><div>Status</div><div>Venc.</div><div>Origem</div><div>Doc.</div><div>Contrato</div><div>Cliente</div><div>Produtor</div><div>Total</div><div>Recebido</div><div>Saldo</div><div className="text-right">Ações</div>
              </div>
              <div className="mt-3 space-y-2 xl:min-w-[1188px]">
                {filtered.map((it) => {
                  const st = normalizeStatus(it);
                  const m = statusMeta(st);
                  return <div key={it.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2.5 hover:bg-white/5">
                    <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-[40px_88px_82px_78px_84px_96px_130px_130px_96px_96px_96px_82px] xl:items-center xl:gap-2">
                      <div><input type="checkbox" checked={selectedIds.includes(it.id)} disabled={st === "paid"} onChange={() => toggleOne(it.id)} className="h-4 w-4 rounded border-white/20 bg-zinc-900" /></div>
                      <div><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${m.cls}`}>{m.label}</span></div>
                      <div className="text-[12px] font-medium text-zinc-100">{d(it.due_date)}</div>
                      <div className="text-[12px] font-medium text-zinc-100">{origem(it)}</div>
                      <div className="text-[10px] font-semibold text-zinc-100">{it.document_number || "-"}</div>
                      <div className="text-[12px] font-medium text-zinc-100">{it.contrato?.code ?? "-"}</div>
                      <div className="truncate text-[12px] font-medium text-zinc-100">{it.cliente?.name ?? "-"}</div>
                      <div className="truncate text-[12px] font-medium text-zinc-100">{it.produtor?.name ?? "-"}</div>
                      <div className="text-[10px] font-semibold text-zinc-100">{money(it.total_value)}</div>
                      <div className="text-[10px] font-semibold text-zinc-100">{money(it.received_value)}</div>
                      <div className="text-[10px] font-semibold text-zinc-100">{money(it.balance_value)}</div>
                      <div className="flex justify-end whitespace-nowrap"><button onClick={() => (st === "paid" ? requestEstorno([it.id]) : openReceive([it.id]))} className={`rounded-xl px-1.5 py-1 text-[10px] font-semibold ${st === "paid" ? "border border-zinc-500/25 bg-zinc-500/15 text-zinc-200" : "border border-emerald-400/25 bg-emerald-500/15 text-emerald-100"}`}>{st === "paid" ? "Estornar" : "Receber"}</button></div>
                    </div>
                  </div>;
                })}
              </div>
            </div>
          </section>

          {receiveWizardOpen ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md" onClick={closeReceiveModal} />
              <div className="relative w-full max-w-[920px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/92 shadow-2xl">
                <div className="border-b border-white/10 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">Novo recebimento</p>
                      <p className="mt-1 text-xs text-zinc-400">Etapa {receiveStep} de {receiveSteps.length} · {selectedIds.length} conta(s)</p>
                    </div>
                    <button onClick={closeReceiveModal} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">x</button>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    {receiveSteps.map((step) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          if (step.id > receiveStep && !validateReceiveStep(receiveStep)) return;
                          setError("");
                          setReceiveStep(step.id);
                        }}
                        className={`rounded-xl border px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] transition ${
                          receiveStep === step.id
                            ? "border-accent-400/40 bg-accent-500/20 text-accent-100"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                        }`}
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  {receiveStep === 1 ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data recebimento</label>
                        <input type="date" value={receive.receive_date} onChange={(e) => setReceive((p) => ({ ...p, receive_date: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Valor recebido (Saldo: {money(selectedPending)})</label>
                        <input value={receive.receive_increment} onChange={(e) => setReceive((p) => ({ ...p, receive_increment: e.target.value }))} placeholder="0,00" className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" />
                      </div>
                    </div>
                  ) : null}
                  {receiveStep === 2 ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Desconto</label>
                        <input value={receive.discount_value} onChange={(e) => setReceive((p) => ({ ...p, discount_value: e.target.value }))} placeholder="0,00" className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Acréscimo</label>
                        <input value={receive.addition_value} onChange={(e) => setReceive((p) => ({ ...p, addition_value: e.target.value }))} placeholder="0,00" className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" />
                      </div>
                    </div>
                  ) : null}
                  {receiveStep === 3 ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Forma recebimento</label>
                        <select value={receive.payment_method} onChange={(e) => setReceive((p) => ({ ...p, payment_method: e.target.value as ReceiveState["payment_method"] }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100">
                          <option value="pix">PIX</option><option value="boleto">Boleto</option><option value="transfer">Transferência</option><option value="card">Cartão</option><option value="cash">Dinheiro</option><option value="other">Outro</option>
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Conta</label>
                        <select value={receive.conta_id} onChange={(e) => setReceive((p) => ({ ...p, conta_id: e.target.value === "" ? "" : Number(e.target.value) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100">
                          <option value="">Selecione</option>{contas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : null}
                  {receiveStep === 4 ? (
                    <div className="grid gap-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Contas selecionadas</p><p className="mt-1 text-lg font-black text-white">{selectedIds.length}</p></div>
                        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Saldo pendente</p><p className="mt-1 text-lg font-black text-white">{money(selectedPending)}</p></div>
                        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3"><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Valor informado</p><p className="mt-1 text-lg font-black text-white">{money(receive.receive_increment || "0")}</p></div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3 text-sm text-zinc-300">
                        <p><span className="text-zinc-400">Data:</span> {receive.receive_date ? d(receive.receive_date) : "-"}</p>
                        <p><span className="text-zinc-400">Forma:</span> {receive.payment_method.toUpperCase()}</p>
                        <p><span className="text-zinc-400">Conta:</span> {contas.find((c) => c.id === Number(receive.conta_id))?.name ?? "-"}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-white/10 p-5">
                  <button onClick={closeReceiveModal} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Cancelar</button>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={prevReceiveStep} disabled={receiveStep === 1 || receiving} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200 disabled:opacity-50">Voltar</button>
                    {receiveStep < 4 ? (
                      <button type="button" onClick={nextReceiveStep} disabled={receiving} className="rounded-2xl border border-accent-400/25 bg-accent-500/15 px-5 py-2.5 text-sm font-black text-accent-100">Próximo</button>
                    ) : (
                      <button type="button" onClick={() => void runReceive()} disabled={receiving} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100">{receiving ? "Processando..." : "Confirmar recebimento"}</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {receiveOpen ? <div className="fixed inset-0 z-50 grid place-items-center px-4"><button className="absolute inset-0 bg-zinc-950/60" onClick={() => setReceiveOpen(false)} /><div className="relative w-full max-w-[860px] rounded-3xl border border-white/15 bg-zinc-900/90"><div className="border-b border-white/10 p-5"><p className="text-sm font-black text-white">Recebimento ({selectedIds.length})</p></div><div className="grid gap-3 p-5 lg:grid-cols-3"><input type="date" value={receive.receive_date} onChange={(e) => setReceive((p) => ({ ...p, receive_date: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" /><input value={receive.receive_increment} onChange={(e) => setReceive((p) => ({ ...p, receive_increment: e.target.value }))} placeholder={`Saldo: ${money(selectedPending)}`} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /><select value={receive.conta_id} onChange={(e) => setReceive((p) => ({ ...p, conta_id: e.target.value === "" ? "" : Number(e.target.value) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="">Conta</option>{contas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="flex justify-end gap-2 border-t border-white/10 p-5"><button onClick={() => setReceiveOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Cancelar</button><button onClick={() => setReceiveConfirmOpen(true)} disabled={receiving} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100">{receiving ? "Processando..." : "Efetuar recebimento"}</button></div></div></div> : null}
          {receiveConfirmOpen ? <div className="fixed inset-0 z-[60] grid place-items-center px-4"><button className="absolute inset-0 bg-zinc-950/60" onClick={() => setReceiveConfirmOpen(false)} /><div className="relative w-full max-w-[560px] rounded-3xl border border-white/15 bg-zinc-900/95"><div className="border-b border-white/10 p-5"><p className="text-lg font-black text-white">Confirmar recebimento</p><div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3"><p className="text-sm font-semibold text-emerald-100">Marcação: ao confirmar, o sistema vai registrar o recebimento de {selectedIds.length} título(s), atualizar os valores recebidos e recalcular o saldo pendente.</p></div></div><div className="flex justify-end gap-2 p-5"><button onClick={() => setReceiveConfirmOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Não</button><button onClick={() => void runReceive()} disabled={receiving} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100">{receiving ? "Processando..." : "Sim, confirmar"}</button></div></div></div> : null}
          {estornoOpen ? <div className="fixed inset-0 z-50 grid place-items-center px-4"><button className="absolute inset-0 bg-zinc-950/60" onClick={() => setEstornoOpen(false)} /><div className="relative w-full max-w-[520px] rounded-3xl border border-white/15 bg-zinc-900/90"><div className="border-b border-white/10 p-5"><p className="text-lg font-black text-white">Confirmar estorno</p><p className="mt-2 text-sm text-zinc-300">Deseja estornar {estornoIds.length} título(s)?</p></div><div className="flex justify-end gap-2 p-5"><button onClick={() => setEstornoOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Não</button><button onClick={() => void confirmEstorno()} disabled={estornando} className="rounded-2xl border border-zinc-400/25 bg-zinc-500/15 px-5 py-2.5 text-sm font-black text-zinc-100">{estornando ? "Estornando..." : "Sim, estornar"}</button></div></div></div> : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}
