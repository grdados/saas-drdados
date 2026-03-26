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
import { formatCurrencyBRL, formatDateBR, formatDateTimeBR } from "@/lib/locale";

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

function prettyMoney(v: unknown) {
  const n = parseNumber(v);
  return formatCurrencyBRL(n);
}

function prettyDate(s: string | null | undefined) {
  if (!s) return "-";
  const dt = new Date(`${s}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return s;
  return formatDateBR(dt);
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
        .kpi { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
        .card { border: 1px solid #e2e2e2; border-radius: 8px; padding: 8px; }
        .label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
        .value { margin-top: 4px; font-size: 18px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #e2e2e2; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f7f7f7; }
        td.num, th.num { text-align: right; white-space: nowrap; }
        .footer {
          margin-top: 16px;
          border-top: 1px solid #e4e4e7;
          padding-top: 8px;
          color: #52525b;
          font-size: 11px;
          line-height: 1.45;
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
  discount_value: string;
  addition_value: string;
  payment_method: "pix" | "boleto" | "transfer" | "card" | "cash" | "other";
  conta_id: number | "";
  status: ContaStatus;
};

const DEFAULT_PAYMENT: PaymentState = {
  payment_date: "",
  payment_increment: "",
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
  const [simPaymentDate, setSimPaymentDate] = useState("");
  const [simAntecipMonthPct, setSimAntecipMonthPct] = useState("0");
  const [simJurosMonthPct, setSimJurosMonthPct] = useState("0");
  const [simSacaPrice, setSimSacaPrice] = useState("0");

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

  const selectedPayItems = useMemo(() => items.filter((x) => selectedIds.includes(x.id)), [items, selectedIds]);
  const paidFilteredIds = useMemo(
    () => filtered.filter((x) => normalizeStatus(x) === "paid").map((x) => x.id),
    [filtered]
  );
  const selectedPendingTotal = useMemo(
    () => selectedPayItems.reduce((acc, it) => acc + Math.max(parseNumber(it.balance_value), 0), 0),
    [selectedPayItems]
  );
  const modalAllPaid = useMemo(
    () => selectedPayItems.length > 0 && selectedPayItems.every((x) => normalizeStatus(x) === "paid"),
    [selectedPayItems]
  );
  const isEstornoMode = modalAllPaid && payment.status !== "paid";

  const simulation = useMemo(() => {
    const paymentDate = simPaymentDate ? new Date(`${simPaymentDate}T00:00:00`) : null;
    const antecipPct = parseNumber(simAntecipMonthPct) / 100;
    const jurosPct = parseNumber(simJurosMonthPct) / 100;
    const sacaPrice = parseNumber(simSacaPrice);

    const rows = filtered
      .map((it) => {
        const statusNow = normalizeStatus(it);
        if (statusNow === "paid" || statusNow === "canceled") return null;

        const base = Math.max(0, parseNumber(it.balance_value || 0));
        const dueDate = it.due_date ? new Date(`${it.due_date}T00:00:00`) : null;
        let antecipValue = 0;
        let jurosValue = 0;
        if (paymentDate && dueDate && base > 0) {
          const diffDays = Math.round((dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            const monthsAdvance = diffDays / 30;
            antecipValue = base * antecipPct * monthsAdvance;
          } else if (diffDays < 0) {
            const monthsDelay = Math.abs(diffDays) / 30;
            jurosValue = base * jurosPct * monthsDelay;
          }
        }
        const previsto = Math.max(0, base - antecipValue + jurosValue);
        return {
          id: it.id,
          nf: it.invoice_number || "-",
          pedido: it.pedido?.code || "-",
          fornecedor: it.fornecedor?.name || "-",
          produtor: it.produtor?.name || "-",
          dueDate: it.due_date || "",
          base,
          antecipValue,
          jurosValue,
          previsto
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const totalBase = rows.reduce((acc, r) => acc + r.base, 0);
    const totalAntecip = rows.reduce((acc, r) => acc + r.antecipValue, 0);
    const totalJuros = rows.reduce((acc, r) => acc + r.jurosValue, 0);
    const totalPrevisto = rows.reduce((acc, r) => acc + r.previsto, 0);
    const sacksNeeded = sacaPrice > 0 ? totalPrevisto / sacaPrice : 0;
    return {
      rows,
      totalBase,
      totalAntecip,
      totalJuros,
      totalPrevisto,
      sacksNeeded,
      sacaPrice,
      paymentDate: simPaymentDate
    };
  }, [filtered, simPaymentDate, simAntecipMonthPct, simJurosMonthPct, simSacaPrice]);

  function openResumoReport() {
    const pedidoById = new Map(Array.from(Object.entries(pedidosSafraById)).map(([k, v]) => [Number(k), v]));
    const insumoById = new Map(insumos.map((i) => [i.id, i.categoria?.name ?? "SEM CATEGORIA"]));
    const fatById = new Map(faturamentos.map((f) => [f.id, f]));
    type GroupSummary = {
      safra: string;
      categoria: string;
      vencimento: string;
      contas: number;
      total: number;
      pago: number;
      saldo: number;
    };
    const map = new Map<string, GroupSummary>();

    for (const it of filtered) {
      const safra = pedidoById.get(it.pedido?.id ?? -1)?.name ?? "SEM SAFRA";
      const vencRaw = it.due_date ?? "";
      const venc = prettyDate(vencRaw);
      const fat = it.faturamento?.id ? fatById.get(it.faturamento.id) : null;
      const categories = new Set<string>();
      for (const row of fat?.items || []) {
        const pid = row.produto?.id ?? null;
        if (!pid) continue;
        categories.add(insumoById.get(pid) ?? "SEM CATEGORIA");
      }
      if (categories.size === 0) categories.add("SEM CATEGORIA");
      const per = Math.max(1, categories.size);
      const total = parseNumber(it.total_value);
      const pago = parseNumber(it.paid_value);
      const saldo = parseNumber(it.balance_value);
      for (const categoria of categories) {
        const key = `${safra}__${categoria}__${vencRaw || "SEM_VENC"}`;
        const curr = map.get(key) ?? { safra, categoria, vencimento: venc, contas: 0, total: 0, pago: 0, saldo: 0 };
        curr.contas += 1;
        curr.total += total / per;
        curr.pago += pago / per;
        curr.saldo += saldo / per;
        map.set(key, curr);
      }
    }
    const groups = [...map.values()].sort((a, b) =>
      `${a.safra}|${a.categoria}|${a.vencimento}`.localeCompare(`${b.safra}|${b.categoria}|${b.vencimento}`, "pt-BR")
    );
    const total = groups.reduce((acc, g) => acc + g.total, 0);
    const pago = groups.reduce((acc, g) => acc + g.pago, 0);
    const saldo = groups.reduce((acc, g) => acc + g.saldo, 0);
    const rows = groups
      .map(
        (g) => `
          <tr>
            <td>${escapeHtml(g.safra)}</td>
            <td>${escapeHtml(g.categoria)}</td>
            <td>${escapeHtml(g.vencimento)}</td>
            <td class="num">${g.contas}</td>
            <td class="num">${prettyMoney(g.total)}</td>
            <td class="num">${prettyMoney(g.pago)}</td>
            <td class="num">${prettyMoney(g.saldo)}</td>
          </tr>
        `
      )
      .join("");

    openPrintHtml(
      "Resumo de Contas a Pagar",
      `
        <h1>Relatório resumo de Contas a Pagar</h1>
        <p class="muted">Agrupado por Safra, Categoria e Vencimento Â· Gerado em ${new Date().toLocaleString("pt-BR")}</p>
        <div class="kpi">
          <div class="card"><div class="label">Contas</div><div class="value">${filtered.length}</div></div>
          <div class="card"><div class="label">Valor total</div><div class="value">${prettyMoney(total)}</div></div>
          <div class="card"><div class="label">Valor pago</div><div class="value">${prettyMoney(pago)}</div></div>
          <div class="card"><div class="label">Saldo</div><div class="value">${prettyMoney(saldo)}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Safra</th>
              <th>Categoria</th>
              <th>Vencimento</th>
              <th class="num">Contas</th>
              <th class="num">Total</th>
              <th class="num">Pago</th>
              <th class="num">Saldo</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7">Sem dados para os filtros selecionados.</td></tr>'}</tbody>
        </table>
      `,
      "portrait"
    );
  }

  function openAnaliticoReport() {
    const pedidoById = new Map(Array.from(Object.entries(pedidosSafraById)).map(([k, v]) => [Number(k), v]));
    const fatById = new Map(faturamentos.map((f) => [f.id, f]));
    const insumoById = new Map(insumos.map((i) => [i.id, i.categoria?.name ?? "SEM CATEGORIA"]));
    type Analitico = {
      safra: string;
      grupo: string;
      produtor: string;
      contas: Array<{
        status: string;
        nf: string;
        data: string;
        venc: string;
        pedido: string;
        fornecedor: string;
        categoria: string;
        total: number;
        pago: number;
        saldo: number;
      }>;
    };
    const map = new Map<string, Analitico>();
    for (const it of filtered) {
      const safra = pedidoById.get(it.pedido?.id ?? -1)?.name ?? "SEM SAFRA";
      const grupo = it.grupo?.name ?? "SEM GRUPO";
      const produtor = it.produtor?.name ?? "SEM PRODUTOR";
      const key = `${safra}__${grupo}__${produtor}`;
      const group = map.get(key) ?? { safra, grupo, produtor, contas: [] };
      const fat = it.faturamento?.id ? fatById.get(it.faturamento.id) : null;
      const cats = new Set<string>();
      for (const row of fat?.items || []) {
        const pid = row.produto?.id ?? null;
        if (!pid) continue;
        cats.add(insumoById.get(pid) ?? "SEM CATEGORIA");
      }
      group.contas.push({
        status: statusMeta(normalizeStatus(it)).label,
        nf: it.invoice_number || "-",
        data: prettyDate(it.date),
        venc: prettyDate(it.due_date),
        pedido: it.pedido?.code ?? "-",
        fornecedor: it.fornecedor?.name ?? "-",
        categoria: cats.size ? [...cats].join(", ") : "SEM CATEGORIA",
        total: parseNumber(it.total_value),
        pago: parseNumber(it.paid_value),
        saldo: parseNumber(it.balance_value)
      });
      map.set(key, group);
    }

    const groups = [...map.values()].sort((a, b) =>
      `${a.safra}|${a.grupo}|${a.produtor}`.localeCompare(`${b.safra}|${b.grupo}|${b.produtor}`, "pt-BR")
    );
    const htmlGroups = groups
      .map((g) => {
        const total = g.contas.reduce((acc, c) => acc + c.total, 0);
        const pago = g.contas.reduce((acc, c) => acc + c.pago, 0);
        const saldo = g.contas.reduce((acc, c) => acc + c.saldo, 0);
        const rows = g.contas
          .map(
            (c) => `
              <tr>
                <td>${escapeHtml(c.status)}</td>
                <td>${escapeHtml(c.nf)}</td>
                <td>${escapeHtml(c.data)}</td>
                <td>${escapeHtml(c.venc)}</td>
                <td>${escapeHtml(c.pedido)}</td>
                <td>${escapeHtml(c.fornecedor)}</td>
                <td>${escapeHtml(c.categoria)}</td>
                <td class="num">${prettyMoney(c.total)}</td>
                <td class="num">${prettyMoney(c.pago)}</td>
                <td class="num">${prettyMoney(c.saldo)}</td>
              </tr>
            `
          )
          .join("");
        return `
          <section class="group">
            <h3>${escapeHtml(g.safra)} Â· ${escapeHtml(g.grupo)} Â· ${escapeHtml(g.produtor)}</h3>
            <div class="kpi">
              <div class="card"><div class="label">Contas</div><div class="value">${g.contas.length}</div></div>
              <div class="card"><div class="label">Total</div><div class="value">${prettyMoney(total)}</div></div>
              <div class="card"><div class="label">Pago</div><div class="value">${prettyMoney(pago)}</div></div>
              <div class="card"><div class="label">Saldo</div><div class="value">${prettyMoney(saldo)}</div></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>NF</th>
                  <th>Data</th>
                  <th>Vencimento</th>
                  <th>Pedido</th>
                  <th>Fornecedor</th>
                  <th>Categoria</th>
                  <th class="num">Total</th>
                  <th class="num">Pago</th>
                  <th class="num">Saldo</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>
        `;
      })
      .join("");

    openPrintHtml(
      "AnalÃ­tico de Contas a Pagar",
      `
        <h1>Relatório analítico de Contas a Pagar</h1>
        <p class="muted">Agrupado por Safra, Grupo e Produtor Â· Gerado em ${new Date().toLocaleString("pt-BR")}</p>
        ${htmlGroups || '<p class="muted">Sem dados para os filtros selecionados.</p>'}
      `
    );
  }

  function printSimulationReport() {
    const htmlRows = simulation.rows
      .map(
        (r) => `
          <tr>
            <td>${escapeHtml(r.nf)}</td>
            <td>${escapeHtml(r.pedido)}</td>
            <td>${escapeHtml(r.fornecedor)}</td>
            <td>${escapeHtml(r.produtor)}</td>
            <td>${escapeHtml(prettyDate(r.dueDate))}</td>
            <td class="num">${prettyMoney(r.base)}</td>
            <td class="num">${prettyMoney(r.antecipValue)}</td>
            <td class="num">${prettyMoney(r.jurosValue)}</td>
            <td class="num">${prettyMoney(r.previsto)}</td>
          </tr>
        `
      )
      .join("");

    const generatedAt = new Date().toLocaleString("pt-BR");
    const logoUrl = `${window.location.origin}/logo_horizontal.png`;
    const html = `
      <!doctype html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Simulacao de Pagamento - Contas a Pagar</title>
        <style>
          @page { size: A4 landscape; margin: 12mm 10mm; }
          body { font-family: Arial, sans-serif; color: #111; margin: 0; }
          .page { padding: 12px 10px; }
          .header { display: grid; grid-template-columns: 260px 1fr; gap: 12px; align-items: center; border: 1px solid #ddd; border-radius: 10px; padding: 8px 10px; }
          .header img { max-height: 52px; width: auto; }
          .header-info { text-align: right; font-size: 11px; color: #555; line-height: 1.4; }
          h1 { margin: 14px 0 6px; font-size: 22px; }
          .muted { font-size: 12px; color: #555; }
          .kpi { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 8px; }
          .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
          .value { margin-top: 4px; font-size: 18px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #e2e2e2; padding: 6px 8px; text-align: left; }
          th { background: #f7f7f7; }
          .num { text-align: right; white-space: nowrap; }
          .footer { margin-top: 14px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 11px; color: #555; line-height: 1.45; }
        </style>
      </head>
      <body>
        <div class="page">
          <header class="header">
            <img src="${logoUrl}" alt="GR Dados" />
            <div class="header-info">
              <strong>Simulacao de Pagamento - Contas a Pagar</strong><br/>
              Cliente: GR Dados Demo<br/>
              Emissao: ${generatedAt}
            </div>
          </header>
          <h1>Resumo da Simulacao</h1>
          <p class="muted">Data pagamento: ${escapeHtml(prettyDate(simulation.paymentDate || ""))} Â· Antecipacao ao mes: ${escapeHtml(simAntecipMonthPct)}% Â· Juros ao mes: ${escapeHtml(simJurosMonthPct)}% Â· Preco da saca: ${prettyMoney(simulation.sacaPrice)}</p>
          <div class="kpi">
            <div class="card"><div class="label">Valor total</div><div class="value">${prettyMoney(simulation.totalBase)}</div></div>
            <div class="card"><div class="label">Valor antecipacao</div><div class="value">${prettyMoney(simulation.totalAntecip)}</div></div>
            <div class="card"><div class="label">Valor juros</div><div class="value">${prettyMoney(simulation.totalJuros)}</div></div>
            <div class="card"><div class="label">Valor previsto</div><div class="value">${prettyMoney(simulation.totalPrevisto)}</div></div>
            <div class="card"><div class="label">Sacas necessarias</div><div class="value">${simulation.sacksNeeded.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>NF</th>
                <th>Pedido</th>
                <th>Fornecedor</th>
                <th>Produtor</th>
                <th>Vencimento</th>
                <th class="num">Base</th>
                <th class="num">Antecipacao</th>
                <th class="num">Juros</th>
                <th class="num">Previsto</th>
              </tr>
            </thead>
            <tbody>${htmlRows || '<tr><td colspan="9">Sem dados para os filtros selecionados.</td></tr>'}</tbody>
          </table>
          <footer class="footer">
            <strong>GR Dados</strong> · Todos os direitos reservados<br/>
            AV 22 de Abril, 519 - Centro - Laguna Carapa - MS Â· CEP 79920-000<br/>
            Contato: (67) 99869-8159
          </footer>
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
    const ids = filtered.filter((x) => normalizeStatus(x) !== "paid").map((x) => x.id);
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
      status: canReopen ? "open" : "paid"
    });
    setPayOpen(true);
  }

  function openBulkReversal() {
    if (!paidFilteredIds.length) return;
    setSelectedIds(paidFilteredIds);
    setPayment({
      ...DEFAULT_PAYMENT,
      status: "open"
    });
    setPayOpen(true);
  }

  async function runPayment() {
    const token = getAccessToken();
    if (!token || !selectedIds.length) return;
    const selected = items.filter((x) => selectedIds.includes(x.id));
    const allPaid = selected.every((x) => normalizeStatus(x) === "paid");
    const isReversal = allPaid && payment.status !== "paid";
    const confirmText = isReversal
      ? selectedIds.length > 1
        ? "Confirmar estorno em lote?"
        : "Confirmar estorno da fatura selecionada?"
      : selectedIds.length > 1
        ? "Confirmar pagamento em lote?"
        : "Confirmar pagamento da fatura selecionada?";
    if (!window.confirm(confirmText)) return;
    setPaying(true);
    setError("");
    try {
      const pendingTotal = selected.reduce((acc, it) => acc + Math.max(parseNumber(it.balance_value), 0), 0);
      const increment = payment.payment_increment ? parseNumber(payment.payment_increment) : 0;
      if (increment > pendingTotal + 0.00001) {
        setError(`Valor de pagamento acima do saldo pendente (${prettyMoney(pendingTotal)}).`);
        setPaying(false);
        return;
      }
      const payload = {
        payment_date: payment.payment_date || null,
        payment_increment: increment > 0 ? increment : undefined,
        discount_value: parseNumber(payment.discount_value || "0"),
        addition_value: parseNumber(payment.addition_value || "0"),
        payment_method: payment.payment_method,
        conta_id: payment.conta_id === "" ? null : Number(payment.conta_id),
        status: payment.status
      };
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
            <p className="mt-1 text-sm text-zinc-300">Consulta e pagamento individual/lote com reflexo no faturamento.</p>
          </div>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-4 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por NF, fornecedor, produtor ou pedido..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50 xl:col-span-3"
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
              <div className="flex gap-2 sm:col-span-2 xl:col-span-2">
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
                onClick={openBulkReversal}
                disabled={!paidFilteredIds.length}
                className="rounded-2xl border border-zinc-400/25 bg-zinc-500/15 px-4 py-2 text-sm font-black text-zinc-100 hover:bg-zinc-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Estornar pagos filtrados ({paidFilteredIds.length})
              </button>
              <button
                onClick={toggleAll}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-zinc-200 hover:bg-white/10"
              >
                {(() => {
                  const selectableIds = filtered.filter((x) => normalizeStatus(x) !== "paid").map((x) => x.id);
                  return selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id)) ? "Desmarcar lista" : "Selecionar lista";
                })()}
              </button>
              <button
                onClick={exportCsv}
                className="rounded-2xl border border-sky-400/25 bg-sky-500/15 px-4 py-2 text-sm font-black text-sky-100 hover:bg-sky-500/25"
              >
                Exportar CSV
              </button>
              <button
                onClick={openResumoReport}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-zinc-100 hover:bg-white/10"
              >
                Relatório resumo
              </button>
              <button
                onClick={openAnaliticoReport}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-zinc-100 hover:bg-white/10"
              >
                Relatório analítico
              </button>
            </div>
            {error ? (
              <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
                {error}
              </div>
            ) : null}
          </section>

          <section className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
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

            <div className="mt-3 overflow-x-auto">
              <div className="hidden min-w-[1320px] grid-cols-[56px_110px_110px_100px_170px_170px_100px_110px_110px_110px_120px] gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 xl:grid">
                <div>Sel</div>
                <div>Status</div>
                <div>Venc.</div>
                <div>NF</div>
                <div>Fornecedor</div>
                <div>Produtor</div>
                <div>Pedido</div>
                <div>Total</div>
                <div>Pago</div>
                <div>Saldo</div>
                <div className="text-right">Ações</div>
              </div>

              <div className="mt-3 space-y-2 xl:min-w-[1320px]">
                {filtered.map((it) => {
                  const st = normalizeStatus(it);
                  const meta = statusMeta(st);
                  return (
                    <div key={it.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 hover:bg-white/5">
                      <div className="grid grid-cols-1 gap-2 xl:grid-cols-[56px_110px_110px_100px_170px_170px_100px_110px_110px_110px_120px] xl:items-center xl:gap-3">
                      <div>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(it.id)}
                          disabled={st === "paid"}
                          onChange={() => toggleOne(it.id)}
                          className="h-4 w-4 rounded border-white/20 bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </div>
                      <div>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
                      </div>
                      <div className="text-sm font-semibold text-zinc-100">{prettyDate(it.due_date)}</div>
                      <div className="text-sm font-black text-zinc-100">{it.invoice_number || "-"}</div>
                      <div className="truncate text-sm font-semibold text-zinc-100">{it.fornecedor?.name ?? "-"}</div>
                      <div className="truncate text-sm font-semibold text-zinc-100">{it.produtor?.name ?? "-"}</div>
                      <div className="truncate text-sm font-semibold text-zinc-100">{it.pedido?.code ?? "-"}</div>
                      <div className="text-sm font-black text-zinc-100">{prettyMoney(it.total_value)}</div>
                      <div className="text-sm font-black text-zinc-100">{prettyMoney(it.paid_value)}</div>
                      <div className="text-sm font-black text-zinc-100">{prettyMoney(it.balance_value)}</div>
                      <div className="text-right whitespace-nowrap">
                        <button
                          onClick={() => openPayFor([it.id])}
                          className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-[11px] font-black ${
                            st === "paid"
                              ? "border border-zinc-500/25 bg-zinc-500/15 text-zinc-200 hover:bg-zinc-500/25"
                              : "border border-emerald-400/25 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                          }`}
                        >
                          {st === "paid" ? "Estornar" : "Pagar"}
                        </button>
                      </div>
                    </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black text-white">Simulacao de pagamento</p>
                <p className="mt-1 text-xs text-zinc-400">Baseado nos filtros aplicados em Contas a Pagar.</p>
              </div>
              <button
                onClick={printSimulationReport}
                className="rounded-2xl border border-sky-400/25 bg-sky-500/15 px-4 py-2 text-sm font-black text-sky-100 hover:bg-sky-500/25"
              >
                Imprimir simulacao
              </button>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-4">
              <div className="grid gap-2">
                <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data pagamento</label>
                <input type="date" value={simPaymentDate} onChange={(e) => setSimPaymentDate(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent-500/50 [color-scheme:dark]" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">% Antecipacao mes</label>
                <input value={simAntecipMonthPct} onChange={(e) => setSimAntecipMonthPct(e.target.value)} inputMode="decimal" placeholder="0,00" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100 outline-none focus:border-accent-500/50" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">% Juros mes</label>
                <input value={simJurosMonthPct} onChange={(e) => setSimJurosMonthPct(e.target.value)} inputMode="decimal" placeholder="0,00" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100 outline-none focus:border-accent-500/50" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Preco produto (saca)</label>
                <input value={simSacaPrice} onChange={(e) => setSimSacaPrice(e.target.value)} inputMode="decimal" placeholder="0,00" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100 outline-none focus:border-accent-500/50" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-5">
              {[
                { label: "Valor total", value: prettyMoney(simulation.totalBase) },
                { label: "Valor antecipacao", value: prettyMoney(simulation.totalAntecip) },
                { label: "Valor juros", value: prettyMoney(simulation.totalJuros) },
                { label: "Valor previsto", value: prettyMoney(simulation.totalPrevisto) },
                { label: "Sacas necessarias", value: simulation.sacksNeeded.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) }
              ].map((c) => (
                <div key={c.label} className="rounded-2xl border border-white/10 bg-zinc-950/45 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">{c.label}</p>
                  <p className="mt-2 text-xl font-black text-white">{c.value}</p>
                </div>
              ))}
            </div>
          </section>

          {payOpen ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setPayOpen(false)} aria-label="Fechar" />
              <div className="relative w-full max-w-[860px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/90 shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <p className="text-sm font-black text-white">{isEstornoMode ? "Estorno" : "Pagamento"} ({selectedIds.length} conta(s))</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {isEstornoMode ? "Estorno individual ou em lote." : "Individual ou lote com data, descontos, acréscimos, forma e conta."}
                    </p>
                  </div>
                  <button onClick={() => setPayOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">x</button>
                </div>
                <form
                  className="grid gap-4 p-5 lg:grid-cols-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void runPayment();
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
                    const target = e.target as HTMLElement;
                    if (!target || target.tagName === "TEXTAREA") return;
                    e.preventDefault();
                    focusNextInForm(target);
                  }}
                >
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
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                      Valor pagamento (Saldo pendente: {prettyMoney(selectedPendingTotal)})
                    </label>
                    <input
                      value={payment.payment_increment}
                      onChange={(e) => {
                        const next = e.target.value;
                        const parsed = parseNumber(next);
                        if (selectedPendingTotal > 0 && parsed > selectedPendingTotal) {
                          setPayment((p) => ({ ...p, payment_increment: String(selectedPendingTotal.toFixed(2)) }));
                          return;
                        }
                        setPayment((p) => ({ ...p, payment_increment: next }));
                      }}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100 outline-none focus:border-accent-500/50"
                    />
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
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Acréscimo</label>
                    <input value={payment.addition_value} onChange={(e) => setPayment((p) => ({ ...p, addition_value: e.target.value }))} inputMode="decimal" placeholder="0,00" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100 outline-none focus:border-accent-500/50" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Conta</label>
                    <select value={payment.conta_id} onChange={(e) => setPayment((p) => ({ ...p, conta_id: e.target.value === "" ? "" : Number(e.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                      <option value="" style={optionStyle}>Selecione</option>
                      {contas.map((c) => (<option key={c.id} value={c.id} style={optionStyle}>{c.name}</option>))}
                    </select>
                  </div>
                </form>
                <div className="flex justify-end gap-2 border-t border-white/10 p-5">
                  <button onClick={() => setPayOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200 hover:bg-white/10">Cancelar</button>
                  <button type="button" onClick={runPayment} disabled={paying} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-60">
                    {paying ? "Processando..." : isEstornoMode ? "Efetuar estorno" : "Efetuar pagamento"}
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

