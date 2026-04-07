"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { produtorDisplayLabel } from "@/lib/produtorLabel";
import {
  ClienteGerencial,
  Deposito,
  Cultivar,
  ContratoVenda,
  NotaFiscalGraosApi,
  ProdutoItem,
  EmpreendimentoApi,
  Operacao,
  Produtor,
  Propriedade,
  RomaneioGraosApi,
  Safra,
  Talhao,
  TransportadorPlaca,
  createNotaGraos,
  createRomaneioGraos,
  isApiError,
  listClientesGerencial,
  listContratosVenda,
  listCultivares,
  listDepositos,
  listEmpreendimentos,
  listNotasGraos,
  listOperacoes,
  listProdutosEstoque,
  listProdutores,
  listPropriedades,
  listRomaneiosGraos,
  listSafras,
  listTalhoes,
  listTransportadorPlacas,
  updateNotaGraos,
  updateRomaneioGraos
} from "@/lib/api";
import { formatDateBR } from "@/lib/locale";
import {
  ContraNotaEntrada,
  Empreendimento,
  Romaneio,
  calcRomaneioNetWeight,
  loadContraNotasEntrada,
  loadEmpreendimentos,
  loadRomaneios,
  saveContraNotasEntrada,
  saveRomaneios,
  uid
} from "@/lib/producaoLocal";

function n(v: unknown) {
  const x = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}
