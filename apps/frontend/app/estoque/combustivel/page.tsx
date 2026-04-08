"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  AbastecimentoCombustivel,
  createAbastecimentoCombustivel,
  deleteAbastecimentoCombustivel,
  Deposito,
  EmpreendimentoApi,
  FaturamentoCompra,
  isApiError,
  listAbastecimentosCombustivel,
  listCentrosCusto,
  listDepositos,
  listEmpreendimentos,
  listFaturamentosCompra,
  listMaquinas,
  listOperacoes,
  listSafras,
  listTransportadorPlacas,
  Maquina,
  Operacao,
  Safra,
  TransportadorPlaca,
  updateAbastecimentoCombustivel,
} from "@/lib/api";
import { formatDateBR } from "@/lib/locale";

const FINALIDADES_ABASTECIMENTO = ["Plantio", "Pulverizacao", "Colheita", "Manejo", "Frete", "Calcario", "Adubo"];
const TANQUE_BG_PATTERN = [
  "border-cyan-500/35 bg-gradient-to-br from-cyan-500/18 via-cyan-500/8 to-transparent",
  "border-emerald-500/35 bg-gradient-to-br from-emerald-500/18 via-emerald-500/8 to-transparent",
  "border-amber-500/35 bg-gradient-to-br from-amber-500/18 via-amber-500/8 to-transparent",
  "border-violet-500/35 bg-gradient-to-br from-violet-500/18 via-violet-500/8 to-transparent",
];

function FuelPumpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M5 4.5h8a1 1 0 0 1 1 1V20H4V5.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.2 8.1h4.6v3.2H7.2z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 9h2.1l2.2 2.4V17a1.5 1.5 0 0 1-3 0v-2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function toNum(v: unknown): number {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toApiDecimal(v: unknown): string {
  const s = String(v ?? "").trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : "0";
}

function liters(v: number): string {
  return `${Math.round(v).toLocaleString("pt-BR")} L`;
}

function money(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toDateOnly(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isWithin(dateRaw: string | null | undefined, from: Date | null, to: Date | null): boolean {
  const d = toDateOnly(dateRaw);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function isCombustivelFaturamento(f: FaturamentoCompra): boolean {
  const op = String(f.operacao?.name || "").toLowerCase();
  return op.includes("combust");
}

function splitFinalidadeAndNotes(raw: string | null | undefined): { finalidade: string; notes: string } {
  const txt = String(raw ?? "").trim();
  if (!txt.toLowerCase().startsWith("finalidade:")) {
    return { finalidade: "Plantio", notes: txt };
  }
  const parts = txt.split("|").map((p) => p.trim()).filter(Boolean);
  const first = parts[0] || "";
  const finalidade = first.replace(/^finalidade:\s*/i, "").trim() || "Plantio";
  const notes = parts.slice(1).join(" | ");
  return { finalidade, notes };
}

function monthShortBr(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  const d = new Date(y, m - 1, 1);
  const txt = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return txt.toUpperCase();
}

export default function EstoqueCombustivelPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const [safras, setSafras] = useState<Safra[]>([]);
  const [safraId, setSafraId] = useState<number | "">("");
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoApi[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [centros, setCentros] = useState<Array<{ id: number; name: string }>>([]);
  const [veiculos, setVeiculos] = useState<TransportadorPlaca[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<AbastecimentoCombustivel[]>([]);
  const [faturamentosCompra, setFaturamentosCompra] = useState<FaturamentoCompra[]>([]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [form, setForm] = useState({
    date: "",
    empreendimento_id: "",
    deposito_id: "",
    centro_custo_id: "",
    veiculo_id: "",
    maquina_id: "",
    operacao_id: "",
    km: "",
    quantity_liters: "",
    finalidade: "Plantio",
    notes: "",
  });

  const operacaoCombustivel = useMemo(() => {
    const byName = operacoes.find((o) => String(o.name || "").trim().toLowerCase() === "combustivel");
    return byName ?? operacoes[0] ?? null;
  }, [operacoes]);

  const ativoMovelSelecionado = useMemo(() => {
    if (form.maquina_id) return `M:${form.maquina_id}`;
    if (form.veiculo_id) return `V:${form.veiculo_id}`;
    return "";
  }, [form.maquina_id, form.veiculo_id]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [sf, emps, deps, ccs, vcs, mqs, ops, abs, fats] = await Promise.all([
        listSafras(token),
        listEmpreendimentos(token),
        listDepositos(token),
        listCentrosCusto(token),
        listTransportadorPlacas(token),
        listMaquinas(token),
        listOperacoes(token),
        listAbastecimentosCombustivel(token),
        listFaturamentosCompra(token),
      ]);
      setSafras(sf);
      setEmpreendimentos(emps);
      setDepositos(deps.filter((d) => d.tipo === "combustivel"));
      setCentros(ccs);
      setVeiculos(vcs.filter((v) => v.is_active));
      setMaquinas(mqs.filter((m) => m.is_active));
      setOperacoes(ops);
      setAbastecimentos(abs);
      setFaturamentosCompra(fats);
      if (sf.length && safraId === "") setSafraId(sf[0].id);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao carregar painel de combustivel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!operacaoCombustivel) return;
    setForm((prev) => ({ ...prev, operacao_id: String(operacaoCombustivel.id) }));
  }, [operacaoCombustivel]);

  const safraSelecionada = useMemo(
    () => (safraId === "" ? null : safras.find((s) => s.id === safraId) || null),
    [safraId, safras]
  );

  const periodoSafra = useMemo(() => {
    const from = toDateOnly(safraSelecionada?.start_date || null);
    const to = toDateOnly(safraSelecionada?.end_date || null);
    return { from, to };
  }, [safraSelecionada]);

  const abastecimentosSafra = useMemo(
    () => abastecimentos.filter((r) => isWithin(r.date, periodoSafra.from, periodoSafra.to)),
    [abastecimentos, periodoSafra]
  );

  const totalAtual = useMemo(
    () => abastecimentosSafra.reduce((acc, r) => acc + Math.max(0, toNum(r.quantity_liters)), 0),
    [abastecimentosSafra]
  );

  const faturamentosCombustivelSafra = useMemo(() => {
    return faturamentosCompra.filter((f) => {
      if (!isCombustivelFaturamento(f)) return false;
      return isWithin(f.date, periodoSafra.from, periodoSafra.to);
    });
  }, [faturamentosCompra, periodoSafra]);

  const comprasResumo = useMemo(() => {
    let quantidade = 0;
    let valorTotal = 0;
    for (const f of faturamentosCombustivelSafra) {
      const qtdNota = f.items.reduce((acc, it) => acc + Math.max(0, toNum(it.quantity)), 0);
      quantidade += qtdNota;
      valorTotal += Math.max(0, toNum(f.total_value));
    }
    const precoMedio = quantidade > 0 ? valorTotal / quantidade : 0;
    return { quantidade, valorTotal, precoMedio };
  }, [faturamentosCombustivelSafra]);

  const estoqueTanques = useMemo(() => {
    const entradasPorDeposito = new Map<number, number>();
    for (const f of faturamentosCombustivelSafra) {
      const depId = f.deposito?.id ?? f.deposito_id ?? 0;
      if (!depId) continue;
      const qtd = f.items.reduce((acc, it) => acc + Math.max(0, toNum(it.quantity)), 0);
      entradasPorDeposito.set(depId, (entradasPorDeposito.get(depId) ?? 0) + qtd);
    }
    const saidasPorDeposito = new Map<number, number>();
    for (const row of abastecimentosSafra) {
      const depId = row.deposito?.id ?? row.deposito_id ?? 0;
      if (!depId) continue;
      saidasPorDeposito.set(depId, (saidasPorDeposito.get(depId) ?? 0) + Math.max(0, toNum(row.quantity_liters)));
    }
    return depositos.map((d) => ({
      id: d.id,
      name: d.name,
      saldo: Math.max(0, (entradasPorDeposito.get(d.id) ?? 0) - (saidasPorDeposito.get(d.id) ?? 0)),
    }));
  }, [faturamentosCombustivelSafra, abastecimentosSafra, depositos]);

  const rankingVeiculo = useMemo(() => {
    const map = new Map<string, { nome: string; litros: number; qtd: number }>();
    for (const r of abastecimentosSafra) {
      const nome = r.veiculo?.plate || r.maquina?.plate || r.maquina?.name || "Sem identificacao";
      const key = nome.toUpperCase();
      const prev = map.get(key) || { nome, litros: 0, qtd: 0 };
      prev.litros += Math.max(0, toNum(r.quantity_liters));
      prev.qtd += 1;
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.litros - a.litros).slice(0, 10);
  }, [abastecimentosSafra]);

  const serieMensal = useMemo(() => {
    const mapAbastecido = new Map<string, number>();
    for (const r of abastecimentosSafra) {
      const d = toDateOnly(r.date);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      mapAbastecido.set(key, (mapAbastecido.get(key) ?? 0) + Math.max(0, toNum(r.quantity_liters)));
    }

    const mapComprado = new Map<string, number>();
    for (const f of faturamentosCombustivelSafra) {
      const d = toDateOnly(f.date);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const qtdNota = f.items.reduce((acc, it) => acc + Math.max(0, toNum(it.quantity)), 0);
      mapComprado.set(key, (mapComprado.get(key) ?? 0) + qtdNota);
    }

    const monthKeys: string[] = [];
    if (periodoSafra.from && periodoSafra.to) {
      const cursor = new Date(periodoSafra.from.getFullYear(), periodoSafra.from.getMonth(), 1);
      const end = new Date(periodoSafra.to.getFullYear(), periodoSafra.to.getMonth(), 1);
      while (cursor <= end) {
        monthKeys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      const union = new Set([...mapAbastecido.keys(), ...mapComprado.keys()]);
      if (union.size > 0) {
        monthKeys.push(...Array.from(union).sort((a, b) => a.localeCompare(b)));
      } else {
        const now = new Date();
        for (let m = 1; m <= 12; m += 1) {
          monthKeys.push(`${now.getFullYear()}-${String(m).padStart(2, "0")}`);
        }
      }
    }

    return monthKeys.map((month) => ({
      month,
      label: monthShortBr(month),
      abastecido: mapAbastecido.get(month) ?? 0,
      comprado: mapComprado.get(month) ?? 0,
    }));
  }, [abastecimentosSafra, faturamentosCombustivelSafra, periodoSafra]);

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        date: form.date || null,
        empreendimento_id: form.empreendimento_id || null,
        deposito_id: form.deposito_id ? Number(form.deposito_id) : null,
        centro_custo_id: form.centro_custo_id ? Number(form.centro_custo_id) : null,
        veiculo_id: form.veiculo_id ? Number(form.veiculo_id) : null,
        maquina_id: form.maquina_id ? Number(form.maquina_id) : null,
        operacao_id: form.operacao_id ? Number(form.operacao_id) : operacaoCombustivel?.id ?? null,
        km: toApiDecimal(form.km),
        quantity_liters: toApiDecimal(form.quantity_liters),
        unit_price: "0",
        notes: [form.finalidade ? `Finalidade: ${form.finalidade}` : "", form.notes || ""].filter(Boolean).join(" | "),
      };
      if (editingId) {
        await updateAbastecimentoCombustivel(token, editingId, payload);
      } else {
        await createAbastecimentoCombustivel(token, payload);
      }
      setOpen(false);
      setEditingId(null);
      setOk(editingId ? "Abastecimento atualizado com sucesso." : "Abastecimento salvo com sucesso.");
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Falha ao salvar abastecimento.");
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setOpen(true);
    setStep(0);
    setEditingId(null);
    setSaveError("");
    setForm({
      date: new Date().toISOString().slice(0, 10),
      empreendimento_id: "",
      deposito_id: "",
      centro_custo_id: "",
      veiculo_id: "",
      maquina_id: "",
      operacao_id: operacaoCombustivel ? String(operacaoCombustivel.id) : "",
      km: "",
      quantity_liters: "",
      finalidade: "Plantio",
      notes: "",
    });
  }

  function openEdit(item: AbastecimentoCombustivel) {
    const parsed = splitFinalidadeAndNotes(item.notes);
    setOpen(true);
    setStep(0);
    setEditingId(item.id);
    setSaveError("");
    setForm({
      date: item.date || "",
      empreendimento_id: item.empreendimento?.id ? String(item.empreendimento.id) : item.empreendimento_id ? String(item.empreendimento_id) : "",
      deposito_id: item.deposito?.id ? String(item.deposito.id) : item.deposito_id ? String(item.deposito_id) : "",
      centro_custo_id: item.centro_custo?.id ? String(item.centro_custo.id) : item.centro_custo_id ? String(item.centro_custo_id) : "",
      veiculo_id: item.veiculo?.id ? String(item.veiculo.id) : item.veiculo_id ? String(item.veiculo_id) : "",
      maquina_id: item.maquina?.id ? String(item.maquina.id) : item.maquina_id ? String(item.maquina_id) : "",
      operacao_id: item.operacao?.id ? String(item.operacao.id) : item.operacao_id ? String(item.operacao_id) : (operacaoCombustivel ? String(operacaoCombustivel.id) : ""),
      km: String(toNum(item.km) || ""),
      quantity_liters: String(toNum(item.quantity_liters) || ""),
      finalidade: FINALIDADES_ABASTECIMENTO.includes(parsed.finalidade) ? parsed.finalidade : "Plantio",
      notes: parsed.notes,
    });
  }

  async function onDelete(item: AbastecimentoCombustivel) {
    const token = getAccessToken();
    if (!token) return;
    const alvo = item.veiculo?.plate || item.maquina?.plate || item.maquina?.name || `ID ${item.id}`;
    if (!window.confirm(`Excluir abastecimento de ${alvo}?`)) return;
    try {
      await deleteAbastecimentoCombustivel(token, item.id);
      setOk("Abastecimento excluido com sucesso.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir abastecimento.");
    }
  }

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-5">
          <section className="grid gap-3 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)] xl:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Estoque</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Combustivel</h1>
              <p className="mt-1 text-sm text-zinc-300">Controle de abastecimento por safra, tanque e centro de custo.</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Acoes</p>
              <div className="mt-2 flex justify-end">
                <button
                  onClick={openCreate}
                  className="rounded-2xl border border-accent-400/40 bg-accent-500 px-4 py-2 text-sm font-bold text-black"
                >
                  Novo abastecimento
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xl">
            <div className="grid gap-2 md:grid-cols-6">
              <select
                value={safraId}
                onChange={(e) => setSafraId(e.target.value === "" ? "" : Number(e.target.value))}
                className="rounded-2xl border border-accent-500/40 bg-accent-500/15 px-3 py-2 text-[11px] font-semibold text-zinc-50 outline-none md:col-span-2"
              >
                <option value="" style={{ backgroundColor: "#f3f4f6", color: "#111827" }}>Selecione a safra</option>
                {safras.map((s) => (
                  <option key={s.id} value={s.id} style={{ backgroundColor: "#f3f4f6", color: "#111827" }}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-sm text-zinc-100">Preço médio: {money(comprasResumo.precoMedio)}</div>
              <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-sm text-zinc-100">Quantidade: {liters(comprasResumo.quantidade)}</div>
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-zinc-100">Valor total: {money(comprasResumo.valorTotal)}</div>
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-zinc-100">Total abastecido: {liters(totalAtual)}</div>
            </div>
            {loading ? <p className="mt-3 text-xs text-zinc-400">Carregando...</p> : null}
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-200">{error}</div> : null}
            {ok ? <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">{ok}</div> : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Estoque por deposito (saldo)</p>
              <p className="text-xs text-zinc-400">{estoqueTanques.length} tanque(s)</p>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {estoqueTanques.map((tk, idx) => (
                <div
                  key={tk.id}
                  className={`rounded-2xl border p-3 ${TANQUE_BG_PATTERN[idx % TANQUE_BG_PATTERN.length]}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-cyan-100">
                      <FuelPumpIcon />
                    </span>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-200">{tk.name}</p>
                  </div>
                  <p className="mt-1 text-xl font-black text-white">{liters(tk.saldo)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-white">Ranking de saida por veiculo</p>
                <p className="text-xs text-zinc-400">{rankingVeiculo.length} item(ns)</p>
              </div>
              <div className="mt-3 space-y-2">
                {rankingVeiculo.length === 0 ? (
                  <p className="text-sm text-zinc-400">Sem saidas no periodo da safra.</p>
                ) : (
                  rankingVeiculo.map((r) => (
                    <div key={r.nome} className="rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-white">{r.nome}</p>
                        <p className="text-sm font-black text-white">{liters(r.litros)}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400">{r.qtd} abastecimento(s)</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-white">Abastecimento x compra mensal (safra)</p>
                <p className="text-xs text-zinc-400">{serieMensal.length} ponto(s)</p>
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-950/25 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-2 text-xs text-zinc-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                    Abastecido
                  </span>
                  <span className="inline-flex items-center gap-2 text-xs text-zinc-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    Comprado
                  </span>
                </div>
                {serieMensal.length === 0 ? (
                  <p className="text-sm text-zinc-400">Sem dados no periodo da safra.</p>
                ) : (
                  <div className="overflow-x-auto">
                    {(() => {
                      const width = Math.max(680, serieMensal.length * 74);
                      const height = 240;
                      const left = 42;
                      const right = 14;
                      const top = 20;
                      const bottom = 40;
                      const plotW = width - left - right;
                      const plotH = height - top - bottom;
                      const maxY = Math.max(
                        1,
                        ...serieMensal.map((p) => Math.max(p.abastecido, p.comprado))
                      );
                      const xFor = (idx: number) =>
                        left + (serieMensal.length <= 1 ? plotW / 2 : (idx * plotW) / (serieMensal.length - 1));
                      const yFor = (v: number) => top + plotH - (v / maxY) * plotH;
                      const lineAbastecido = serieMensal
                        .map((p, i) => `${xFor(i)},${yFor(p.abastecido)}`)
                        .join(" ");
                      const lineComprado = serieMensal
                        .map((p, i) => `${xFor(i)},${yFor(p.comprado)}`)
                        .join(" ");
                      return (
                        <svg width={width} height={height} className="min-w-full">
                          {[0, 1, 2, 3, 4].map((g) => {
                            const y = top + (plotH * g) / 4;
                            return (
                              <line
                                key={g}
                                x1={left}
                                y1={y}
                                x2={width - right}
                                y2={y}
                                stroke="rgba(255,255,255,0.12)"
                                strokeDasharray="3 4"
                              />
                            );
                          })}
                          <polyline fill="none" stroke="#22d3ee" strokeWidth="2.5" points={lineAbastecido} />
                          <polyline fill="none" stroke="#34d399" strokeWidth="2.5" points={lineComprado} />
                          {serieMensal.map((p, i) => {
                            const x = xFor(i);
                            const yA = yFor(p.abastecido);
                            const yC = yFor(p.comprado);
                            return (
                              <g key={p.month}>
                                <circle cx={x} cy={yA} r="3.5" fill="#22d3ee" />
                                <circle cx={x} cy={yC} r="3.5" fill="#34d399" />
                                <text x={x} y={Math.min(yA, yC) - 8} textAnchor="middle" fontSize="10" fill="#d4d4d8">
                                  {Math.round(p.abastecido).toLocaleString("pt-BR")} / {Math.round(p.comprado).toLocaleString("pt-BR")}
                                </text>
                                <text x={x} y={height - 12} textAnchor="middle" fontSize="10" fill="#a1a1aa">
                                  {p.label}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Notas de compra de combustivel</p>
              <p className="text-xs text-zinc-400">{faturamentosCombustivelSafra.length} nota(s)</p>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Nota</th>
                    <th className="px-3 py-2 text-left">Produtor</th>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-right">Qtde</th>
                    <th className="px-3 py-2 text-right">Preco medio</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {faturamentosCombustivelSafra.map((f) => {
                    const qtd = f.items.reduce((acc, it) => acc + Math.max(0, toNum(it.quantity)), 0);
                    const val = Math.max(0, toNum(f.total_value));
                    const precoMedio = qtd > 0 ? val / qtd : 0;
                    return (
                      <tr key={f.id} className="border-t border-white/10 text-zinc-100">
                        <td className="px-3 py-2">{f.date ? formatDateBR(new Date(`${f.date}T00:00:00`)) : "-"}</td>
                        <td className="px-3 py-2">{f.invoice_number || "-"}</td>
                        <td className="px-3 py-2">{f.produtor?.name || "-"}</td>
                        <td className="px-3 py-2">{f.fornecedor?.name || "-"}</td>
                        <td className="px-3 py-2 text-right">{Math.round(qtd).toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-2 text-right">{money(precoMedio)}</td>
                        <td className="px-3 py-2 text-right">{money(val)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Lista de movimentacao de abastecimento</p>
              <p className="text-xs text-zinc-400">{abastecimentos.length} item(ns)</p>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[1180px] text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Empreendimento</th>
                    <th className="px-3 py-2 text-left">Deposito</th>
                    <th className="px-3 py-2 text-left">Centro custo</th>
                    <th className="px-3 py-2 text-left">Veiculo/Maquina</th>
                    <th className="px-3 py-2 text-right">KM</th>
                    <th className="px-3 py-2 text-right">Qtd (L)</th>
                    <th className="px-3 py-2 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {abastecimentos.map((m) => (
                    <tr key={m.id} className="border-t border-white/10 text-zinc-100">
                      <td className="px-3 py-2">{m.date ? formatDateBR(new Date(`${m.date}T00:00:00`)) : "-"}</td>
                      <td className="px-3 py-2">{m.empreendimento?.code || "-"}</td>
                      <td className="px-3 py-2">{m.deposito?.name || "-"}</td>
                      <td className="px-3 py-2">{m.centro_custo?.name || "-"}</td>
                      <td className="px-3 py-2">{m.veiculo?.plate || m.maquina?.plate || m.maquina?.name || "-"}</td>
                      <td className="px-3 py-2 text-right">{Math.round(toNum(m.km)).toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right">{Math.round(toNum(m.quantity_liters)).toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(m)} className="rounded-xl border border-sky-400/35 bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-200">
                            Editar
                          </button>
                          <button onClick={() => onDelete(m)} className="rounded-xl border border-rose-400/35 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-200">
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {open ? (
            <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-md">
              <div className="w-full max-w-5xl rounded-3xl border border-white/15 bg-zinc-950/90 p-4 shadow-2xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white">Novo abastecimento</h3>
                    <p className="text-sm text-zinc-300">Etapa {step + 1} de 3</p>
                  </div>
                  <button onClick={() => setOpen(false)} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-200">Fechar</button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {["Dados", "Leitura", "Resumo"].map((lbl, i) => (
                    <button
                      key={lbl}
                      onClick={() => setStep(i as 0 | 1 | 2)}
                      className={`rounded-xl border px-3 py-2 text-sm uppercase tracking-[0.15em] ${i === step ? "border-accent-400/45 bg-accent-500/20 text-amber-200" : "border-white/15 bg-white/5 text-zinc-300"}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                {step === 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Data</span><input type="date" value={form.date} onChange={(e)=>setForm((p)=>({...p,date:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"/></label>
                    <label className="md:col-span-3"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Empreendimento</span><select value={form.empreendimento_id} onChange={(e)=>setForm((p)=>({...p,empreendimento_id:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"><option value="">Selecione</option>{empreendimentos.map((e)=><option key={e.id} value={e.id}>{e.code}</option>)}</select></label>
                    <label className="md:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Deposito</span><select value={form.deposito_id} onChange={(e)=>setForm((p)=>({...p,deposito_id:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"><option value="">Selecione</option>{depositos.map((d)=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
                    <label className="md:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Centro custo</span><select value={form.centro_custo_id} onChange={(e)=>setForm((p)=>({...p,centro_custo_id:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"><option value="">Selecione</option>{centros.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <label className="md:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Veiculo / Maquina</span><select value={ativoMovelSelecionado} onChange={(e)=>{ const v=e.target.value; if(!v){ setForm((p)=>({...p, veiculo_id:"", maquina_id:""})); return; } const [kind,id] = v.split(":"); setForm((p)=>({...p, veiculo_id: kind==="V" ? id : "", maquina_id: kind==="M" ? id : ""})); }} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"><option value="">Selecione</option>{veiculos.map((v)=><option key={`V:${v.id}`} value={`V:${v.id}`}>Veiculo - {v.plate}</option>)}{maquinas.map((m)=><option key={`M:${m.id}`} value={`M:${m.id}`}>Maquina - {m.name}{m.plate ? ` (${m.plate})` : ""}</option>)}</select></label>
                    <label className="md:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Operacao</span><select disabled value={form.operacao_id || (operacaoCombustivel ? String(operacaoCombustivel.id) : "")} className="mt-1 w-full cursor-not-allowed rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 opacity-90"><option value={operacaoCombustivel ? String(operacaoCombustivel.id) : ""}>{operacaoCombustivel?.name || "COMBUSTIVEL"}</option></select></label>
                    <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">KM</span><input value={form.km} onChange={(e)=>setForm((p)=>({...p,km:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"/></label>
                    <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Qtd (L)</span><input value={form.quantity_liters} onChange={(e)=>setForm((p)=>({...p,quantity_liters:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"/></label>
                    <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Finalidade</span><select value={form.finalidade} onChange={(e)=>setForm((p)=>({...p,finalidade:e.target.value}))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100">{FINALIDADES_ABASTECIMENTO.map((f)=><option key={f} value={f}>{f}</option>)}</select></label>
                    <label className="md:col-span-4"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Observacoes</span><textarea value={form.notes} onChange={(e)=>setForm((p)=>({...p,notes:e.target.value}))} rows={2} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"/></label>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-white/12 bg-zinc-900/60 p-3 text-sm text-zinc-100">
                      <p>Data: {form.date ? formatDateBR(new Date(`${form.date}T00:00:00`)) : "-"}</p>
                      <p>Empreendimento: {empreendimentos.find((e)=>String(e.id)===form.empreendimento_id)?.code || "-"}</p>
                      <p>Deposito: {depositos.find((d)=>String(d.id)===form.deposito_id)?.name || "-"}</p>
                      <p>Centro custo: {centros.find((c)=>String(c.id)===form.centro_custo_id)?.name || "-"}</p>
                      <p>Veiculo/Maquina: {veiculos.find((v)=>String(v.id)===form.veiculo_id)?.plate || maquinas.find((m)=>String(m.id)===form.maquina_id)?.name || "-"}</p>
                      <p>Operacao: {operacoes.find((o)=>String(o.id)===form.operacao_id)?.name || "-"}</p>
                      <p>Quantidade: {liters(toNum(form.quantity_liters))}</p>
                      <p>Finalidade: {form.finalidade || "-"}</p>
                    </div>
                    {saveError ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{saveError}</div> : null}
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button onClick={() => (step === 0 ? setOpen(false) : setStep((s)=> (s === 2 ? 1 : 0)))} className="rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-200">{step === 0 ? "Cancelar" : "Voltar"}</button>
                  {step < 2 ? (
                    <button onClick={() => setStep((s)=> (s === 0 ? 1 : 2))} className="rounded-2xl border border-accent-400/40 bg-accent-500 px-5 py-2.5 text-sm font-bold text-black">Proximo</button>
                  ) : (
                    <button onClick={onSave} disabled={saving || !form.date || !form.deposito_id || (!form.veiculo_id && !form.maquina_id) || toNum(form.quantity_liters) <= 0} className="rounded-2xl border border-emerald-400/35 bg-emerald-500/25 px-5 py-2.5 text-sm font-bold text-emerald-100 disabled:opacity-60">{saving ? "Salvando..." : "Salvar abastecimento"}</button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}
