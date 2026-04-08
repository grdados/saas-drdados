"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  AbastecimentoCombustivel,
  createAbastecimentoCombustivel,
  Deposito,
  EmpreendimentoApi,
  FaturamentoCompra,
  isApiError,
  listAbastecimentosCombustivel,
  listCentrosCusto,
  listDepositos,
  listEmpreendimentos,
  listFaturamentosCompra,
  listOperacoes,
  listSafras,
  listTransportadorPlacas,
  Operacao,
  Safra,
  TransportadorPlaca,
} from "@/lib/api";
import { APP_LOCALE, formatCurrencyBRL, formatDateBR } from "@/lib/locale";

const number = (v: unknown) => {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const liters = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L`;
const toDate = (v?: string | null) => (v ? new Date(`${v}T00:00:00`) : null);
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const pct = (c: number, p: number) => (p <= 0 ? (c > 0 ? 100 : 0) : ((c - p) / p) * 100);
const pctCls = (v: number) => (v > 0 ? "text-emerald-300" : v < 0 ? "text-rose-300" : "text-zinc-300");
const toApiDecimal = (v: unknown) => {
  const s = String(v ?? "").trim().replace(/\s+/g, "");
  if (!s) return "0";
  if (s.includes(",") && s.includes(".")) return s.replace(/\./g, "").replace(",", ".");
  if (s.includes(",")) return s.replace(",", ".");
  return s;
};
const monthLabel = (d: Date) => d.toLocaleDateString(APP_LOCALE, { day: "2-digit", month: "2-digit" });

type CompraComb = {
  base: FaturamentoCompra;
  quantity: number;
  value: number;
  avg: number;
};

export default function EstoqueCombustivelPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [reportView, setReportView] = useState<"resumo" | "analitico">("resumo");

  const [safras, setSafras] = useState<Safra[]>([]);
  const [safraId, setSafraId] = useState<number | "">("");
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoApi[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [centros, setCentros] = useState<Array<{ id: number; name: string }>>([]);
  const [veiculos, setVeiculos] = useState<TransportadorPlaca[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [faturamentos, setFaturamentos] = useState<FaturamentoCompra[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<AbastecimentoCombustivel[]>([]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    date: "",
    empreendimento_id: "",
    deposito_id: "",
    centro_custo_id: "",
    veiculo_id: "",
    operacao_id: "",
    km: "",
    quantity_liters: "",
    unit_price: "",
    notes: "",
  });

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [sf, emps, deps, ccs, vcs, ops, fcs, abs] = await Promise.all([
        listSafras(token),
        listEmpreendimentos(token),
        listDepositos(token),
        listCentrosCusto(token),
        listTransportadorPlacas(token),
        listOperacoes(token),
        listFaturamentosCompra(token),
        listAbastecimentosCombustivel(token),
      ]);
      setSafras(sf);
      setEmpreendimentos(emps);
      setDepositos(deps.filter((d) => d.tipo === "combustivel"));
      setCentros(ccs);
      setVeiculos(vcs.filter((v) => v.is_active));
      setOperacoes(ops);
      setFaturamentos(fcs);
      setAbastecimentos(abs);
      if (sf.length && safraId === "") setSafraId(sf[0].id);
    } catch (err) {
      if (isApiError(err) && err.status === 401) return (window.location.href = "/login");
      setError(err instanceof Error ? err.message : "Falha ao carregar Combustível.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safra = useMemo(() => (safraId === "" ? null : safras.find((s) => s.id === Number(safraId)) ?? null), [safraId, safras]);
  const period = useMemo(() => {
    const start = toDate(safra?.start_date);
    const end = toDate(safra?.end_date);
    return start && end ? { start, end } : null;
  }, [safra]);
  const prevPeriod = useMemo(() => {
    if (!period) return null;
    const days = Math.max(1, Math.floor((period.end.getTime() - period.start.getTime()) / 86400000) + 1);
    const end = new Date(period.start);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    return { start, end };
  }, [period]);
  const inPeriod = (date: string | null | undefined, p: { start: Date; end: Date } | null) => {
    if (!p || !date) return false;
    const d = toDate(date);
    return !!d && d >= p.start && d <= p.end;
  };

  const comprasComb: CompraComb[] = useMemo(() => {
    const depIds = new Set(depositos.map((d) => d.id));
    return faturamentos
      .filter((f) => f.deposito?.id && depIds.has(f.deposito.id))
      .map((f) => {
        const quantity = (f.items || []).reduce((acc, it) => acc + Math.max(0, number(it.quantity)), 0);
        const value = Math.max(0, number(f.total_value));
        return { base: f, quantity, value, avg: quantity > 0 ? value / quantity : 0 };
      });
  }, [faturamentos, depositos]);

  const comprasAtual = useMemo(() => comprasComb.filter((c) => inPeriod(c.base.date, period)), [comprasComb, period]);
  const comprasPrev = useMemo(() => comprasComb.filter((c) => inPeriod(c.base.date, prevPeriod)), [comprasComb, prevPeriod]);
  const movAtual = useMemo(() => abastecimentos.filter((a) => inPeriod(a.date, period)), [abastecimentos, period]);
  const movPrev = useMemo(() => abastecimentos.filter((a) => inPeriod(a.date, prevPeriod)), [abastecimentos, prevPeriod]);

  const totalCompra = comprasAtual.reduce((a, c) => a + c.value, 0);
  const totalCompraPrev = comprasPrev.reduce((a, c) => a + c.value, 0);
  const totalQtyCompra = comprasAtual.reduce((a, c) => a + c.quantity, 0);
  const precoMedio = totalQtyCompra > 0 ? totalCompra / totalQtyCompra : 0;
  const totalAbast = movAtual.reduce((a, r) => a + Math.max(0, number(r.quantity_liters)), 0);
  const totalAbastPrev = movPrev.reduce((a, r) => a + Math.max(0, number(r.quantity_liters)), 0);

  const estoqueTanques = useMemo(() => {
    return depositos.map((d) => {
      const entrada = comprasComb.filter((c) => c.base.deposito?.id === d.id).reduce((a, r) => a + r.quantity, 0);
      const saida = abastecimentos.filter((a) => (a.deposito?.id ?? a.deposito_id) === d.id).reduce((a, r) => a + Math.max(0, number(r.quantity_liters)), 0);
      return { tanque: d.name, entrada, saida, saldo: Math.max(0, entrada - saida) };
    });
  }, [depositos, comprasComb, abastecimentos]);

  const chartPoints = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movAtual) if (m.date) map.set(m.date, (map.get(m.date) ?? 0) + Math.max(0, number(m.quantity_liters)));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
  }, [movAtual]);

  const rankVeiculo = useMemo(() => {
    const curr = new Map<string, number>(), prev = new Map<string, number>();
    for (const r of movAtual) curr.set(r.veiculo?.plate || "SEM PLACA", (curr.get(r.veiculo?.plate || "SEM PLACA") ?? 0) + Math.max(0, number(r.quantity_liters)));
    for (const r of movPrev) prev.set(r.veiculo?.plate || "SEM PLACA", (prev.get(r.veiculo?.plate || "SEM PLACA") ?? 0) + Math.max(0, number(r.quantity_liters)));
    return [...new Set([...curr.keys(), ...prev.keys()])].map((k) => ({ key: k, current: curr.get(k) ?? 0, pct: pct(curr.get(k) ?? 0, prev.get(k) ?? 0) })).sort((a, b) => b.current - a.current);
  }, [movAtual, movPrev]);
  const rankCentro = useMemo(() => {
    const curr = new Map<string, number>(), prev = new Map<string, number>();
    for (const r of movAtual) curr.set(r.centro_custo?.name || "SEM CENTRO", (curr.get(r.centro_custo?.name || "SEM CENTRO") ?? 0) + Math.max(0, number(r.quantity_liters)));
    for (const r of movPrev) prev.set(r.centro_custo?.name || "SEM CENTRO", (prev.get(r.centro_custo?.name || "SEM CENTRO") ?? 0) + Math.max(0, number(r.quantity_liters)));
    return [...new Set([...curr.keys(), ...prev.keys()])].map((k) => ({ key: k, current: curr.get(k) ?? 0, pct: pct(curr.get(k) ?? 0, prev.get(k) ?? 0) })).sort((a, b) => b.current - a.current);
  }, [movAtual, movPrev]);

  const notasRows = useMemo(() => {
    const rows = comprasAtual.map((r) => ({
      id: r.base.id,
      date: r.base.date,
      note: r.base.invoice_number || `NF-${r.base.id}`,
      produtor: r.base.produtor?.name || "-",
      fornecedor: r.base.fornecedor?.name || "-",
      quantity: r.quantity,
      price: r.avg,
      total: r.value,
    })).sort((a,b)=> (a.date || "").localeCompare(b.date || ""));
    return rows.map((r, i) => ({ ...r, pctPoint: pct(r.total, i > 0 ? rows[i - 1].total : 0) }));
  }, [comprasAtual]);

  const totalForm = Math.max(0, number(form.quantity_liters) * number(form.unit_price));

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveError("");
    try {
      await createAbastecimentoCombustivel(token, {
        date: form.date || null,
        empreendimento_id: form.empreendimento_id ? Number(form.empreendimento_id) : null,
        deposito_id: form.deposito_id ? Number(form.deposito_id) : null,
        centro_custo_id: form.centro_custo_id ? Number(form.centro_custo_id) : null,
        veiculo_id: form.veiculo_id ? Number(form.veiculo_id) : null,
        operacao_id: form.operacao_id ? Number(form.operacao_id) : null,
        km: toApiDecimal(form.km || "0"),
        quantity_liters: toApiDecimal(form.quantity_liters || "0"),
        unit_price: toApiDecimal(form.unit_price || "0"),
        notes: form.notes || "",
      });
      setOpen(false);
      setOk("Abastecimento salvo com sucesso.");
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Falha ao salvar abastecimento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-5">
          <section className="grid gap-3 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)] xl:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Estoque</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Combustível</h1>
              <p className="mt-1 text-sm text-zinc-300">Controle de saída por abastecimento e compras por tanque na safra.</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Relatórios</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 lg:justify-end">
                <button onClick={() => setReportView("resumo")} className={`rounded-2xl border px-4 py-2 text-sm ${reportView === "resumo" ? "border-white/40 bg-white/15 text-white" : "border-white/15 bg-white/5 text-zinc-100"}`}>Resumo</button>
                <button onClick={() => setReportView("analitico")} className={`rounded-2xl border px-4 py-2 text-sm ${reportView === "analitico" ? "border-white/40 bg-white/15 text-white" : "border-white/15 bg-white/5 text-zinc-100"}`}>Analitico</button>
                <button onClick={() => { setOpen(true); setStep(0); setSaveError(""); setForm((p)=>({ ...p, date: ymd(new Date()) })); }} className="rounded-2xl border border-accent-400/40 bg-accent-500 px-4 py-2 text-sm font-bold text-black">Novo abastecimento</button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xl">
            <div className="grid gap-2 md:grid-cols-3">
              <select
                value={safraId}
                onChange={(e) => setSafraId(e.target.value === "" ? "" : Number(e.target.value))}
                className="rounded-2xl border border-accent-500/40 bg-accent-500/15 px-3 py-2 text-[11px] font-semibold text-zinc-100 outline-none"
              >
                <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Selecione a safra</option>
                {safras.map((s) => (
                  <option key={s.id} value={s.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>{s.name}</option>
                ))}
              </select>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2 text-[11px] text-zinc-300">
                Consumo atual: <span className="font-bold text-zinc-100">{liters(totalAbast)}</span>
                <span className={`ml-2 font-semibold ${pctCls(pct(totalAbast, totalAbastPrev))}`}>{pct(totalAbast, totalAbastPrev).toFixed(1)}%</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2 text-[11px] text-zinc-300">
                Compra atual: <span className="font-bold text-zinc-100">{formatCurrencyBRL(totalCompra)}</span>
                <span className={`ml-2 font-semibold ${pctCls(pct(totalCompra, totalCompraPrev))}`}>{pct(totalCompra, totalCompraPrev).toFixed(1)}%</span>
              </div>
            </div>
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
            {ok ? <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-200">{ok}</div> : null}
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <article className="rounded-3xl border border-sky-400/30 bg-sky-500/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">Estoque em tanques</p>
              <p className="mt-1 text-[26px] font-black text-white">{liters(estoqueTanques.reduce((a, t) => a + t.saldo, 0))}</p>
            </article>
            <article className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">Preco medio compra</p>
              <p className="mt-1 text-[26px] font-black text-white">{formatCurrencyBRL(precoMedio)}</p>
            </article>
            <article className="rounded-3xl border border-accent-400/30 bg-accent-500/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Total compra safra</p>
              <p className="mt-1 text-[26px] font-black text-white">{formatCurrencyBRL(totalCompra)}</p>
              <p className={`text-xs font-semibold ${pctCls(pct(totalCompra, totalCompraPrev))}`}>vs safra anterior: {pct(totalCompra, totalCompraPrev).toFixed(1)}%</p>
            </article>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Estoque por tanque</p>
              <p className="text-xs text-zinc-400">{estoqueTanques.length} tanque(s)</p>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                    <th className="px-3 py-2 text-left">Tanque</th>
                    <th className="px-3 py-2 text-right">Entradas</th>
                    <th className="px-3 py-2 text-right">Saidas</th>
                    <th className="px-3 py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {estoqueTanques.map((row) => (
                    <tr key={row.tanque} className="border-t border-white/10 text-zinc-100">
                      <td className="px-3 py-2">{row.tanque}</td>
                      <td className="px-3 py-2 text-right">{liters(row.entrada)}</td>
                      <td className="px-3 py-2 text-right">{liters(row.saida)}</td>
                      <td className="px-3 py-2 text-right font-bold">{liters(row.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Abastecimento no periodo da safra</p>
              <p className="text-xs text-zinc-400">{chartPoints.length} ponto(s)</p>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-3">
              {chartPoints.length ? (
                <svg viewBox="0 0 1040 220" className="h-56 w-full">
                  {chartPoints.map((p, i) => {
                    const x = 24 + (i * (1040 - 48)) / Math.max(1, chartPoints.length - 1);
                    const max = Math.max(1, ...chartPoints.map((c) => c.value));
                    const y = 24 + (1 - p.value / max) * (220 - 48);
                    return (
                      <g key={p.date}>
                        <circle cx={x} cy={y} r="4.5" fill="rgba(34,211,238,0.95)" />
                        <text x={x} y={Math.max(12, y - 8)} textAnchor="middle" fontSize="11" fill="rgba(244,244,245,0.95)">{Math.round(p.value)}L</text>
                        <text x={x} y={214} textAnchor="middle" fontSize="11" fill="rgba(161,161,170,0.95)">{monthLabel(new Date(`${p.date}T00:00:00`))}</text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <p className="text-sm text-zinc-400">Sem abastecimentos no periodo.</p>
              )}
            </div>
          </section>

          {reportView === "analitico" ? (
            <section className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-black text-white">Ranking por veiculo / placa</p>
                <div className="mt-3 space-y-2">
                  {rankVeiculo.map((r) => (
                    <div key={r.key} className="rounded-2xl border border-white/10 bg-zinc-950/30 p-3">
                      <div className="flex items-center justify-between"><p className="text-sm text-zinc-100">{r.key}</p><p className="font-bold text-zinc-100">{liters(r.current)}</p></div>
                      <p className={`text-xs font-semibold ${pctCls(r.pct)}`}>{r.pct.toFixed(1)}% vs periodo anterior</p>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-black text-white">Abastecimento por centro de custo</p>
                <div className="mt-3 space-y-2">
                  {rankCentro.map((r) => (
                    <div key={r.key} className="rounded-2xl border border-white/10 bg-zinc-950/30 p-3">
                      <div className="flex items-center justify-between"><p className="text-sm text-zinc-100">{r.key}</p><p className="font-bold text-zinc-100">{liters(r.current)}</p></div>
                      <p className={`text-xs font-semibold ${pctCls(r.pct)}`}>{r.pct.toFixed(1)}% vs periodo anterior</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          ) : null}

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-black text-white">Movimentacao de abastecimento</p><p className="text-xs text-zinc-400">{movAtual.length} item(ns)</p></div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[1240px] text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                    <th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Empreendimento</th><th className="px-3 py-2 text-left">Deposito</th><th className="px-3 py-2 text-left">Centro custo</th><th className="px-3 py-2 text-left">Veiculo</th><th className="px-3 py-2 text-right">KM</th><th className="px-3 py-2 text-left">Operacao</th><th className="px-3 py-2 text-right">Qtd (L)</th><th className="px-3 py-2 text-right">Preco</th><th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {movAtual.map((m) => (
                    <tr key={m.id} className="border-t border-white/10 text-zinc-100">
                      <td className="px-3 py-2">{m.date ? formatDateBR(new Date(`${m.date}T00:00:00`)) : "-"}</td>
                      <td className="px-3 py-2">{m.empreendimento?.code || "-"}</td>
                      <td className="px-3 py-2">{m.deposito?.name || "-"}</td>
                      <td className="px-3 py-2">{m.centro_custo?.name || "-"}</td>
                      <td className="px-3 py-2">{m.veiculo?.plate || "-"}</td>
                      <td className="px-3 py-2 text-right">{Math.round(number(m.km)).toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2">{m.operacao?.name || "-"}</td>
                      <td className="px-3 py-2 text-right">{Math.round(number(m.quantity_liters)).toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right">{formatCurrencyBRL(number(m.unit_price))}</td>
                      <td className="px-3 py-2 text-right">{formatCurrencyBRL(number(m.total_value))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-black text-white">Notas fiscais de compra de combustivel</p><p className="text-xs text-zinc-400">{notasRows.length} NF(s)</p></div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                    <th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Nota</th><th className="px-3 py-2 text-left">Produtor</th><th className="px-3 py-2 text-left">Fornecedor</th><th className="px-3 py-2 text-right">Quantidade</th><th className="px-3 py-2 text-right">Preco</th><th className="px-3 py-2 text-right">Valor total</th><th className="px-3 py-2 text-right">% periodo ant.</th>
                  </tr>
                </thead>
                <tbody>
                  {notasRows.map((r) => (
                    <tr key={r.id} className="border-t border-white/10 text-zinc-100">
                      <td className="px-3 py-2">{r.date ? formatDateBR(new Date(`${r.date}T00:00:00`)) : "-"}</td>
                      <td className="px-3 py-2">{r.note}</td>
                      <td className="px-3 py-2">{r.produtor}</td>
                      <td className="px-3 py-2">{r.fornecedor}</td>
                      <td className="px-3 py-2 text-right">{Math.round(r.quantity).toLocaleString("pt-BR")} L</td>
                      <td className="px-3 py-2 text-right">{formatCurrencyBRL(r.price)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrencyBRL(r.total)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${pctCls(r.pctPoint)}`}>{r.pctPoint.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {open ? (
            <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-md">
              <div className="w-full max-w-5xl rounded-3xl border border-white/15 bg-zinc-950/90 p-4 shadow-2xl">
                <div className="flex items-start justify-between"><div><h3 className="text-2xl font-black text-white">Novo abastecimento</h3><p className="text-sm text-zinc-300">Etapa {step + 1} de 3</p></div><button onClick={() => setOpen(false)} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-200">Fechar</button></div>
                <div className="mt-3 grid grid-cols-3 gap-2">{["Dados","Leitura","Resumo"].map((lbl, i) => <button key={lbl} onClick={() => setStep(i)} className={`rounded-xl border px-3 py-2 text-sm uppercase tracking-[0.15em] ${i===step ? "border-accent-400/45 bg-accent-500/20 text-amber-200" : "border-white/15 bg-white/5 text-zinc-300"}`}>{lbl}</button>)}</div>
                {step === 0 ? <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Data</span><input type="date" value={form.date} onChange={(e)=>setForm((p)=>({...p,date:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"/></label>
                  <label className="md:col-span-3"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Empreendimento</span><select value={form.empreendimento_id} onChange={(e)=>setForm((p)=>({...p,empreendimento_id:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"><option value="">Selecione</option>{empreendimentos.map((e)=><option key={e.id} value={e.id}>{e.code}</option>)}</select></label>
                  <label className="md:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Deposito</span><select value={form.deposito_id} onChange={(e)=>setForm((p)=>({...p,deposito_id:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"><option value="">Selecione</option>{depositos.map((d)=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
                  <label className="md:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Centro custo</span><select value={form.centro_custo_id} onChange={(e)=>setForm((p)=>({...p,centro_custo_id:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"><option value="">Selecione</option>{centros.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                </div> : null}
                {step === 1 ? <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <label className="md:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Veiculo</span><select value={form.veiculo_id} onChange={(e)=>setForm((p)=>({...p,veiculo_id:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"><option value="">Selecione</option>{veiculos.map((v)=><option key={v.id} value={v.id}>{v.plate}</option>)}</select></label>
                  <label className="md:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Operacao</span><select value={form.operacao_id} onChange={(e)=>setForm((p)=>({...p,operacao_id:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"><option value="">Selecione</option>{operacoes.map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
                  <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">KM</span><input value={form.km} onChange={(e)=>setForm((p)=>({...p,km:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"/></label>
                  <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Qtd (L)</span><input value={form.quantity_liters} onChange={(e)=>setForm((p)=>({...p,quantity_liters:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"/></label>
                  <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Preco</span><input value={form.unit_price} onChange={(e)=>setForm((p)=>({...p,unit_price:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"/></label>
                  <label className="md:col-span-4"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Observacoes</span><textarea value={form.notes} onChange={(e)=>setForm((p)=>({...p,notes:e.target.value}))} rows={2} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"/></label>
                </div> : null}
                {step === 2 ? <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/12 bg-zinc-900/60 p-3 text-sm text-zinc-100">
                    <p>Data: {form.date ? formatDateBR(new Date(`${form.date}T00:00:00`)) : "-"}</p>
                    <p>Empreendimento: {empreendimentos.find((e)=>String(e.id)===form.empreendimento_id)?.code || "-"}</p>
                    <p>Deposito: {depositos.find((d)=>String(d.id)===form.deposito_id)?.name || "-"}</p>
                    <p>Centro custo: {centros.find((c)=>String(c.id)===form.centro_custo_id)?.name || "-"}</p>
                    <p>Veiculo: {veiculos.find((v)=>String(v.id)===form.veiculo_id)?.plate || "-"}</p>
                    <p>Operacao: {operacoes.find((o)=>String(o.id)===form.operacao_id)?.name || "-"}</p>
                    <p>Quantidade: {liters(number(form.quantity_liters))}</p>
                    <p>Preco: {formatCurrencyBRL(number(form.unit_price))}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">Valor total: <span className="font-black">{formatCurrencyBRL(totalForm)}</span></div>
                  {saveError ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{saveError}</div> : null}
                </div> : null}
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button onClick={() => (step === 0 ? setOpen(false) : setStep((s)=>Math.max(0,s-1)))} className="rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-200">{step === 0 ? "Cancelar" : "Voltar"}</button>
                  {step < 2 ? <button onClick={() => setStep((s)=>Math.min(2,s+1))} className="rounded-2xl border border-accent-400/40 bg-accent-500 px-5 py-2.5 text-sm font-bold text-black">Proximo</button> : <button onClick={onSave} disabled={saving || !form.date || !form.deposito_id || !form.veiculo_id || number(form.quantity_liters) <= 0} className="rounded-2xl border border-emerald-400/35 bg-emerald-500/25 px-5 py-2.5 text-sm font-bold text-emerald-100 disabled:opacity-60">{saving ? "Salvando..." : "Salvar abastecimento"}</button>}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}