function d(value: string) {
  if (!value) return "-";
  const dt = new Date(`${value}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? value : formatDateBR(dt);
}
function isoDate(value: string) {
  if (!value) return "";
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}
function fmtKg(v: number) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG`;
}
function fmtSc(vKg: number, bagKg = 60) {
  return `${(vKg / bagKg).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} SC`;
}

function normalizeRomaneioStatus(row: Romaneio, contraNotas: ContraNotaEntrada[]): "pending" | "ok" {
  if (contraNotas.some((cn) => cn.romaneio_id === row.id)) return "ok";
  return "pending";
}

function CardIcon({
  tone,
  children
}: {
  tone: "slate" | "sky" | "emerald" | "violet";
  children: ReactNode;
}) {
  const toneClass =
    tone === "sky"
      ? "bg-sky-500/18 text-sky-300 ring-sky-400/25"
      : tone === "violet"
        ? "bg-violet-500/18 text-violet-300 ring-violet-400/25"
      : tone === "emerald"
        ? "bg-emerald-500/18 text-emerald-300 ring-emerald-400/25"
        : "bg-white/10 text-zinc-200 ring-white/10";
  return <div className={`grid h-10 w-10 place-items-center rounded-2xl ring-1 ${toneClass}`}>{children}</div>;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fromApiEmpreendimento(e: EmpreendimentoApi): Empreendimento {
  return {
    id: String(e.id),
    created_at: e.created_at,
    updated_at: e.updated_at,
    date: e.date ?? "",
    code: e.code ?? "",
    safra_id: e.safra_id ?? e.safra?.id ?? null,
    propriedade_id: e.propriedade_id ?? e.propriedade?.id ?? null,
    produto_id: e.produto_id ?? e.produto?.id ?? null,
    centro_custo_id: e.centro_custo_id ?? e.centro_custo?.id ?? null,
    unit: String(e.unit || "SC").toUpperCase().startsWith("KG") ? "KG" : "SC",
    sale_price: n(e.sale_price),
    billing_value: n(e.billing_value),
    status: e.status === "closed" ? "closed" : "in_progress",
    notes: e.notes ?? "",
    items: (e.items || []).map((it) => ({
      id: String(it.id),
      talhao_id: it.talhao_id ?? it.talhao?.id ?? null,
      produto_id: it.produto_id ?? it.produto?.id ?? null,
      cultivar_id: it.cultivar_id ?? it.cultivar?.id ?? null,
      unit: String(it.unit || "SC").toUpperCase().startsWith("KG") ? "KG" : "SC",
      area_ha: n(it.area_ha),
      produtividade: n(it.produtividade),
      plant_date: it.plant_date ?? "",
      close_date: it.close_date ?? "",
      production_sc: n(it.production_sc),
      production_kg: n(it.production_kg)
    }))
  };
}

type FormState = {
  date: string;
  code: string;
  nfp: string;
  operacao_id: string;
  safra_id: string;
  produtor_id: string;
  produto_id: string;
  contrato_id: string;
  empreendimento_id: string;
  propriedade_id: string;
  talhao_id: string;
  cliente_id: string;
  transportador_id: string;
  deposito: string;
  plate: string;
  driver: string;
  driver_cpf: string;
  weight: string;
  tare: string;
  humidity: string;
  impurity: string;
  ardido: string;
  others: string;
};

const EMPTY_FORM: FormState = {
  date: "",
  code: "",
  nfp: "",
  operacao_id: "",
  safra_id: "",
  produtor_id: "",
  produto_id: "",
  contrato_id: "",
  empreendimento_id: "",
  propriedade_id: "",
  talhao_id: "",
  cliente_id: "",
  transportador_id: "",
  deposito: "",
  plate: "",
  driver: "",
  driver_cpf: "",
  weight: "0",
  tare: "0",
  humidity: "0",
  impurity: "0",
  ardido: "0",
  others: "0"
};

type ContraNotaFormState = {
  date: string;
  nota_fiscal: string;
  chave: string;
  operacao: "remessa_deposito" | "a_fixar" | "venda_direta_contrato";
};

type ContratoSaldoModal = {
  qtyTotalKg: number;
  qtySoldKg: number;
  qtySaldoKg: number;
  valueTotal: number;
  valueSold: number;
  valueSaldo: number;
};

type ContratoSaldoMap = Record<number, ContratoSaldoModal>;

const EMPTY_CONTRA_NOTA_FORM: ContraNotaFormState = {
  date: "",
  nota_fiscal: "",
  chave: "",
  operacao: "remessa_deposito"
};

export default function RomaneioPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Romaneio | null>(null);
  const [detailTarget, setDetailTarget] = useState<Romaneio | null>(null);
  const [contraNotaTarget, setContraNotaTarget] = useState<Romaneio | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [contraNotaError, setContraNotaError] = useState("");
  const [contraNotaInfo, setContraNotaInfo] = useState("");
  const [contraNotaContratoSaldo, setContraNotaContratoSaldo] = useState<ContratoSaldoModal | null>(null);
  const [contraNotaContratoLoading, setContraNotaContratoLoading] = useState(false);
  const [contratoSaldoById, setContratoSaldoById] = useState<ContratoSaldoMap>({});
  const [formStep, setFormStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [contraNotaForm, setContraNotaForm] = useState<ContraNotaFormState>(EMPTY_CONTRA_NOTA_FORM);

  const [rows, setRows] = useState<Romaneio[]>([]);
  const [contraNotas, setContraNotas] = useState<ContraNotaEntrada[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);

  const [safras, setSafras] = useState<Safra[]>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [contratos, setContratos] = useState<ContratoVenda[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [clientes, setClientes] = useState<ClienteGerencial[]>([]);
  const [cultivares, setCultivares] = useState<Cultivar[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [placasTransportador, setPlacasTransportador] = useState<TransportadorPlaca[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterSafra, setFilterSafra] = useState<number | "">("");
  const [filterProdutor, setFilterProdutor] = useState<number | "">("");
  const [filterPropriedade, setFilterPropriedade] = useState<number | "">("");
  const [filterTalhao, setFilterTalhao] = useState<number | "">("");
  const [filterEmpreendimento, setFilterEmpreendimento] = useState<string>("");
  const [filterTransportador, setFilterTransportador] = useState<number | "">("");
  const [filterPlaca, setFilterPlaca] = useState<string>("");
  const [filterCliente, setFilterCliente] = useState<number | "">("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [viewUnit, setViewUnit] = useState<"KG" | "SC">("KG");
  const [scBagKg, setScBagKg] = useState<40 | 60>(60);

  useEffect(() => {
    setRows(loadRomaneios());
    setContraNotas(loadContraNotasEntrada());
    setEmpreendimentos(loadEmpreendimentos());
    void loadRefs();
  }, []);

  async function loadRefs() {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [a, b, c, d, e, f, g, h, i, j, k, emps, notasGraos, romaneiosGraos] = await Promise.all([
        listSafras(token),
        listProdutores(token),
        listProdutosEstoque(token),
        listContratosVenda(token),
        listOperacoes(token),
        listPropriedades(token),
        listTalhoes(token),
        listClientesGerencial(token),
        listCultivares(token),
        listDepositos(token),
        listTransportadorPlacas(token),
        listEmpreendimentos(token),
        listNotasGraos(token),
        listRomaneiosGraos(token)
      ]);
      setSafras(a);
      setProdutores(b);
      setProdutos(c);
      setContratos(d);
      setOperacoes(e);
      setPropriedades(f);
      setTalhoes(g);
      setClientes(h);
      setCultivares(i);
      setDepositos(j);
      setPlacasTransportador(k);
      setEmpreendimentos(emps.map(fromApiEmpreendimento));
      const localRows = loadRomaneios();
      const mappedContraNotas = notasGraos
        .filter((nf) => nf.tipo === "entrada" && nf.romaneio?.id)
        .map((nf) => mapNotaApiToContraNota(nf, localRows));
      if (mappedContraNotas.length) {
        setContraNotas(mappedContraNotas);
        saveContraNotasEntrada(mappedContraNotas);
      }
      setContratoSaldoById(buildContratoSaldoMap(d, romaneiosGraos, notasGraos));
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao carregar referências.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const placasAtivasLocal = placasTransportador.filter((p) => p.is_active);
    return rows.filter((r) => {
      if (filterSafra !== "" && r.safra_id !== Number(filterSafra)) return false;
      if (filterProdutor !== "" && r.produtor_id !== Number(filterProdutor)) return false;
      if (filterPropriedade !== "" && r.propriedade_id !== Number(filterPropriedade)) return false;
      if (filterTalhao !== "" && r.talhao_id !== Number(filterTalhao)) return false;
      if (filterEmpreendimento && r.empreendimento_id !== filterEmpreendimento) return false;
      if (filterCliente !== "" && r.cliente_id !== Number(filterCliente)) return false;
      const rowTransportadorId = (r as Romaneio & { transportador_id?: number | null }).transportador_id
        ?? (placasAtivasLocal.find((p) => p.plate === (r.plate || "").toUpperCase())?.transportador?.id ?? null);
      if (filterTransportador !== "" && rowTransportadorId !== Number(filterTransportador)) return false;
      if (filterPlaca && (r.plate || "").toUpperCase() !== filterPlaca.toUpperCase()) return false;
      if (filterDateFrom && r.date && r.date < filterDateFrom) return false;
      if (filterDateTo && r.date && r.date > filterDateTo) return false;
      return true;
    });
  }, [
    rows,
    filterSafra,
    filterProdutor,
    filterPropriedade,
    filterTalhao,
    filterEmpreendimento,
    filterCliente,
    filterTransportador,
    filterPlaca,
    filterDateFrom,
    filterDateTo,
    placasTransportador
  ]);

  const selectedSafra = useMemo(
    () => safras.find((s) => s.id === Number(filterSafra)) ?? null,
    [safras, filterSafra]
  );

  const filteredEmpreendimentos = useMemo(
    () => empreendimentos.filter((e) => (filterSafra === "" ? true : e.safra_id === Number(filterSafra))),
    [empreendimentos, filterSafra]
  );

  const contraNotaByRomaneioId = useMemo(() => {
    const map = new Map<string, ContraNotaEntrada>();
    for (const cn of contraNotas) map.set(cn.romaneio_id, cn);
    return map;
  }, [contraNotas]);

  const card = useMemo(() => {
    const areaPlantada = filteredEmpreendimentos.reduce(
      (acc, e) => acc + (e.items || []).reduce((sum, it) => sum + n(it.area_ha), 0),
      0
    );
    const plannedKg = filteredEmpreendimentos.reduce(
      (acc, e) => acc + (e.items || []).reduce((sum, it) => sum + n(it.production_kg), 0),
      0
    );
    const totalGross = filteredRows.reduce((acc, r) => acc + n(r.gross_weight), 0);
    const totalDiscount = filteredRows.reduce((acc, r) => acc + n(r.humidity) + n(r.impurity) + n(r.ardido) + n(r.others), 0);
    const totalNet = Math.max(totalGross - totalDiscount, 0);
    const plannedAvgPerHaKg = areaPlantada > 0 ? plannedKg / areaPlantada : 0;
    const realizedAvgPerHaKg = areaPlantada > 0 ? totalNet / areaPlantada : 0;
    return { areaPlantada, plannedKg, totalGross, totalDiscount, totalNet, plannedAvgPerHaKg, realizedAvgPerHaKg };
  }, [filteredRows, filteredEmpreendimentos]);

  const temporalSeries = useMemo(() => {
    const daily = new Map<string, { qty: number; gross: number; disc: number; loads: number }>();
    const safraStart = isoDate(selectedSafra?.start_date || "");
    const safraEnd = isoDate(selectedSafra?.end_date || "");
    for (const r of filteredRows) {
      // Apenas cargas efetivamente entregues (peso líquido > 0).
      if (n(r.net_weight) <= 0) continue;
      const key = isoDate(r.date);
      if (!key) continue;
      if (safraStart && key < safraStart) continue;
      if (safraEnd && key > safraEnd) continue;
      const prev = daily.get(key) ?? { qty: 0, gross: 0, disc: 0, loads: 0 };
      prev.qty += n(r.net_weight);
      prev.gross += n(r.gross_weight);
      prev.disc += n(r.humidity) + n(r.impurity) + n(r.ardido) + n(r.others);
      prev.loads += 1;
      daily.set(key, prev);
    }
    return [...daily.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({ key, qty: val.qty, gross: val.gross, disc: val.disc, loads: val.loads }));
  }, [filteredRows, selectedSafra]);

  const temporalMeta = useMemo(() => {
    const total = temporalSeries.reduce((acc, p) => acc + p.qty, 0);
    const avg = temporalSeries.length ? total / temporalSeries.length : 0;
    const max = Math.max(...temporalSeries.map((p) => p.qty), 1);
    return { total, avg, max };
  }, [temporalSeries]);

  const talhaoSeries = useMemo(() => {
    const estimatedMap = new Map<number, number>();
    for (const e of filteredEmpreendimentos) {
      for (const item of e.items || []) {
        if (!item.talhao_id) continue;
        estimatedMap.set(item.talhao_id, (estimatedMap.get(item.talhao_id) ?? 0) + n(item.production_kg));
      }
    }
    const realizedMap = new Map<number, number>();
    for (const r of filteredRows) {
      if (!r.talhao_id) continue;
      realizedMap.set(r.talhao_id, (realizedMap.get(r.talhao_id) ?? 0) + n(r.net_weight));
    }
    const keys = new Set<number>([...estimatedMap.keys(), ...realizedMap.keys()]);
    return [...keys]
      .map((id) => ({
        id,
        label: talhoes.find((t) => t.id === id)?.name ?? `Talhão ${id}`,
        estimated: estimatedMap.get(id) ?? 0,
        realized: realizedMap.get(id) ?? 0
      }))
      .sort((a, b) => b.realized - a.realized)
      .slice(0, 8);
  }, [filteredEmpreendimentos, filteredRows, talhoes]);

  const majorCultivarByEmpTalhao = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredEmpreendimentos) {
      const grouped = new Map<number, { cultivarId: number; qty: number }[]>();
      for (const item of e.items || []) {
        if (!item.talhao_id || !item.cultivar_id) continue;
        const arr = grouped.get(item.talhao_id) ?? [];
        arr.push({ cultivarId: item.cultivar_id, qty: n(item.production_kg) });
        grouped.set(item.talhao_id, arr);
      }
      for (const [talhaoId, arr] of grouped.entries()) {
        const major = arr.sort((a, b) => b.qty - a.qty)[0];
        if (major) map.set(`${e.id}::${talhaoId}`, major.cultivarId);
      }
    }
    return map;
  }, [filteredEmpreendimentos]);

  const cultivarSeries = useMemo(() => {
    const estimatedMap = new Map<number, number>();
    for (const e of filteredEmpreendimentos) {
      for (const item of e.items || []) {
        if (!item.cultivar_id) continue;
        estimatedMap.set(item.cultivar_id, (estimatedMap.get(item.cultivar_id) ?? 0) + n(item.production_kg));
      }
    }
    const realizedMap = new Map<number, number>();
    for (const r of filteredRows) {
      if (!r.empreendimento_id || !r.talhao_id) continue;
      const cultivarId = majorCultivarByEmpTalhao.get(`${r.empreendimento_id}::${r.talhao_id}`);
      if (!cultivarId) continue;
      realizedMap.set(cultivarId, (realizedMap.get(cultivarId) ?? 0) + n(r.net_weight));
    }
    const keys = new Set<number>([...estimatedMap.keys(), ...realizedMap.keys()]);
    return [...keys]
      .map((id) => ({
        id,
        label: cultivares.find((c) => c.id === id)?.name ?? `Cultivar ${id}`,
        estimated: estimatedMap.get(id) ?? 0,
        realized: realizedMap.get(id) ?? 0
      }))
      .sort((a, b) => b.realized - a.realized)
      .slice(0, 8);
  }, [filteredEmpreendimentos, filteredRows, majorCultivarByEmpTalhao, cultivares]);

  const plateSeries = useMemo(() => {
    const map = new Map<string, { qty: number; loads: number }>();
    for (const r of filteredRows) {
      const key = (r.plate || "SEM PLACA").trim().toUpperCase() || "SEM PLACA";
      const prev = map.get(key) ?? { qty: 0, loads: 0 };
      prev.qty += n(r.gross_weight || r.net_weight);
      prev.loads += 1;
      map.set(key, prev);
    }
    return [...map.entries()]
      .map(([label, v]) => ({ label, qty: v.qty, loads: v.loads }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [filteredRows]);

  const clientProducerSeries = useMemo(() => {
    const map = new Map<string, { qty: number; loads: number; cliente: string; produtor: string }>();
    for (const r of filteredRows) {
      const cliente = clientes.find((c) => c.id === r.cliente_id)?.name ?? "Sem cliente";
      const produtor = produtores.find((p) => p.id === r.produtor_id)?.name ?? "Sem produtor";
      const key = `${cliente}::${produtor}`;
      const prev = map.get(key) ?? { qty: 0, loads: 0, cliente, produtor };
      prev.qty += n(r.net_weight);
      prev.loads += 1;
      map.set(key, prev);
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [filteredRows, clientes, produtores]);

  const operacoesRomaneio = useMemo(
    () =>
      operacoes
        .filter((o) => o.kind === "remessa_deposito" || o.kind === "a_fixar")
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [operacoes]
  );

  const depositosGraos = useMemo(
    () =>
      depositos
        .filter((d) => d.is_active && d.tipo === "graos")
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [depositos]
  );

  const placasAtivas = useMemo(
    () =>
      placasTransportador
        .filter((p) => p.is_active)
        .sort((a, b) => a.plate.localeCompare(b.plate, "pt-BR")),
    [placasTransportador]
  );

  const transportadoresAtivos = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    for (const p of placasAtivas) {
      if (p.transportador?.id) map.set(p.transportador.id, { id: p.transportador.id, name: p.transportador.name });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [placasAtivas]);

  function toViewWeight(kg: number) {
    return viewUnit === "KG" ? fmtKg(kg) : fmtSc(kg, scBagKg);
  }
  function toViewWeightCard(kg: number) {
    if (viewUnit === "KG") {
      return `${kg.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} KG`;
    }
    return `${(kg / scBagKg).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} SC`;
  }

  function toViewValue(kg: number) {
    return viewUnit === "KG" ? kg : kg / scBagKg;
  }

  function toViewPerHa(kgPerHa: number) {
    const unit = viewUnit === "KG" ? "KG/ha" : "SC/ha";
    return `${toViewValue(kgPerHa).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${unit}`;
  }

  const propriedadesDoProdutor = useMemo(() => {
    if (!form.produtor_id) return propriedades;
    const produtorId = Number(form.produtor_id);
    return propriedades.filter((p) => {
      const linked = (p.produtores ?? []).map((x) => x.id);
      if (linked.length) return linked.includes(produtorId);
      return (p.produtor?.id ?? null) === produtorId;
    });
  }, [propriedades, form.produtor_id]);

  const produtoresComPropriedade = useMemo(() => {
    const ids = new Set<number>();
    for (const p of propriedades) {
      if (p.produtor?.id) ids.add(p.produtor.id);
      const linked = (p.produtores ?? []).map((x) => x.id);
      for (const id of linked) ids.add(id);
    }
    return produtores.filter((p) => ids.has(p.id));
  }, [produtores, propriedades]);

  const contratosDoProdutor = useMemo(
    () =>
      contratos
        .filter((c) => {
          if (!form.produtor_id) return false;
          const matchProdutor = (c.produtor?.id ?? null) === Number(form.produtor_id);
          const matchSafra = !form.safra_id || (c.safra?.id ?? null) === Number(form.safra_id);
          return matchProdutor && matchSafra;
        })
        .sort((a, b) => (a.code || "").localeCompare(b.code || "", "pt-BR")),
    [contratos, form.produtor_id, form.safra_id]
  );

  const produtosDisponiveis = useMemo(() => {
    const ids = new Set<number>();
    for (const e of empreendimentos) {
      const matchSafra = !form.safra_id || e.safra_id === Number(form.safra_id);
      const matchProp = !form.propriedade_id || e.propriedade_id === Number(form.propriedade_id);
      if (!matchSafra || !matchProp) continue;
      if (e.produto_id) ids.add(e.produto_id);
    }
    return produtos
      .filter((p) => ids.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [empreendimentos, produtos, form.safra_id, form.propriedade_id]);

  const empreendimentosFiltrados = useMemo(
    () =>
      empreendimentos
        .filter((e) => {
          const matchSafra = !form.safra_id || e.safra_id === Number(form.safra_id);
          const matchProp = !form.propriedade_id || e.propriedade_id === Number(form.propriedade_id);
          const matchProduto = !form.produto_id || e.produto_id === Number(form.produto_id);
          return matchSafra && matchProp && matchProduto;
        })
        .sort((a, b) => (a.code || "").localeCompare(b.code || "", "pt-BR")),
    [empreendimentos, form.safra_id, form.propriedade_id, form.produto_id]
  );

  const talhoesFiltrados = useMemo(
    () =>
      talhoes
        .filter((t) => !form.propriedade_id || t.propriedade?.id === Number(form.propriedade_id))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [talhoes, form.propriedade_id]
  );

  const placasDoTransportador = useMemo(
    () =>
      placasAtivas.filter(
        (pl) => !form.transportador_id || pl.transportador?.id === Number(form.transportador_id)
      ),
    [placasAtivas, form.transportador_id]
  );

  const grossWeight = useMemo(() => Math.max(n(form.weight) - n(form.tare), 0), [form.weight, form.tare]);
  const grossMinusHumidity = useMemo(() => Math.max(grossWeight - n(form.humidity), 0), [grossWeight, form.humidity]);
  const netWeight = useMemo(
    () => calcRomaneioNetWeight(n(form.weight), n(form.tare), n(form.humidity), n(form.impurity), n(form.ardido), n(form.others)),
    [form]
  );
  const discountPct = useMemo(() => {
    const humidityPct = grossWeight > 0 ? (n(form.humidity) / grossWeight) * 100 : 0;
    const base = grossMinusHumidity;
    const impurityPct = base > 0 ? (n(form.impurity) / base) * 100 : 0;
    const ardidoPct = base > 0 ? (n(form.ardido) / base) * 100 : 0;
    const othersPct = base > 0 ? (n(form.others) / base) * 100 : 0;
    return { humidityPct, impurityPct, ardidoPct, othersPct };
  }, [grossWeight, grossMinusHumidity, form.humidity, form.impurity, form.ardido, form.others]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setConfirmSaveOpen(false);
    setFormStep(0);
    setOpen(true);
  }

  function openEdit(row: Romaneio) {
    const mappedTransportadorId =
      (row as Romaneio & { transportador_id?: number | null }).transportador_id
      ?? (placasAtivas.find((p) => p.plate === (row.plate || "").toUpperCase())?.transportador?.id ?? null);
    const empreendimentoAtual = row.empreendimento_id
      ? empreendimentos.find((e) => e.id === row.empreendimento_id)
      : null;
    setEditingId(row.id);
    setForm({
      date: row.date || "",
      code: row.code || "",
      nfp: row.nfp || "",
      operacao_id: row.operacao_id ? String(row.operacao_id) : "",
      safra_id: row.safra_id ? String(row.safra_id) : "",
      produtor_id: row.produtor_id ? String(row.produtor_id) : "",
      produto_id: row.produto_id ? String(row.produto_id) : (empreendimentoAtual?.produto_id ? String(empreendimentoAtual.produto_id) : ""),
      contrato_id: row.contrato_id ? String(row.contrato_id) : "",
      empreendimento_id: row.empreendimento_id ?? "",
      propriedade_id: row.propriedade_id ? String(row.propriedade_id) : "",
      talhao_id: row.talhao_id ? String(row.talhao_id) : "",
      cliente_id: row.cliente_id ? String(row.cliente_id) : "",
      transportador_id: mappedTransportadorId ? String(mappedTransportadorId) : "",
      deposito: row.deposito || "",
      plate: row.plate || "",
      driver: row.driver || "",
      driver_cpf: row.driver_cpf || "",
      weight: String(row.weight ?? 0),
      tare: String(row.tare ?? 0),
      humidity: String(row.humidity ?? 0),
      impurity: String(row.impurity ?? 0),
      ardido: String(row.ardido ?? 0),
      others: String(row.others ?? 0)
    });
    setConfirmSaveOpen(false);
    setFormStep(0);
    setOpen(true);
  }

  function removeItem(id: string) {
    try {
      const next = rows.filter((x) => x.id !== id);
      setRows(next);
      saveRomaneios(next);
      const nextContraNotas = contraNotas.filter((x) => x.romaneio_id !== id);
      setContraNotas(nextContraNotas);
      saveContraNotasEntrada(nextContraNotas);
      setDeleteTarget(null);
      setDeleteError("");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Falha ao excluir romaneio.");
    }
  }

  function openContraNota(row: Romaneio) {
    setContraNotaError("");
    setContraNotaInfo("");
    setContraNotaContratoSaldo(null);
    setContraNotaContratoLoading(false);
    const existing = contraNotas.find((x) => x.romaneio_id === row.id);
    const isVendaDiretaContrato = Boolean(row.contrato_id);
    setContraNotaForm(
      existing
        ? {
            date: existing.date || "",
            nota_fiscal: existing.nota_fiscal || "",
            chave: existing.chave || "",
            operacao: isVendaDiretaContrato ? "venda_direta_contrato" : existing.operacao
          }
        : {
            ...EMPTY_CONTRA_NOTA_FORM,
            operacao: isVendaDiretaContrato ? "venda_direta_contrato" : EMPTY_CONTRA_NOTA_FORM.operacao,
            date: row.date || new Date().toISOString().slice(0, 10)
          }
    );
    setContraNotaTarget(row);
    if (isVendaDiretaContrato) {
      void loadContratoSaldoModal(row);
    }
  }

  function toFinalidadeEntrada(
    operacao: ContraNotaFormState["operacao"],
    hasContrato: boolean
  ): "remessa_deposito" | "a_fixar" {
    if (hasContrato) return "remessa_deposito";
    return operacao === "a_fixar" ? "a_fixar" : "remessa_deposito";
  }

  function toKgByUnit(qty: number, unit: string) {
    return String(unit || "KG").toUpperCase().startsWith("KG") ? qty : qty * 60;
  }

  function avgContratoPriceKg(contrato: ContratoVenda | undefined) {
    if (!contrato) return 0;
    const items = contrato.items || [];
    let qtyKg = 0;
    let total = 0;
    for (const item of items) {
      const itemQtyKg = toKgByUnit(n(item.quantity), item.unit || "KG");
      qtyKg += itemQtyKg;
      total += n(item.total_item) > 0 ? n(item.total_item) : n(item.quantity) * n(item.price);
    }
    if (qtyKg <= 0) return 0;
    return total / qtyKg;
  }

  function moneyBR(v: number) {
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function buildContratoSaldoMap(
    contratosBase: ContratoVenda[],
    romaneiosApi: RomaneioGraosApi[],
    notasApi: NotaFiscalGraosApi[]
  ): ContratoSaldoMap {
    const out: ContratoSaldoMap = {};
    for (const contrato of contratosBase) {
      const contratoId = contrato.id;
      const qtyTotalKg = (contrato.items || []).reduce((acc, it) => acc + toKgByUnit(n(it.quantity), it.unit || "KG"), 0);
      const valueTotal = n(contrato.total_value);
      const romaneioIdsContrato = new Set(
        romaneiosApi
          .filter((r) => (r.contrato_id ?? r.contrato?.id ?? null) === contratoId)
          .map((r) => r.id)
      );
      const notasContrato = notasApi.filter(
        (nf) =>
          nf.tipo === "entrada" &&
          (nf.status || "").toLowerCase() !== "canceled" &&
          (nf.romaneio?.id ? romaneioIdsContrato.has(nf.romaneio.id) : false)
      );
      const qtySoldKg = notasContrato.reduce((acc, nf) => acc + n(nf.quantity_kg), 0);
      const valueSold = notasContrato.reduce((acc, nf) => acc + n(nf.total_value), 0);
      out[contratoId] = {
        qtyTotalKg,
        qtySoldKg,
        qtySaldoKg: Math.max(qtyTotalKg - qtySoldKg, 0),
        valueTotal,
        valueSold,
        valueSaldo: Math.max(valueTotal - valueSold, 0)
      };
    }
    return out;
  }

  async function loadContratoSaldoModal(row: Romaneio) {
    const token = getAccessToken();
    if (!token || !row.contrato_id) return;
    setContraNotaContratoLoading(true);
    try {
      const [romaneiosApi, notasApi] = await Promise.all([listRomaneiosGraos(token), listNotasGraos(token)]);
      const saldoMap = buildContratoSaldoMap(contratos, romaneiosApi, notasApi);
      setContratoSaldoById(saldoMap);
      setContraNotaContratoSaldo(saldoMap[row.contrato_id] ?? null);
    } catch {
      setContraNotaContratoSaldo(null);
    } finally {
      setContraNotaContratoLoading(false);
    }
  }

  function mapNotaApiToContraNota(nf: NotaFiscalGraosApi, localRows: Romaneio[] = rows): ContraNotaEntrada {
    const localRow = localRows.find(
      (r) =>
        (r.code || "").trim().toUpperCase() === (nf.romaneio?.code || "").trim().toUpperCase() &&
        (r.nfp || "").trim().toUpperCase() === (nf.romaneio?.nfp || "").trim().toUpperCase()
    );
    const hasContrato = Boolean(localRow?.contrato_id);
    const operacao: ContraNotaEntrada["operacao"] =
      hasContrato
        ? "venda_direta_contrato"
        : nf.finalidade === "a_fixar"
          ? "a_fixar"
          : "remessa_deposito";
    return {
      id: `nf-${nf.id}`,
      created_at: nf.created_at,
      updated_at: nf.updated_at,
      romaneio_id: localRow?.id ?? (nf.romaneio?.code ?? String(nf.romaneio?.id ?? "")),
      romaneio_code: localRow?.code ?? (nf.romaneio?.code ?? "-"),
      nfp_ref: localRow?.nfp ?? (nf.romaneio?.nfp ?? ""),
      operacao,
      date: nf.date ?? "",
      nota_fiscal: nf.number ?? "",
      chave: ""
    };
  }

  async function saveContraNota() {
    if (!contraNotaTarget) return;
    if (!contraNotaTarget.nfp?.trim()) {
      setContraNotaError("Este romaneio precisa da NFP preenchida para registrar a contra-nota.");
      return;
    }
    if (!contraNotaForm.date || !contraNotaForm.nota_fiscal.trim() || !contraNotaForm.chave.trim()) {
      setContraNotaError("Preencha Data, Nota Fiscal e Chave da contra-nota.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setSaving(true);
    setContraNotaError("");
    setContraNotaInfo("");
    try {
      const isVendaDiretaContrato = Boolean(contraNotaTarget.contrato_id);
      if (isVendaDiretaContrato && contraNotaContratoSaldo) {
        const qtyRomaneioKg = Math.max(n(contraNotaTarget.net_weight), 0);
        if (qtyRomaneioKg - contraNotaContratoSaldo.qtySaldoKg > 0.0001) {
          setContraNotaError(
            `Quantidade do romaneio acima do saldo do contrato. Saldo disponível: ${contraNotaContratoSaldo.qtySaldoKg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG.`
          );
          return;
        }
      }
      const romaneiosApi = await listRomaneiosGraos(token);
      const sameRomaneio = romaneiosApi.find(
        (r) =>
          (r.code || "").trim().toUpperCase() === (contraNotaTarget.code || "").trim().toUpperCase() &&
          (r.nfp || "").trim().toUpperCase() === (contraNotaTarget.nfp || "").trim().toUpperCase()
      );

      const depositoMatch = depositosGraos.find(
        (dpt) => dpt.name.trim().toUpperCase() === (contraNotaTarget.deposito || "").trim().toUpperCase()
      );
      const quantityKg = Math.max(n(contraNotaTarget.net_weight), 0);

      const romaneioPayload: Partial<{
        date: string | null;
        code: string;
        nfp: string;
        safra_id: number | null;
        produtor_id: number | null;
        cliente_id: number | null;
        produto_id: number | null;
        contrato_id: number | null;
        deposito_id: number | null;
        operacao_id: number | null;
        quantity_kg: number | string;
        status: "pending" | "ok" | string;
        notes: string;
      }> = {
        date: contraNotaTarget.date || null,
        code: (contraNotaTarget.code || "").trim().toUpperCase(),
        nfp: (contraNotaTarget.nfp || "").trim().toUpperCase(),
        safra_id: contraNotaTarget.safra_id ?? null,
        produtor_id: contraNotaTarget.produtor_id ?? null,
        cliente_id: contraNotaTarget.cliente_id ?? null,
        produto_id: contraNotaTarget.produto_id ?? null,
        contrato_id: contraNotaTarget.contrato_id ?? null,
        deposito_id: depositoMatch?.id ?? null,
        operacao_id: contraNotaTarget.operacao_id ?? null,
        quantity_kg: quantityKg,
        status: "ok",
        notes: contraNotaTarget.nfp?.trim()
          ? `Contra-nota registrada. NFP ref: ${contraNotaTarget.nfp.trim().toUpperCase()}`
          : "Contra-nota registrada."
      };

      const romaneioPersisted: RomaneioGraosApi = sameRomaneio
        ? await updateRomaneioGraos(token, sameRomaneio.id, romaneioPayload)
        : await createRomaneioGraos(token, romaneioPayload);

      const notasApi = await listNotasGraos(token);
      const notaEntradaExistente = notasApi.find(
        (nf) => nf.tipo === "entrada" && (nf.romaneio?.id ?? null) === romaneioPersisted.id
      );

      const notaPayload: Partial<{
        tipo: "entrada" | "saida" | string;
        finalidade: "remessa_deposito" | "a_fixar" | "devolucao" | "venda" | string;
        status: string;
        date: string | null;
        due_date: string | null;
        number: string;
        romaneio_id: number | null;
        nota_entrada_ref_id: number | null;
        safra_id: number | null;
        produtor_id: number | null;
        cliente_id: number | null;
        produto_id: number | null;
        deposito_id: number | null;
        operacao_id: number | null;
        quantity_kg: number | string;
        price: number | string;
        discount: number | string;
      }> = {
        tipo: "entrada",
        finalidade: toFinalidadeEntrada(contraNotaForm.operacao, isVendaDiretaContrato),
        date: contraNotaForm.date,
        number: contraNotaForm.nota_fiscal.trim().toUpperCase(),
        romaneio_id: romaneioPersisted.id,
        safra_id: romaneioPersisted.safra_id ?? null,
        produtor_id: romaneioPersisted.produtor_id ?? null,
        cliente_id: romaneioPersisted.cliente_id ?? null,
        produto_id: romaneioPersisted.produto_id ?? null,
        deposito_id: romaneioPersisted.deposito_id ?? null,
        operacao_id: romaneioPersisted.operacao_id ?? null,
        quantity_kg: quantityKg,
        price: isVendaDiretaContrato
          ? avgContratoPriceKg(contratos.find((c) => c.id === contraNotaTarget.contrato_id))
          : 0,
        discount: 0
      };

      const notaSalva = notaEntradaExistente
        ? await updateNotaGraos(token, notaEntradaExistente.id, notaPayload)
        : await createNotaGraos(token, notaPayload);

      const [romaneiosApiAfter, notasApiAfter] = await Promise.all([listRomaneiosGraos(token), listNotasGraos(token)]);
      const saldoMapAfter = buildContratoSaldoMap(contratos, romaneiosApiAfter, notasApiAfter);
      setContratoSaldoById(saldoMapAfter);

      const now = new Date().toISOString();
      const existing = contraNotas.find((x) => x.romaneio_id === contraNotaTarget.id);
      const entity: ContraNotaEntrada = {
        id: existing?.id ?? uid("cn"),
        created_at: existing?.created_at ?? now,
        updated_at: now,
        romaneio_id: contraNotaTarget.id,
        romaneio_code: contraNotaTarget.code,
        nfp_ref: contraNotaTarget.nfp.trim().toUpperCase(),
        operacao: isVendaDiretaContrato ? "venda_direta_contrato" : contraNotaForm.operacao,
        date: notaSalva.date ?? contraNotaForm.date,
        nota_fiscal: notaSalva.number || contraNotaForm.nota_fiscal.trim().toUpperCase(),
        chave: contraNotaForm.chave.trim()
      };
      const next = existing
        ? contraNotas.map((x) => (x.id === existing.id ? entity : x))
        : [entity, ...contraNotas];
      setContraNotas(next);
      saveContraNotasEntrada(next);
      setContraNotaInfo(
        isVendaDiretaContrato
          ? "Contra-nota salva como venda direta por contrato. Fatura gerada em Contas a Receber."
          : "Contra-nota salva e sincronizada no backend com sucesso."
      );
      setContraNotaTarget(null);
      setContraNotaError("");
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setContraNotaError(err instanceof Error ? err.message : "Falha ao salvar contra-nota no backend.");
    } finally {
      setSaving(false);
    }
  }

  const contraNotaQtyExceedsContrato = useMemo(() => {
    if (!contraNotaTarget?.contrato_id || !contraNotaContratoSaldo) return false;
    return Math.max(n(contraNotaTarget.net_weight), 0) - contraNotaContratoSaldo.qtySaldoKg > 0.0001;
  }, [contraNotaTarget, contraNotaContratoSaldo]);

  function requestSave() {
    if (!form.code.trim()) {
      setError("Informe o número do romaneio.");
      return;
    }
    setConfirmSaveOpen(true);
  }

  function printOne(row: Romaneio) {
    const produtor = produtores.find((p) => p.id === row.produtor_id)?.name ?? "-";
    const cliente = clientes.find((c) => c.id === row.cliente_id)?.name ?? "-";
    const safra = safras.find((s) => s.id === row.safra_id)?.name ?? "-";
    const propriedade = propriedades.find((p) => p.id === row.propriedade_id)?.name ?? "-";
    const talhao = talhoes.find((t) => t.id === row.talhao_id)?.name ?? "-";
    const contrato = contratos.find((c) => c.id === row.contrato_id)?.code ?? "-";
    const empreendimento = empreendimentos.find((e) => e.id === row.empreendimento_id)?.code ?? "-";
    const transportador =
      placasAtivas.find((p) => p.plate === (row.plate || "").toUpperCase())?.transportador?.name ?? "-";
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Romaneio ${escapeHtml(row.code)}</title><style>body{font-family:Arial,sans-serif;padding:16px;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f6f6f6}</style></head><body><h1>Romaneio ${escapeHtml(row.code)}</h1><table><tbody>
    <tr><th>Data</th><td>${d(row.date)}</td><th>NFP</th><td>${row.nfp || "-"}</td></tr>
    <tr><th>Safra</th><td>${safra}</td><th>Operação</th><td>${operacoes.find((o)=>o.id===row.operacao_id)?.name ?? "-"}</td></tr>
    <tr><th>Produtor</th><td>${produtor}</td><th>Cliente</th><td>${cliente}</td></tr>
    <tr><th>Propriedade</th><td>${propriedade}</td><th>Talhão</th><td>${talhao}</td></tr>
    <tr><th>Contrato</th><td>${contrato}</td><th>Empreendimento</th><td>${empreendimento}</td></tr>
    <tr><th>Transportadora</th><td>${transportador}</td><th>Placa</th><td>${row.plate || "-"}</td></tr>
    <tr><th>Motorista</th><td>${row.driver || "-"}</td><th>CPF</th><td>${row.driver_cpf || "-"}</td></tr>
    <tr><th>Depósito</th><td>${row.deposito || "-"}</td><th>Peso Bruto</th><td>${toViewWeight(n(row.gross_weight))}</td></tr>
    <tr><th>Peso Líquido</th><td>${toViewWeight(n(row.net_weight))}</td><th>Tara</th><td>${toViewWeight(n(row.tare))}</td></tr>
    <tr><th>Umidade</th><td>${toViewWeight(n(row.humidity))} (${((n(row.humidity)/Math.max(n(row.gross_weight),1))*100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}%)</td><th>Impureza</th><td>${toViewWeight(n(row.impurity))}</td></tr>
    <tr><th>Ardido</th><td>${toViewWeight(n(row.ardido))}</td><th>Outros</th><td>${toViewWeight(n(row.others))}</td></tr>
    </tbody></table></body></html>`;
    const w = window.open("about:blank", "_blank", "width=1000,height=720");
    if (!w) return;
    try {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      window.setTimeout(() => {
        w.print();
      }, 180);
    } catch {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      w.location.href = url;
      window.setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch {
          // noop
        }
      }, 260);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  }

  function save() {
    setSaving(true);
    setError("");
    try {
      const now = new Date().toISOString();
      const entity: Romaneio = {
        id: editingId ?? uid("rom"),
        created_at: editingId ? (rows.find((r) => r.id === editingId)?.created_at ?? now) : now,
        updated_at: now,
        date: form.date,
        code: form.code.trim().toUpperCase(),
        nfp: form.nfp.trim().toUpperCase(),
        operacao_id: form.operacao_id ? Number(form.operacao_id) : null,
        safra_id: form.safra_id ? Number(form.safra_id) : null,
        produtor_id: form.produtor_id ? Number(form.produtor_id) : null,
        produto_id: form.produto_id ? Number(form.produto_id) : null,
        contrato_id: form.contrato_id ? Number(form.contrato_id) : null,
        empreendimento_id: form.empreendimento_id || null,
        propriedade_id: form.propriedade_id ? Number(form.propriedade_id) : null,
        talhao_id: form.talhao_id ? Number(form.talhao_id) : null,
        cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
        transportador_id: form.transportador_id ? Number(form.transportador_id) : null,
        deposito: form.deposito.trim().toUpperCase(),
        plate: form.plate.trim().toUpperCase(),
        driver: form.driver.trim(),
        driver_cpf: form.driver_cpf.trim(),
        weight: n(form.weight),
        tare: n(form.tare),
        gross_weight: grossWeight,
        humidity: n(form.humidity),
        impurity: n(form.impurity),
        ardido: n(form.ardido),
        others: n(form.others),
        net_weight: netWeight,
        status: "pending"
      };
      const next = editingId ? rows.map((r) => (r.id === editingId ? entity : r)) : [entity, ...rows];
      setRows(next);
      saveRomaneios(next);
      setConfirmSaveOpen(false);
      setEditingId(null);
      setFormStep(0);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  function openReport(title: string, body: string, orientation: "portrait" | "landscape" = "landscape") {
    const generatedAt = new Date().toLocaleString("pt-BR");
    const logoUrl = `${window.location.origin}/logo_horizontal.png`;
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
      <style>
        @page { size: A4 ${orientation}; margin: 12mm 10mm; }
        body { font-family: Arial, sans-serif; color:#111; margin:0; }
        .page { padding: 14px 10px 10px; }
        .header { display:grid; grid-template-columns:260px 1fr; gap:12px; align-items:center; border:1px solid #e4e4e7; border-radius:10px; padding:8px 10px; margin-bottom:12px; }
        .header-info { text-align:right; }
        .header-title { margin:0; font-size:18px; font-weight:800; }
        .header-meta { margin-top:4px; color:#52525b; font-size:11px; line-height:1.4; }
        .footer { margin-top:14px; border-top:1px solid #d4d4d8; padding-top:8px; color:#52525b; font-size:11px; line-height:1.45; }
        h1 { font-size: 20px; margin:0 0 6px; }
        .muted { color:#555; font-size:12px; margin-bottom:10px; }
        .kpi { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:12px; }
        .card { border:1px solid #ddd; border-radius:8px; padding:8px; }
        .label { font-size:11px; color:#666; text-transform:uppercase; letter-spacing:.08em; }
        .value { margin-top:4px; font-size:18px; font-weight:700; }
        table { width:100%; border-collapse: collapse; font-size: 12px; margin-top:10px; }
        th, td { border:1px solid #ddd; padding:6px; vertical-align:top; text-align:left; }
        th { background:#f6f6f6; }
        .num { text-align:right; white-space:nowrap; }
        .nowrap { white-space:nowrap; }
      </style></head><body><div class="page"><header class="header"><div><img src="${logoUrl}" alt="GR Dados" style="max-height:52px"/></div><div class="header-info"><p class="header-title">${escapeHtml(title)}</p><div class="header-meta">Cliente: GR Dados Demo<br/>Emissão: ${generatedAt}</div></div></header>${body}<footer class="footer"><strong>GR Dados</strong> · Todos os direitos reservados<br/>AV 22 de Abril, 519 - Centro - Laguna Carapã - MS · CEP 79920-000<br/>Contato: (67) 99869-8159</footer></div></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "width=1280,height=900");
    if (!w) return;
    window.setTimeout(() => {
      try {
        w.focus();
      } catch {
        // noop
      }
      URL.revokeObjectURL(url);
    }, 600);
  }

  function reportResumoDiario() {
    const byDay = new Map<string, { loads: number; gross: number; net: number }>();
    for (const r of filteredRows) {
      const key = r.date || "";
      if (!key) continue;
      const prev = byDay.get(key) ?? { loads: 0, gross: 0, net: 0 };
      prev.loads += 1;
      prev.gross += n(r.gross_weight);
      prev.net += n(r.net_weight);
      byDay.set(key, prev);
    }
    const rowsHtml = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, v]) => `<tr><td>${d(day)}</td><td class="num">${v.loads}</td><td class="num">${toViewWeight(v.gross)}</td><td class="num">${toViewWeight(v.net)}</td></tr>`).join("");
    openReport("Relatório Resumo Diário - Romaneio", `<h1>Relatório resumo diário de romaneio</h1><table><thead><tr><th>Data</th><th class="num">Cargas</th><th class="num">Bruto</th><th class="num">Líquido</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="4">Sem dados.</td></tr>'}</tbody></table>`);
  }

  function reportResumoGeral() {
    const totalGross = filteredRows.reduce((a, r) => a + n(r.gross_weight), 0);
    const totalNet = filteredRows.reduce((a, r) => a + n(r.net_weight), 0);
    const totalDisc = filteredRows.reduce((a, r) => a + n(r.humidity) + n(r.impurity) + n(r.ardido) + n(r.others), 0);
    openReport("Relatório Resumo Geral - Romaneio", `<h1>Relatório resumo geral de romaneio</h1><div class="kpi"><div class="card"><div class="label">Registros</div><div class="value">${filteredRows.length}</div></div><div class="card"><div class="label">Peso Bruto</div><div class="value">${toViewWeight(totalGross)}</div></div><div class="card"><div class="label">Peso Líquido</div><div class="value">${toViewWeight(totalNet)}</div></div><div class="card"><div class="label">Descontos</div><div class="value">${toViewWeight(totalDisc)}</div></div></div>`);
  }

  function reportAnalitico() {
    const rowsHtml = filteredRows.map((r) => {
      const produtor = produtores.find((p) => p.id === r.produtor_id)?.name ?? "-";
      const cliente = clientes.find((c) => c.id === r.cliente_id)?.name ?? "-";
      const propriedade = propriedades.find((p) => p.id === r.propriedade_id)?.name ?? "-";
      const talhao = talhoes.find((t) => t.id === r.talhao_id)?.name ?? "-";
      const transporte = transportadoresAtivos.find((t) => t.id === ((r as Romaneio & { transportador_id?: number | null }).transportador_id ?? null))?.name ?? "-";
      return `<tr><td>${d(r.date)}</td><td>${r.code}</td><td>${produtor}</td><td>${cliente}</td><td>${propriedade}</td><td>${talhao}</td><td>${transporte}</td><td>${r.plate || "-"}</td><td class="num">${toViewWeight(n(r.gross_weight))}</td><td class="num">${toViewWeight(n(r.net_weight))}</td></tr>`;
    }).join("");
    openReport("Relatório Analítico - Romaneio", `<h1>Relatório analítico de romaneio</h1><table><thead><tr><th>Data</th><th>Romaneio</th><th>Produtor</th><th>Cliente</th><th>Propriedade</th><th>Talhão</th><th>Transportadora</th><th>Placa</th><th class="num">Bruto</th><th class="num">Líquido</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="10">Sem dados.</td></tr>'}</tbody></table>`);
  }

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-5">
          <section className="grid gap-3 xl:grid-cols-[minmax(0,390px)_1fr] xl:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Produção</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Romaneio</h1>
              <p className="mt-1 text-sm text-zinc-300">Produção de Grãos por propiedades, talhões e variedades.</p>
            </div>
            <div className="grid gap-2.5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-1.5">
                <div className="flex h-full flex-col justify-between gap-1.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Filtros</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-emerald-400/80 shadow-[0_0_0_4px_rgba(16,185,129,0.16)]" />
                      <select value={filterSafra} onChange={(e) => setFilterSafra(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-[156px] rounded-2xl border border-accent-500/40 bg-accent-500/15 pl-8 pr-7 py-1.5 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-400">
                        <option value="" style={optionStyle}>Safra</option>
                        {safras.map((s) => (<option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>))}
                      </select>
                    </div>
                    <select value={viewUnit} onChange={(e) => setViewUnit(e.target.value as "KG" | "SC")} className="min-w-[84px] rounded-2xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 outline-none focus:border-white/30">
                      <option value="KG" style={optionStyle}>KG</option>
                      <option value="SC" style={optionStyle}>SC</option>
                    </select>
                    <select value={scBagKg} onChange={(e) => setScBagKg(Number(e.target.value) as 40 | 60)} disabled={viewUnit !== "SC"} className="min-w-[96px] rounded-2xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value={60} style={optionStyle}>Sacas 60</option>
                      <option value={40} style={optionStyle}>Sacas 40</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-2.5">
                <div className="flex h-full flex-col justify-between gap-1.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Relatórios</p>
                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    <button onClick={reportResumoDiario} className="min-h-[36px] rounded-2xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-black text-zinc-100 hover:bg-white/10">Resumo diário</button>
                    <button onClick={reportResumoGeral} className="min-h-[36px] rounded-2xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-black text-zinc-100 hover:bg-white/10">Resumo geral</button>
                    <button onClick={reportAnalitico} className="min-h-[36px] rounded-2xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-black text-zinc-100 hover:bg-white/10">Analítico</button>
                    <button onClick={openCreate} className="min-h-[36px] rounded-2xl bg-accent-500 px-3.5 py-1.5 text-[12px] font-black text-zinc-950 hover:bg-accent-400">Novo</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3.5">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
              <select value={filterProdutor} onChange={(e) => setFilterProdutor(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-0 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"><option value="" style={optionStyle}>Produtor</option>{produtoresComPropriedade.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{produtorDisplayLabel(p)}</option>)}</select>
              <select value={filterPropriedade} onChange={(e) => setFilterPropriedade(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-0 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"><option value="" style={optionStyle}>Propriedade</option>{propriedades.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}</select>
              <select value={filterTalhao} onChange={(e) => setFilterTalhao(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-0 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"><option value="" style={optionStyle}>Talhão</option>{talhoes.map((t) => <option key={t.id} value={t.id} style={optionStyle}>{t.name}</option>)}</select>
              <select value={filterEmpreendimento} onChange={(e) => setFilterEmpreendimento(e.target.value)} className="min-w-0 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"><option value="" style={optionStyle}>Empreendimento</option>{empreendimentos.map((e) => <option key={e.id} value={e.id} style={optionStyle}>{e.code}</option>)}</select>
              <select value={filterCliente} onChange={(e) => setFilterCliente(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-0 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"><option value="" style={optionStyle}>Cliente</option>{clientes.map((c) => <option key={c.id} value={c.id} style={optionStyle}>{c.name}</option>)}</select>
            </div>
            <div className="mt-2.5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
              <select value={filterTransportador} onChange={(e) => setFilterTransportador(e.target.value === "" ? "" : Number(e.target.value))} className="min-w-0 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"><option value="" style={optionStyle}>Transportadora</option>{transportadoresAtivos.map((t) => <option key={t.id} value={t.id} style={optionStyle}>{t.name}</option>)}</select>
              <select value={filterPlaca} onChange={(e) => setFilterPlaca(e.target.value)} className="min-w-0 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"><option value="" style={optionStyle}>Placa</option>{placasAtivas.map((p) => <option key={p.id} value={p.plate} style={optionStyle}>{p.plate}</option>)}</select>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100 [color-scheme:dark]" />
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100 [color-scheme:dark]" />
            </div>
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
          </section>

          <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex h-[88px] items-center gap-3 rounded-3xl border border-white/15 bg-white/5 p-3">
              <CardIcon tone="slate">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 20h16" />
                  <path d="M7 16V8" />
                  <path d="M12 16V4" />
                  <path d="M17 16v-5" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Área Plantada</p>
                <p className="mt-1.5 text-[16px] font-black leading-tight text-white">
                  {card.areaPlantada.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ha
                </p>
              </div>
            </div>
            <div className="flex h-[88px] items-center gap-3 rounded-3xl border border-sky-400/30 bg-sky-500/10 p-3">
              <CardIcon tone="sky">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M8 17V9" />
                  <path d="M12 17V5" />
                  <path d="M16 17v-6" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Peso Bruto</p>
                <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{toViewWeightCard(card.totalGross)}</p>
                <div className="mt-1.5 space-y-1">
                  {(() => {
                    const max = Math.max(card.plannedKg, card.totalGross, 1);
                    const plannedPct = (card.plannedKg / max) * 100;
                    const realizedPct = (card.totalGross / max) * 100;
                    return (
                      <>
                        <div className="flex items-center gap-1 text-[9px] text-zinc-300"><span className="w-[36px]">Plan.</span><div className="h-1.5 flex-1 rounded-full bg-zinc-800"><div className="h-1.5 rounded-full bg-amber-400/90" style={{ width: `${plannedPct}%` }} /></div></div>
                        <div className="flex items-center gap-1 text-[9px] text-zinc-300"><span className="w-[36px]">Real.</span><div className="h-1.5 flex-1 rounded-full bg-zinc-800"><div className="h-1.5 rounded-full bg-emerald-400/90" style={{ width: `${realizedPct}%` }} /></div></div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="flex h-[88px] items-center gap-3 rounded-3xl border border-violet-400/30 bg-violet-500/10 p-3">
              <CardIcon tone="violet">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Média/ha</p>
                <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{toViewPerHa(card.realizedAvgPerHaKg)}</p>
                <div className="mt-1.5 space-y-1">
                  {(() => {
                    const max = Math.max(card.plannedAvgPerHaKg, card.realizedAvgPerHaKg, 1);
                    const plannedPct = (card.plannedAvgPerHaKg / max) * 100;
                    const realizedPct = (card.realizedAvgPerHaKg / max) * 100;
                    return (
                      <>
                        <div className="flex items-center gap-1 text-[9px] text-zinc-300"><span className="w-[36px]">Plan.</span><div className="h-1.5 flex-1 rounded-full bg-zinc-800"><div className="h-1.5 rounded-full bg-amber-400/90" style={{ width: `${plannedPct}%` }} /></div></div>
                        <div className="flex items-center gap-1 text-[9px] text-zinc-300"><span className="w-[36px]">Real.</span><div className="h-1.5 flex-1 rounded-full bg-zinc-800"><div className="h-1.5 rounded-full bg-emerald-400/90" style={{ width: `${realizedPct}%` }} /></div></div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="flex h-[88px] items-center gap-3 rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-3">
              <CardIcon tone="emerald">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Peso Líquido</p>
                <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{toViewWeightCard(card.totalNet)}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-white">Colheita por dia (safra)</p>
                <p className="text-xs font-semibold text-zinc-400">
                  {`${toViewValue(temporalMeta.avg).toLocaleString("pt-BR", {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3
                  })} ${viewUnit}/dia`}
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-400">Do início ao fim da safra selecionada.</p>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/30 p-3">
                <div className="flex min-h-[220px] min-w-max items-end gap-2">
                  {temporalSeries.map((p) => {
                    const h = temporalMeta.max > 0 ? Math.max((p.qty / temporalMeta.max) * 150, p.qty > 0 ? 3 : 1) : 1;
                    return (
                      <div key={p.key} className="flex w-7 flex-col items-center gap-1">
                        <span className="text-[9px] text-zinc-300" title={toViewWeight(p.qty)}>
                          {toViewValue(p.qty).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <div
                          className="w-4 rounded-t-md bg-sky-400"
                          style={{ height: `${h}px` }}
                          title={`${d(p.key)}\nResumo do dia\nLíquido: ${toViewWeight(p.qty)}\nBruto: ${toViewWeight(p.gross)}\nDescontos: ${toViewWeight(p.disc)}\nCargas: ${p.loads}\nMédia/carga: ${toViewWeight(p.loads > 0 ? p.qty / p.loads : 0)}`}
                        />
                        <span className="text-[9px] uppercase text-zinc-500">{new Date(`${p.key}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                      </div>
                    );
                  })}
                  {!temporalSeries.length ? <p className="text-xs text-zinc-500">Sem dados para o período.</p> : null}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-black text-white">Colheita por talhão</p>
              <p className="mt-1 text-xs text-zinc-400">Estimado vs realizado ({viewUnit}).</p>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/30 p-3">
                <div className="flex min-h-[220px] min-w-max items-end gap-4">
                {talhaoSeries.map((item) => {
                  const max = Math.max(...talhaoSeries.map((x) => Math.max(x.estimated, x.realized)), 1);
                  const hEst = Math.max((item.estimated / max) * 140, item.estimated > 0 ? 4 : 1);
                  const hReal = Math.max((item.realized / max) * 140, item.realized > 0 ? 4 : 1);
                  const ratio = item.estimated > 0 ? (item.realized / item.estimated) * 100 : 0;
                  return (
                    <div key={item.id} className="flex w-[96px] flex-col items-center">
                      <p className="mb-2 w-full truncate text-center text-[10px] font-black text-zinc-200">{item.label}</p>
                      <div className="flex h-[160px] items-end gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-zinc-300">{toViewValue(item.estimated).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                          <div className="w-4 rounded-t-md bg-amber-400" style={{ height: `${hEst}px` }} title={`Estimado: ${toViewWeight(item.estimated)}`} />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-zinc-300">{toViewValue(item.realized).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                          <div className="w-4 rounded-t-md bg-emerald-400" style={{ height: `${hReal}px` }} title={`Real: ${toViewWeight(item.realized)}`} />
                        </div>
                      </div>
                      <p className="mt-1 text-[9px] text-zinc-500">
                        Est/Real
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-400" title={`Média estimada vs realizada: ${ratio.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}>
                        {ratio.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </p>
                    </div>
                  );
                })}
                {!talhaoSeries.length ? <p className="text-xs text-zinc-500">Sem dados para o período.</p> : null}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-black text-white">Colheita por variedade</p>
              <p className="mt-1 text-xs text-zinc-400">Estimado vs realizado ({viewUnit}).</p>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/30 p-3">
                <div className="flex min-h-[220px] min-w-max items-end gap-4">
                {cultivarSeries.map((item) => {
                  const max = Math.max(...cultivarSeries.map((x) => Math.max(x.estimated, x.realized)), 1);
                  const hEst = Math.max((item.estimated / max) * 140, item.estimated > 0 ? 4 : 1);
                  const hReal = Math.max((item.realized / max) * 140, item.realized > 0 ? 4 : 1);
                  const ratio = item.estimated > 0 ? (item.realized / item.estimated) * 100 : 0;
                  return (
                    <div key={item.id} className="flex w-[108px] flex-col items-center">
                      <p className="mb-2 w-full truncate text-center text-[10px] font-black text-zinc-200">{item.label}</p>
                      <div className="flex h-[160px] items-end gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-zinc-300">{toViewValue(item.estimated).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                          <div className="w-4 rounded-t-md bg-amber-400" style={{ height: `${hEst}px` }} title={`Estimado: ${toViewWeight(item.estimated)}`} />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-zinc-300">{toViewValue(item.realized).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                          <div className="w-4 rounded-t-md bg-emerald-400" style={{ height: `${hReal}px` }} title={`Real: ${toViewWeight(item.realized)}`} />
                        </div>
                      </div>
                      <p className="mt-1 text-[9px] text-zinc-500">
                        Est/Real
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-400" title={`Média estimada vs realizada: ${ratio.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}>
                        {ratio.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </p>
                    </div>
                  );
                })}
                {!cultivarSeries.length ? <p className="text-xs text-zinc-500">Sem dados para o período.</p> : null}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-black text-white">Frete por placa</p>
              <p className="mt-1 text-xs text-zinc-400">Quantidade carregada por veículo.</p>
              <div className="mt-3 space-y-2">
                {plateSeries.map((item) => {
                  const max = Math.max(...plateSeries.map((x) => x.qty), 1);
                  const pct = (item.qty / max) * 100;
                  return (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-zinc-950/30 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-black text-zinc-200">{item.label}</p>
                        <p className="text-xs text-zinc-400">{item.loads} cargas</p>
                      </div>
                      <div className="mt-1 h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-cyan-400" style={{ width: `${pct}%` }} /></div>
                      <p className="mt-1 text-[11px] text-zinc-400" title={`Quantidade carregada: ${toViewWeight(item.qty)} | Cargas: ${item.loads}`}>{toViewWeight(item.qty)}</p>
                    </div>
                  );
                })}
                {!plateSeries.length ? <p className="text-xs text-zinc-500">Sem dados para o período.</p> : null}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-black text-white">Quantidade por cliente e produtor</p>
              <p className="mt-1 text-xs text-zinc-400">Top combinações por volume colhido.</p>
              <div className="mt-3 space-y-2">
                {clientProducerSeries.map((item) => {
                  const max = Math.max(...clientProducerSeries.map((x) => x.qty), 1);
                  const pct = (item.qty / max) * 100;
                  return (
                    <div key={`${item.cliente}-${item.produtor}`} className="rounded-2xl border border-white/10 bg-zinc-950/30 p-2">
                      <p className="truncate text-xs font-black text-zinc-200">{item.cliente} / {item.produtor}</p>
                      <div className="mt-1 h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-violet-400" style={{ width: `${pct}%` }} /></div>
                      <p className="mt-1 text-[11px] text-zinc-400" title={`Quantidade: ${toViewWeight(item.qty)} | Carregamentos: ${item.loads}`}>{toViewWeight(item.qty)} · {item.loads} cargas</p>
                    </div>
                  );
                })}
                {!clientProducerSeries.length ? <p className="text-xs text-zinc-500">Sem dados para o período.</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-black text-white">Lista</p><p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filteredRows.length} item(ns)`}</p></div>
            <p className="mt-2 text-[11px] text-amber-200/90">Regra fiscal: sem contra-nota de entrada, o romaneio permanece pendente e não pode seguir para venda.</p>
            <div className="mt-3 overflow-x-auto">
              <div className="hidden grid-cols-[60px_70px_68px_68px_82px_124px_112px_62px_88px_66px_86px_86px_86px_104px] gap-0.5 rounded-2xl border border-white/10 bg-zinc-950/30 px-2 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 xl:grid">
                <div>Status</div><div>Data</div><div>Romaneio</div><div>NFP</div><div>Safra</div><div>Produtor</div><div>Propriedade</div><div>Talhão</div><div>Cliente</div><div>Placa</div><div>Peso Bruto</div><div>Peso Líquido</div><div>Saldo ctr.</div><div className="text-right">Ações</div>
              </div>
              <div className="mt-3 space-y-2">
                {filteredRows.map((r) => {
                  const safra = safras.find((s) => s.id === r.safra_id)?.name ?? "-";
                  const produtor = produtores.find((p) => p.id === r.produtor_id)?.name ?? "-";
                  const cliente = clientes.find((c) => c.id === r.cliente_id)?.name ?? "-";
                  const propriedade = propriedades.find((p) => p.id === r.propriedade_id)?.name ?? "-";
                  const talhao = talhoes.find((t) => t.id === r.talhao_id)?.name ?? "-";
                  const status = normalizeRomaneioStatus(r, contraNotas);
                  const contratoSaldo = r.contrato_id ? contratoSaldoById[r.contrato_id] : null;
                  const saldoContratoLabel = contratoSaldo
                    ? `${toViewWeightCard(contratoSaldo.qtySaldoKg)} disponível`
                    : "Sem contrato";
                  const contraNotaTitle = contratoSaldo
                    ? `Registrar contra-nota • Saldo contrato: ${saldoContratoLabel}`
                    : "Registrar contra-nota";
                  return (
                    <div
                      key={r.id}
                      onClick={() => setDetailTarget(r)}
                      className="w-full cursor-pointer rounded-2xl border border-white/10 bg-zinc-950/35 px-2.5 py-2.5 text-left transition-colors hover:bg-zinc-900/45"
                    >
                      <div className="grid grid-cols-1 gap-2 xl:grid-cols-[60px_70px_68px_68px_82px_124px_112px_62px_88px_66px_86px_86px_86px_104px] xl:items-center xl:gap-0.5">
                        <div><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status === "ok" ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200" : "border-amber-400/35 bg-amber-500/10 text-amber-200"}`}>{status === "ok" ? "OK" : "Pendente"}</span></div>
                        <div className="text-xs text-zinc-100">{d(r.date)}</div>
                        <div className="text-xs text-zinc-100">{r.code}</div>
                        <div className="text-xs text-zinc-100">{r.nfp || "-"}</div>
                        <div className="truncate text-xs text-zinc-100">{safra}</div>
                        <div className="truncate text-xs text-zinc-100">{produtor}</div>
                        <div className="truncate text-xs text-zinc-100">{propriedade}</div>
                        <div className="truncate text-xs text-zinc-100">{talhao}</div>
                        <div className="truncate text-xs text-zinc-100">{cliente}</div>
                        <div className="truncate text-xs text-zinc-100">{r.plate || "-"}</div>
                        <div className="text-xs text-zinc-100">{toViewWeightCard(n(r.gross_weight))}</div>
                        <div className="text-xs text-zinc-100">{toViewWeightCard(n(r.net_weight))}</div>
                        <div className="text-xs text-zinc-100">{contratoSaldo ? toViewWeightCard(contratoSaldo.qtySaldoKg) : "-"}</div>
                        <div className="text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); openContraNota(r); }}
                              className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-2.5 text-amber-200 hover:bg-amber-500/20"
                              title={contraNotaTitle}
                              aria-label="Registrar contra-nota"
                            >
                              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h5" /><path d="M10 12h6M10 16h6" /></svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                              className="rounded-xl border border-sky-400/25 bg-sky-500/10 p-2.5 text-sky-200 hover:bg-sky-500/20"
                              title="Editar"
                              aria-label="Editar"
                            >
                              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); printOne(r); }}
                              className="rounded-xl border border-zinc-400/25 bg-zinc-500/10 p-2.5 text-zinc-200 hover:bg-zinc-500/20"
                              title="Imprimir romaneio"
                              aria-label="Imprimir"
                            >
                              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7" /><path d="M6 18h12v4H6z" /><path d="M6 14H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" /></svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteError(""); setDeleteTarget(r); }}
                              className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-2.5 text-rose-200 hover:bg-rose-500/20"
                              title="Excluir"
                              aria-label="Excluir"
                            >
                              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {detailTarget ? (
            <div className="fixed inset-0 z-[60] grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md" onClick={() => setDetailTarget(null)} aria-label="Fechar detalhes do romaneio" />
              <div className="relative w-full max-w-[980px] rounded-3xl border border-white/15 bg-zinc-900/95 p-5 shadow-2xl">
                <p className="text-sm font-black text-white">Detalhes do romaneio</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Status: {normalizeRomaneioStatus(detailTarget, contraNotas) === "ok" ? "OK" : "Pendente"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Data: {d(detailTarget.date)}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Romaneio: {detailTarget.code || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">NFP: {detailTarget.nfp || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Safra: {safras.find((s) => s.id === detailTarget.safra_id)?.name || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Produtor: {produtores.find((p) => p.id === detailTarget.produtor_id)?.name || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Propriedade: {propriedades.find((p) => p.id === detailTarget.propriedade_id)?.name || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Talhão: {talhoes.find((t) => t.id === detailTarget.talhao_id)?.name || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Cliente: {clientes.find((c) => c.id === detailTarget.cliente_id)?.name || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Contrato: {contratos.find((c) => c.id === detailTarget.contrato_id)?.code || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Empreendimento: {empreendimentos.find((e) => e.id === detailTarget.empreendimento_id)?.code || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Operação: {operacoes.find((o) => o.id === detailTarget.operacao_id)?.name || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Depósito: {detailTarget.deposito || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Transportadora: {(transportadoresAtivos.find((t) => t.id === ((detailTarget as Romaneio & { transportador_id?: number | null }).transportador_id ?? null))?.name) ?? (placasAtivas.find((p) => p.plate === (detailTarget.plate || "").toUpperCase())?.transportador?.name ?? "-")}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Placa: {detailTarget.plate || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Motorista: {detailTarget.driver || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">CPF Motorista: {detailTarget.driver_cpf || "-"}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Peso Bruto: {toViewWeight(n(detailTarget.gross_weight))}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Peso Líquido: {toViewWeight(n(detailTarget.net_weight))}</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Umidade: {n(detailTarget.humidity).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Impureza: {n(detailTarget.impurity).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Ardido: {n(detailTarget.ardido).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG</div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Outros: {n(detailTarget.others).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG</div>
                </div>
                {(() => {
                  const cn = contraNotaByRomaneioId.get(detailTarget.id);
                  if (!cn) {
                    return (
                      <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
                        Sem contra-nota vinculada. Este romaneio permanece pendente e não pode seguir para venda.
                      </div>
                    );
                  }
                  return (
                    <div className="mt-3 grid gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="text-[12px] text-emerald-100">Contra-nota: {cn.nota_fiscal}</div>
                      <div className="text-[12px] text-emerald-100">Data: {d(cn.date)}</div>
                      <div className="text-[12px] text-emerald-100">
                        Operação: {cn.operacao === "a_fixar" ? "A fixar" : cn.operacao === "venda_direta_contrato" ? "Venda direta (Contrato)" : "Remessa para depósito"}
                      </div>
                      <div className="truncate text-[12px] text-emerald-100" title={cn.chave}>Chave: {cn.chave}</div>
                    </div>
                  );
                })()}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button onClick={() => openContraNota(detailTarget)} className="rounded-2xl border border-amber-400/25 bg-amber-500/15 px-4 py-2 text-sm font-black text-amber-100">Contra-nota</button>
                  <button onClick={() => { printOne(detailTarget); }} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-zinc-200">Imprimir</button>
                  <button onClick={() => { setDetailTarget(null); openEdit(detailTarget); }} className="rounded-2xl border border-sky-400/25 bg-sky-500/15 px-4 py-2 text-sm font-black text-sky-100">Editar</button>
                  <button onClick={() => { setDeleteError(""); setDeleteTarget(detailTarget); setDetailTarget(null); }} className="rounded-2xl border border-rose-400/25 bg-rose-500/15 px-4 py-2 text-sm font-black text-rose-100">Excluir</button>
                  <button onClick={() => setDetailTarget(null)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-zinc-200">Fechar</button>
                </div>
              </div>
            </div>
          ) : null}
          {contraNotaTarget ? (
            <div className="fixed inset-0 z-[70] grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/75 backdrop-blur-md" onClick={() => setContraNotaTarget(null)} aria-label="Fechar contra-nota" />
              <div className="relative w-full max-w-[760px] rounded-3xl border border-white/15 bg-zinc-900/95 p-5 shadow-2xl">
                <p className="text-sm font-black text-white">Contra-nota de entrada</p>
                <p className="mt-1 text-xs text-zinc-400">Espelho fiscal do romaneio. Ao registrar, o status do romaneio muda para OK.</p>
                <div className="mt-3 grid gap-2 rounded-2xl border border-white/10 bg-zinc-950/35 p-3 text-[12px] text-zinc-300 sm:grid-cols-2">
                  <div>Romaneio: <span className="font-semibold text-zinc-100">{contraNotaTarget.code || "-"}</span></div>
                  <div>NFP referência: <span className="font-semibold text-zinc-100">{contraNotaTarget.nfp || "-"}</span></div>
                  <div>Safra: <span className="font-semibold text-zinc-100">{safras.find((s) => s.id === contraNotaTarget.safra_id)?.name || "-"}</span></div>
                  <div>Produtor: <span className="font-semibold text-zinc-100">{produtores.find((p) => p.id === contraNotaTarget.produtor_id)?.name || "-"}</span></div>
                  <div>Cliente: <span className="font-semibold text-zinc-100">{clientes.find((c) => c.id === contraNotaTarget.cliente_id)?.name || "-"}</span></div>
                  <div>Contrato: <span className="font-semibold text-zinc-100">{contratos.find((c) => c.id === contraNotaTarget.contrato_id)?.code || "-"}</span></div>
                  <div>Depósito: <span className="font-semibold text-zinc-100">{contraNotaTarget.deposito || "-"}</span></div>
                </div>
                {contraNotaTarget.contrato_id ? (
                  <div className="mt-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-[12px] text-emerald-100">
                    <p className="font-black">Venda Direta (Contrato)</p>
                    {contraNotaContratoLoading ? (
                      <p className="mt-1 text-emerald-200/90">Carregando saldo do contrato...</p>
                    ) : contraNotaContratoSaldo ? (
                      <div className="mt-1 grid gap-1 sm:grid-cols-2">
                        <p>
                          Saldo quantidade:{" "}
                          <span className="font-semibold">
                            {contraNotaContratoSaldo.qtySaldoKg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG
                          </span>
                        </p>
                        <p>
                          Saldo valor:{" "}
                          <span className="font-semibold">
                            {moneyBR(contraNotaContratoSaldo.valueSaldo)}
                          </span>
                        </p>
                        <p>
                          Romaneio atual:{" "}
                          <span className="font-semibold">
                            {n(contraNotaTarget.net_weight).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG
                          </span>
                        </p>
                        <p>
                          Situação:{" "}
                          <span className={`font-semibold ${contraNotaQtyExceedsContrato ? "text-rose-200" : "text-emerald-100"}`}>
                            {contraNotaQtyExceedsContrato ? "Excede saldo do contrato" : "Dentro do saldo"}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-amber-100">Não foi possível calcular o saldo do contrato agora.</p>
                    )}
                  </div>
                ) : null}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Data da contra-nota</label>
                    <input type="date" value={contraNotaForm.date} onChange={(e) => setContraNotaForm((prev) => ({ ...prev, date: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark]" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Operação de entrada</label>
                    {contraNotaTarget.contrato_id ? (
                      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                        Venda direta (Contrato)
                      </div>
                    ) : (
                      <select value={contraNotaForm.operacao} onChange={(e) => setContraNotaForm((prev) => ({ ...prev, operacao: e.target.value as ContraNotaFormState["operacao"] }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100">
                        <option value="remessa_deposito" style={optionStyle}>Remessa para depósito</option>
                        <option value="a_fixar" style={optionStyle}>A fixar</option>
                      </select>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Nota fiscal</label>
                    <input value={contraNotaForm.nota_fiscal} onChange={(e) => setContraNotaForm((prev) => ({ ...prev, nota_fiscal: e.target.value.toUpperCase() }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100" placeholder="Número da nota fiscal" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Chave da NF-e</label>
                    <input value={contraNotaForm.chave} onChange={(e) => setContraNotaForm((prev) => ({ ...prev, chave: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100" placeholder="44 dígitos" />
                  </div>
                </div>
                {contraNotaError ? <p className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{contraNotaError}</p> : null}
                {contraNotaInfo ? <p className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">{contraNotaInfo}</p> : null}
                <div className="mt-4 flex justify-end gap-2">
                  <button disabled={saving} onClick={() => setContraNotaTarget(null)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button>
                  <button disabled={saving || contraNotaQtyExceedsContrato} onClick={saveContraNota} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Salvando..." : "Salvar contra-nota"}</button>
                </div>
              </div>
            </div>
          ) : null}

          {open ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-3 sm:px-4">
              <button className="absolute inset-0 bg-zinc-950/55 backdrop-blur-md" onClick={() => { setOpen(false); setConfirmSaveOpen(false); setEditingId(null); setFormStep(0); }} aria-label="Fechar" />
              <div className="relative w-full max-w-[1180px] max-h-[92vh] overflow-auto rounded-3xl border border-white/15 bg-zinc-900/95 p-3 sm:p-4 space-y-3 text-[13px] [&_label]:text-[10px] [&_label]:tracking-[0.16em] [&_input]:py-2 [&_input]:text-[13px] [&_input]:transition-[border-color,box-shadow,background-color] [&_input]:duration-200 [&_input]:ease-out [&_input:focus]:border-accent-400/85 [&_input:focus]:shadow-[0_0_0_2px_rgba(234,179,8,0.18)] [&_input:focus]:bg-zinc-950/55 [&_input:focus]:outline-none [&_select]:py-2 [&_select]:text-[13px] [&_select]:transition-[border-color,box-shadow,background-color] [&_select]:duration-200 [&_select]:ease-out [&_select:focus]:border-accent-400/85 [&_select:focus]:shadow-[0_0_0_2px_rgba(234,179,8,0.18)] [&_select:focus]:bg-zinc-950/55 [&_select:focus]:outline-none">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black text-white">{editingId ? "Editar romaneio" : "Novo romaneio"}</p>
                  <p className="text-[11px] font-semibold text-zinc-400">Etapa {formStep + 1} de 6</p>
                </div>
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
                  {["Romaneio", "Colheita", "Depósito", "Transporte", "Carga", "Resumo"].map((label, idx) => (
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
                <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">Dados do Romaneio</p>
                  <div className="grid gap-3 lg:grid-cols-6">
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data</label><input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" /></div>
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Romaneio</label><input value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase())} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div>
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">NFP</label><input value={form.nfp} onChange={(e) => setField("nfp", e.target.value.toUpperCase())} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div>
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Operação</label><select value={form.operacao_id} onChange={(e) => setField("operacao_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{operacoesRomaneio.map((o) => <option key={o.id} value={o.id} style={optionStyle}>{o.name}</option>)}</select></div>
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Safra</label><select value={form.safra_id} onChange={(e) => setForm((prev) => ({ ...prev, safra_id: e.target.value, produto_id: "", contrato_id: "", empreendimento_id: "", talhao_id: "" }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{safras.map((s) => <option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>)}</select></div>
                  </div>
                </section>
                ) : null}

                {formStep === 1 ? (
                <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">Dados da Colheita</p>
                  <div className="grid gap-3 lg:grid-cols-6">
                    <div className="grid min-w-0 gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produtor</label><select value={form.produtor_id} onChange={(e) => setForm((prev) => ({ ...prev, produtor_id: e.target.value, propriedade_id: "", produto_id: "", contrato_id: "", empreendimento_id: "", talhao_id: "" }))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{produtoresComPropriedade.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{produtorDisplayLabel(p)}</option>)}</select></div>
                    <div className="grid min-w-0 gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Propriedade</label><select value={form.propriedade_id} onChange={(e) => setForm((prev) => ({ ...prev, propriedade_id: e.target.value, produto_id: "", empreendimento_id: "", talhao_id: "" }))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{propriedadesDoProdutor.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}</select></div>
                    <div className="grid min-w-0 gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produto</label><select value={form.produto_id} onChange={(e) => setForm((prev) => ({ ...prev, produto_id: e.target.value, empreendimento_id: "", talhao_id: "" }))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{produtosDisponiveis.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}</select></div>
                    <div className="grid min-w-0 gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Contrato</label><select value={form.contrato_id} onChange={(e) => setField("contrato_id", e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{contratosDoProdutor.map((c) => <option key={c.id} value={c.id} style={optionStyle}>{c.code}</option>)}</select></div>
                    <div className="grid min-w-0 gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Empreendimento</label><select value={form.empreendimento_id} onChange={(e) => { const id = e.target.value; const emp = empreendimentos.find((x) => x.id === id); setForm((prev) => ({ ...prev, empreendimento_id: id, produto_id: emp?.produto_id ? String(emp.produto_id) : prev.produto_id })); }} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{empreendimentosFiltrados.map((e) => <option key={e.id} value={e.id} style={optionStyle}>{e.code}</option>)}</select></div>
                    <div className="grid min-w-0 gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Talhão</label><select value={form.talhao_id} onChange={(e) => setField("talhao_id", e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{talhoesFiltrados.map((t) => <option key={t.id} value={t.id} style={optionStyle}>{t.name}</option>)}</select></div>
                  </div>
                </section>
                ) : null}

                {formStep === 2 ? (
                <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">Dados Depósito</p>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Cliente</label><select value={form.cliente_id} onChange={(e) => setField("cliente_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{clientes.map((c) => <option key={c.id} value={c.id} style={optionStyle}>{c.name}</option>)}</select></div>
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Depósito</label><select value={form.deposito} onChange={(e) => setField("deposito", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{depositosGraos.map((dep) => <option key={dep.id} value={dep.name} style={optionStyle}>{dep.name}</option>)}</select></div>
                  </div>
                </section>
                ) : null}

                {formStep === 3 ? (
                <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">Dados do Transportador</p>
                  <div className="grid gap-3 lg:grid-cols-4">
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Transportadora</label><select value={form.transportador_id} onChange={(e) => setForm((prev) => ({ ...prev, transportador_id: e.target.value, plate: "" }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{transportadoresAtivos.map((tr) => <option key={tr.id} value={tr.id} style={optionStyle}>{tr.name}</option>)}</select></div>
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Placa</label><select value={form.plate} onChange={(e) => setField("plate", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{placasDoTransportador.map((pl) => <option key={pl.id} value={pl.plate} style={optionStyle}>{pl.plate}</option>)}</select></div>
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Motorista</label><input value={form.driver} onChange={(e) => setField("driver", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div>
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">CPF</label><input value={form.driver_cpf} onChange={(e) => setField("driver_cpf", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div>
                  </div>
                </section>
                ) : null}

                {formStep === 4 ? (
                <>
                <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">Dados da Carga</p>
                  <div className="grid gap-3 lg:grid-cols-4">
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Peso</label><input value={form.weight} onChange={(e) => setField("weight", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Tara</label><input value={form.tare} onChange={(e) => setField("tare", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Peso Bruto (Peso - Tara)</label><input readOnly value={grossWeight.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} className="rounded-2xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-right text-sm font-black text-zinc-100" /></div>
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Peso Líquido</label><input readOnly value={netWeight.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 text-right text-sm font-black text-emerald-100" /></div>
                  </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">Descontos</p>
                  <div className="grid gap-3 lg:grid-cols-4">
                    <div className="grid gap-2"><div className="flex items-center justify-between"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Umidade (KG)</label><span className="text-[11px] font-semibold text-zinc-400">{discountPct.humidityPct.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span></div><input value={form.humidity} onChange={(e) => setField("humidity", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                    <div className="grid gap-2"><div className="flex items-center justify-between"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Impureza (KG)</label><span className="text-[11px] font-semibold text-zinc-400">{discountPct.impurityPct.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span></div><input value={form.impurity} onChange={(e) => setField("impurity", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                    <div className="grid gap-2"><div className="flex items-center justify-between"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Ardido (KG)</label><span className="text-[11px] font-semibold text-zinc-400">{discountPct.ardidoPct.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span></div><input value={form.ardido} onChange={(e) => setField("ardido", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                    <div className="grid gap-2"><div className="flex items-center justify-between"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Outros (KG)</label><span className="text-[11px] font-semibold text-zinc-400">{discountPct.othersPct.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span></div><input value={form.others} onChange={(e) => setField("others", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                  </div>
                </section>
                </>
                ) : null}

                {formStep === 5 ? (
                  <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">Resumo para confirmação</p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Data: {form.date || "-"}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Romaneio: {form.code || "-"}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">NFP: {form.nfp || "-"}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Produtor: {produtores.find((p) => p.id === Number(form.produtor_id))?.name || "-"}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Produto: {produtos.find((p) => p.id === Number(form.produto_id))?.name || "-"}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Cliente: {clientes.find((c) => c.id === Number(form.cliente_id))?.name || "-"}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Empreendimento: {empreendimentos.find((e) => e.id === form.empreendimento_id)?.code || "-"}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Peso Bruto: {grossWeight.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2 text-[12px] text-zinc-300">Peso Líquido: {netWeight.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG</div>
                    </div>
                  </section>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button onClick={() => { setOpen(false); setConfirmSaveOpen(false); setEditingId(null); setFormStep(0); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-black text-zinc-200">Cancelar</button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFormStep((s) => Math.max(s - 1, 0))} disabled={formStep === 0} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-black text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">Voltar</button>
                    {formStep < 5 ? (
                      <button onClick={() => setFormStep((s) => Math.min(s + 1, 5))} className="rounded-xl border border-accent-400/25 bg-accent-500/20 px-4 py-2 text-[12px] font-black text-accent-100">Próximo</button>
                    ) : (
                      <button onClick={requestSave} disabled={saving} className="rounded-xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-[12px] font-black text-emerald-100">{saving ? "Salvando..." : "Confirmar e salvar"}</button>
                    )}
                  </div>
                </div>

          {deleteTarget ? (
            <div className="fixed inset-0 z-[60] grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/70" onClick={() => setDeleteTarget(null)} aria-label="Fechar confirmação de exclusão" />
              <div className="relative w-full max-w-[560px] rounded-3xl border border-white/15 bg-zinc-900/95 p-5 shadow-2xl">
                <p className="text-sm font-black text-white">Excluir romaneio</p>
                <p className="mt-2 text-xs text-zinc-300">
                  Você está excluindo o romaneio <span className="font-semibold text-white">{deleteTarget.code || `#${deleteTarget.id}`}</span>.
                </p>
                <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-[12px] text-rose-100">
                  <p className="font-semibold">Impactos da exclusão:</p>
                  <p className="mt-1">1. O registro de pesagem será removido da lista.</p>
                  <p>2. Indicadores e gráficos da tela serão recalculados.</p>
                  <p>3. A ação é irreversível.</p>
                </div>
                {deleteError ? <p className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{deleteError}</p> : null}
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setDeleteTarget(null)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-zinc-200">Cancelar</button>
                  <button onClick={() => removeItem(deleteTarget.id)} className="rounded-2xl border border-rose-400/25 bg-rose-500/15 px-4 py-2 text-sm font-black text-rose-100">Confirmar exclusão</button>
                </div>
              </div>
            </div>
          ) : null}
          {confirmSaveOpen ? (
                  <div className="fixed inset-0 z-[60] grid place-items-center px-4">
                    <button className="absolute inset-0 bg-zinc-950/70" onClick={() => setConfirmSaveOpen(false)} aria-label="Fechar confirmação" />
                    <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-zinc-900/95 p-5 shadow-2xl">
                      <p className="text-sm font-black text-white">Confirmar salvamento</p>
                      <p className="mt-2 text-xs text-zinc-400">
                        {editingId
                          ? "Você está prestes a salvar alterações no romaneio."
                          : "Você está prestes a criar um novo romaneio."}
                      </p>
                      <div className="mt-5 flex justify-end gap-2">
                        <button onClick={() => setConfirmSaveOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-zinc-200">Cancelar</button>
                        <button onClick={save} disabled={saving} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-100">{saving ? "Salvando..." : "Confirmar"}</button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}
