"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  CentroCusto,
  ChuvaApi,
  Cultivar,
  EmpreendimentoApi,
  ProdutoItem,
  Propriedade,
  Safra,
  Talhao,
  createEmpreendimento,
  deleteEmpreendimento,
  isApiError,
  listChuvas,
  listEmpreendimentos,
  listCentrosCusto,
  listCultivares,
  listProdutosEstoque,
  listPropriedades,
  listSafras,
  listTalhoes,
  updateEmpreendimento
} from "@/lib/api";
import { formatCurrencyBRL, formatDateBR, formatDateTimeBR } from "@/lib/locale";
import {
  Empreendimento,
  EmpreendimentoItem,
  UnidadeProducao,
  calcItemProduction,
  loadRomaneios,
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
function formatKg(v: number) {
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KG`;
}
function formatSc(v: number) {
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} SC`;
}
function classifyRainMm(totalMm: number) {
  if (totalMm <= 40) return "Pouca chuva";
  if (totalMm <= 80) return "Quase Bom";
  if (totalMm <= 100) return "Bom";
  return "Excelente";
}
function rainDateShort(value: string) {
  if (!value) return "-";
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return value;
  return formatDateBR(dt).slice(0, 5);
}
function normalizeText(v: string) {
  return (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function statusMeta(status: Empreendimento["status"]) {
  if (status === "closed") return { label: "Encerrado", cls: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" };
  return { label: "Em andamento", cls: "border-amber-400/30 bg-amber-500/15 text-amber-200" };
}

function CardIcon({
  tone,
  children
}: {
  tone: "amber" | "slate" | "sky" | "emerald" | "rose";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-500/18 text-amber-300 ring-amber-400/25"
      : tone === "sky"
        ? "bg-sky-500/18 text-sky-300 ring-sky-400/25"
        : tone === "emerald"
          ? "bg-emerald-500/18 text-emerald-300 ring-emerald-400/25"
          : tone === "rose"
            ? "bg-rose-500/18 text-rose-300 ring-rose-400/25"
            : "bg-white/10 text-zinc-200 ring-white/10";

  return <div className={`grid h-10 w-10 place-items-center rounded-2xl ring-1 ${toneClass}`}>{children}</div>;
}

type FormRow = {
  id: string;
  talhao_id: string;
  produto_id: string;
  cultivar_id: string;
  unit: UnidadeProducao;
  area_ha: string;
  produtividade: string;
  plant_date: string;
};
type FormState = {
  date: string;
  code: string;
  safra_id: string;
  propriedade_id: string;
  produto_id: string;
  centro_custo_id: string;
  unit: UnidadeProducao;
  sale_price: string;
  notes: string;
  rows: FormRow[];
};

const EMPTY_ROW: FormRow = {
  id: uid("row"),
  talhao_id: "",
  produto_id: "",
  cultivar_id: "",
  unit: "SC",
  area_ha: "0",
  produtividade: "0",
  plant_date: ""
};
const EMPTY_FORM: FormState = {
  date: "",
  code: "",
  safra_id: "",
  propriedade_id: "",
  produto_id: "",
  centro_custo_id: "",
  unit: "SC",
  sale_price: "0",
  notes: "",
  rows: [{ ...EMPTY_ROW }]
};

function normalizeEmpreendimentoStatus(e: Empreendimento): Empreendimento["status"] {
  const hasItems = (e.items || []).length > 0;
  const allClosed = hasItems && e.items.every((x) => Boolean(x.close_date));
  return allClosed ? "closed" : "in_progress";
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

export default function EmpreendimentosPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [safras, setSafras] = useState<Safra[]>([]);
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [cultivares, setCultivares] = useState<Cultivar[]>([]);
  const [centros, setCentros] = useState<CentroCusto[]>([]);
  const [chuvas, setChuvas] = useState<ChuvaApi[]>([]);

  const [rows, setRows] = useState<Empreendimento[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Empreendimento | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [formStep, setFormStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [codeTouched, setCodeTouched] = useState(false);

  const [closeOpen, setCloseOpen] = useState(false);
  const [closeEmpId, setCloseEmpId] = useState("");
  const [closeDate, setCloseDate] = useState("");

  const [safraFilter, setSafraFilter] = useState<number | "">("");
  const [rainEmpFilter, setRainEmpFilter] = useState<string>("");
  const [viewUnit, setViewUnit] = useState<"KG" | "SC">("KG");
  const [sackWeight, setSackWeight] = useState<60 | 40>(60);

  useEffect(() => {
    void refreshData();
  }, []);

  async function refreshData() {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [a, b, c, d, e, f, emps, rainRows] = await Promise.all([
        listSafras(token),
        listPropriedades(token),
        listTalhoes(token),
        listProdutosEstoque(token),
        listCultivares(token),
        listCentrosCusto(token),
        listEmpreendimentos(token),
        listChuvas(token)
      ]);
      setSafras(a);
      setPropriedades(b);
      setTalhoes(c);
      setProdutos(d);
      setCultivares(e);
      setCentros(f);
      setChuvas(rainRows);
      setRows(
        emps.map((x) => {
          const mapped = fromApiEmpreendimento(x);
          return { ...mapped, status: normalizeEmpreendimentoStatus(mapped) };
        })
      );
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

  const romaneios = useMemo(() => loadRomaneios(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((it) => {
      if (safraFilter !== "" && it.safra_id !== Number(safraFilter)) return false;
      return true;
    });
  }, [rows, safraFilter]);

  useEffect(() => {
    if (!filtered.length) {
      if (rainEmpFilter) setRainEmpFilter("");
      return;
    }
    const exists = filtered.some((e) => String(e.id) === rainEmpFilter);
    if (!exists) setRainEmpFilter(String(filtered[0].id));
  }, [filtered, rainEmpFilter]);

  const analytics = useMemo(() => {
    let estimadoKg = 0;
    let estimadoSc = 0;
    let realizadoKg = 0;
    let faturamento = 0;
    let areaTotalHa = 0;
    for (const it of filtered) {
      estimadoKg += it.items.reduce((acc, r) => acc + n(r.production_kg), 0);
      estimadoSc += it.items.reduce((acc, r) => acc + n(r.production_sc), 0);
      areaTotalHa += it.items.reduce((acc, r) => acc + n(r.area_ha), 0);
      faturamento += n(it.billing_value);
      realizadoKg += romaneios.filter((r) => r.empreendimento_id === it.id).reduce((acc, r) => acc + n(r.net_weight), 0);
    }
    const mediaPrevistaHaKg = areaTotalHa > 0 ? estimadoKg / areaTotalHa : 0;
    const saldoKg = estimadoKg - realizadoKg;
    return { faturamento, qty: filtered.length, estimadoKg, estimadoSc, realizadoKg, saldoKg, mediaPrevistaHaKg };
  }, [filtered, romaneios]);

  const chuvaPanel = useMemo(() => {
    const includedIds = new Set(filtered.map((e) => String(e.id)));
    const base = chuvas
      .filter((x) => {
        const eid = String(x.empreendimento_id ?? x.empreendimento?.id ?? "");
        if (!includedIds.has(eid)) return false;
        return true;
      })
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    let acc = 0;
    const series = base.map((x) => {
      acc += n(x.volume_mm);
      return { date: x.date || "", value: acc };
    });

    return {
      totalMm: acc,
      status: classifyRainMm(acc),
      points: series,
      max: Math.max(1, ...series.map((p) => p.value))
    };
  }, [chuvas, filtered]);

  const chuvaPanelEmp = useMemo(() => {
    const selectedId = rainEmpFilter || String(filtered[0]?.id ?? "");
    if (!selectedId) {
      return {
        totalMm: 0,
        status: "Pouca chuva",
        points: [] as Array<{ date: string; value: number; daily: number }>,
        max: 1
      };
    }
    const emp = filtered.find((e) => String(e.id) === selectedId);
    if (!emp) {
      return {
        totalMm: 0,
        status: "Pouca chuva",
        points: [] as Array<{ date: string; value: number; daily: number }>,
        max: 1
      };
    }

    const base = chuvas
      .filter((x) => {
        const eid = String(x.empreendimento_id ?? x.empreendimento?.id ?? "");
        if (eid !== selectedId) return false;
        return true;
      })
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    const dailyByDate = new Map<string, number>();
    for (const row of base) {
      const key = row.date || "";
      if (!key) continue;
      dailyByDate.set(key, (dailyByDate.get(key) || 0) + n(row.volume_mm));
    }

    let acc = 0;
    const points = Array.from(dailyByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, daily]) => {
        acc += daily;
        return { date, daily, value: acc };
      });
    return {
      totalMm: acc,
      status: classifyRainMm(acc),
      points,
      max: Math.max(1, ...points.map((p) => p.value))
    };
  }, [chuvas, filtered, rainEmpFilter]);

  const viewUnitLabel = viewUnit === "KG" ? "KG" : `SC${sackWeight}`;
  function toViewUnit(kgValue: number) {
    if (viewUnit === "KG") return kgValue;
    return kgValue / sackWeight;
  }
  function formatViewUnit(kgValue: number) {
    return `${toViewUnit(kgValue).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${viewUnitLabel}`;
  }
  function formatViewUnitValue(kgValue: number) {
    return toViewUnit(kgValue).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  }
  function formatViewUnitPerHa(kgValuePerHa: number) {
    return `${toViewUnit(kgValuePerHa).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${viewUnitLabel}/ha`;
  }

  const chartByEmpreendimento = useMemo(
    () =>
      filtered.slice(0, 8).map((it) => {
        const qty = it.items.reduce((acc, r) => acc + n(r.production_kg), 0);
        const delivered = romaneios
          .filter((r) => r.empreendimento_id === it.id)
          .reduce((acc, r) => acc + n(r.net_weight), 0);
        return { label: it.code, qty, delivered, empreendimentoId: String(it.id) };
      }),
    [filtered, romaneios]
  );

  const chartByPropriedade = useMemo(() => {
    const map = new Map<string, { label: string; qty: number; delivered: number }>();
    for (const it of filtered) {
      const propName = propriedades.find((p) => p.id === Number(it.propriedade_id ?? 0))?.name ?? "-";
      const current = map.get(propName) ?? { label: propName, qty: 0, delivered: 0 };
      current.qty += it.items.reduce((acc, r) => acc + n(r.production_kg), 0);
      current.delivered += romaneios
        .filter((r) => r.empreendimento_id === it.id)
        .reduce((acc, r) => acc + n(r.net_weight), 0);
      map.set(propName, current);
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [filtered, romaneios, propriedades]);

  const chartBySafra = useMemo(() => {
    const map = new Map<string, { label: string; qty: number; delivered: number }>();
    for (const it of filtered) {
      const safraName = safras.find((s) => s.id === Number(it.safra_id ?? 0))?.name ?? "-";
      const current = map.get(safraName) ?? { label: safraName, qty: 0, delivered: 0 };
      current.qty += it.items.reduce((acc, r) => acc + n(r.production_kg), 0);
      current.delivered += romaneios
        .filter((r) => r.empreendimento_id === it.id)
        .reduce((acc, r) => acc + n(r.net_weight), 0);
      map.set(safraName, current);
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [filtered, romaneios, safras]);

  const groupedArea = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of form.rows) {
      const tId = Number(row.talhao_id || 0);
      if (!tId) continue;
      map.set(tId, (map.get(tId) ?? 0) + n(row.area_ha));
    }
    return map;
  }, [form.rows]);

  const formTotals = useMemo(() => {
    let kg = 0;
    let sc = 0;
    for (const row of form.rows) {
      const prod = calcItemProduction(row.unit, n(row.area_ha), n(row.produtividade));
      kg += prod.production_kg;
      sc += prod.production_sc;
    }
    const unitBase = form.unit === "KG" ? kg : sc;
    return { kg, sc, billing: unitBase * n(form.sale_price) };
  }, [form.rows, form.sale_price, form.unit]);

  const selectedSafra = useMemo(() => safras.find((s) => s.id === Number(form.safra_id || 0)) ?? null, [safras, form.safra_id]);
  const selectedPropriedade = useMemo(() => propriedades.find((p) => p.id === Number(form.propriedade_id || 0)) ?? null, [propriedades, form.propriedade_id]);
  const autoCode = useMemo(() => {
    const safraName = (selectedSafra?.name ?? "").trim().toUpperCase();
    const propriedadeName = (selectedPropriedade?.name ?? "").trim().toUpperCase();
    if (safraName && propriedadeName) return `${safraName} - ${propriedadeName}`;
    return safraName || propriedadeName;
  }, [selectedSafra?.name, selectedPropriedade?.name]);

  useEffect(() => {
    if (editingId || codeTouched) return;
    setForm((prev) => {
      if (prev.code === autoCode) return prev;
      return { ...prev, code: autoCode };
    });
  }, [autoCode, codeTouched, editingId]);

  function inferSafraIdFromCode(code: string): number | null {
    const raw = (code || "").trim();
    if (!raw || !safras.length) return null;
    const normalized = normalizeText(raw);
    let best: { id: number; len: number } | null = null;
    for (const s of safras) {
      const name = (s.name || "").trim();
      if (!name) continue;
      const needle = normalizeText(name);
      if (!needle) continue;
      if (normalized.includes(needle) && (!best || needle.length > best.len)) {
        best = { id: s.id, len: needle.length };
      }
    }
    return best?.id ?? null;
  }

  function inferPropriedadeIdFromCode(code: string): number | null {
    const raw = (code || "").trim();
    if (!raw || !propriedades.length) return null;
    const normalized = normalizeText(raw);
    let best: { id: number; len: number } | null = null;
    for (const p of propriedades) {
      const name = (p.name || "").trim();
      if (!name) continue;
      const needle = normalizeText(name);
      if (!needle) continue;
      if (normalized.includes(needle) && (!best || needle.length > best.len)) {
        best = { id: p.id, len: needle.length };
      }
    }
    return best?.id ?? null;
  }

  useEffect(() => {
    if (!rows.length || (!safras.length && !propriedades.length)) return;
    let changed = false;
    const next = rows.map((it) => {
      const safeSafraId = it.safra_id ? Number(it.safra_id) : null;
      const safePropId = it.propriedade_id ? Number(it.propriedade_id) : null;
      const inferredSafraId = safeSafraId || inferSafraIdFromCode(it.code);
      const inferredPropId = safePropId || inferPropriedadeIdFromCode(it.code);
      if (safeSafraId === inferredSafraId && safePropId === inferredPropId) return it;
      changed = true;
      return { ...it, safra_id: inferredSafraId, propriedade_id: inferredPropId };
    });
    if (!changed) return;
    setRows(next);
  }, [rows, safras, propriedades]);

  function filteredCultivaresByProduto(produtoId: string) {
    const LINK_KEY = "grdados.cultivares.links.v1";
    const baseId = Number(produtoId || form.produto_id || 0);
    if (!baseId) return cultivares;
    const produto = produtos.find((p) => p.id === baseId);
    const culturaId = produto?.cultura?.id ?? produto?.cultura_id ?? null;
    if (culturaId) {
      const linked = cultivares.filter((c) => c.cultura?.id === culturaId || c.cultura_id === culturaId);
      if (linked.length) return linked;

      try {
        const raw = window.localStorage.getItem(LINK_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, { cultura_id?: number | null }>;
          const linkedByMap = cultivares.filter((c) => {
            const mapped = parsed[String(c.id)]?.cultura_id ?? null;
            return mapped === culturaId;
          });
          if (linkedByMap.length) return linkedByMap;
        }
      } catch {
        // Ignora fallback inválido e segue para heurística por nome.
      }
    }
    const produtoName = produto?.name ?? "";
    const needle = normalizeText(produtoName).split(" ")[0];
    if (!needle) return cultivares;
    const related = cultivares.filter((c) => normalizeText(c.name).includes(needle) || normalizeText(c.description || "").includes(needle));
    return related.length ? related : cultivares;
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (key === "code") setCodeTouched(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function setRowField(index: number, key: keyof FormRow, value: string) {
    setForm((prev) => ({ ...prev, rows: prev.rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)) }));
  }

  function openCreate() {
    setEditingId(null);
    setCodeTouched(false);
    setForm({ ...EMPTY_FORM, rows: [{ ...EMPTY_ROW, id: uid("row") }] });
    setFormStep(0);
    setOpen(true);
  }

  function openEdit(item: Empreendimento) {
    setEditingId(item.id);
    setCodeTouched(true);
    setForm({
      date: item.date,
      code: item.code,
      safra_id: item.safra_id ? String(item.safra_id) : "",
      propriedade_id: item.propriedade_id ? String(item.propriedade_id) : "",
      produto_id: item.produto_id ? String(item.produto_id) : "",
      centro_custo_id: item.centro_custo_id ? String(item.centro_custo_id) : "",
      unit: item.unit,
      sale_price: String(item.sale_price),
      notes: item.notes,
      rows: item.items.map((r) => ({
        id: r.id,
        talhao_id: r.talhao_id ? String(r.talhao_id) : "",
        produto_id: r.produto_id ? String(r.produto_id) : "",
        cultivar_id: r.cultivar_id ? String(r.cultivar_id) : "",
        unit: r.unit,
        area_ha: String(r.area_ha),
        produtividade: String(r.produtividade),
        plant_date: r.plant_date
      }))
    });
    setFormStep(0);
    setOpen(true);
  }

  async function removeItem(id: string) {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteEmpreendimento(token, id);
      setDeleteTarget(null);
      await refreshData();
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      const message = err instanceof Error ? err.message : "Falha ao excluir empreendimento.";
      setDeleteError(message);
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  function validateAreaByTalhao(nextRows: FormRow[]) {
    const bucket = new Map<number, number>();
    for (const row of nextRows) {
      const tId = Number(row.talhao_id || 0);
      if (!tId) continue;
      bucket.set(tId, (bucket.get(tId) ?? 0) + n(row.area_ha));
    }
    for (const [talhaoId, used] of bucket.entries()) {
      const talhao = talhoes.find((t) => t.id === talhaoId);
      const total = n(talhao?.area_ha);
      if (used - total > 0.0001) {
        return `Área plantada do talhão ${talhao?.name ?? talhaoId} excedeu o limite (${used.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha de ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha).`;
      }
    }
    return "";
  }

  function requestSave() {
    const areaError = validateAreaByTalhao(form.rows);
    if (areaError) return setError(areaError);
    if (!form.code.trim()) return setError("Informe o código do empreendimento.");
    setConfirmSaveOpen(true);
  }

  async function save() {
    setConfirmSaveOpen(false);
    setSaving(true);
    setError("");
    try {
      const token = getAccessToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const now = new Date().toISOString();
      const previous = editingId ? rows.find((x) => x.id === editingId) : null;
      const prevMap = new Map((previous?.items ?? []).map((it) => [it.id, it]));
      const items: EmpreendimentoItem[] = form.rows.map((r) => {
        const prod = calcItemProduction(r.unit, n(r.area_ha), n(r.produtividade));
        return {
          id: r.id,
          talhao_id: r.talhao_id ? Number(r.talhao_id) : null,
          produto_id: r.produto_id ? Number(r.produto_id) : null,
          cultivar_id: r.cultivar_id ? Number(r.cultivar_id) : null,
          unit: r.unit,
          area_ha: n(r.area_ha),
          produtividade: n(r.produtividade),
          plant_date: r.plant_date,
          close_date: prevMap.get(r.id)?.close_date ?? "",
          production_sc: prod.production_sc,
          production_kg: prod.production_kg
        };
      });
      const entity: Empreendimento = {
        id: editingId ?? uid("emp"),
        created_at: previous?.created_at ?? now,
        updated_at: now,
        date: form.date,
        code: form.code.trim().toUpperCase(),
        safra_id: form.safra_id ? Number(form.safra_id) : null,
        propriedade_id: form.propriedade_id ? Number(form.propriedade_id) : null,
        produto_id: form.produto_id ? Number(form.produto_id) : null,
        centro_custo_id: form.centro_custo_id ? Number(form.centro_custo_id) : null,
        unit: form.unit,
        sale_price: n(form.sale_price),
        billing_value: formTotals.billing,
        status: "in_progress",
        notes: form.notes,
        items
      };
      entity.status = normalizeEmpreendimentoStatus(entity);
      const payload = {
        id: entity.id,
        date: entity.date || null,
        code: entity.code,
        safra_id: entity.safra_id,
        propriedade_id: entity.propriedade_id,
        produto_id: entity.produto_id,
        centro_custo_id: entity.centro_custo_id,
        unit: entity.unit,
        sale_price: entity.sale_price,
        billing_value: entity.billing_value,
        status: entity.status,
        notes: entity.notes,
        items: entity.items.map((it) => ({
          id: it.id,
          talhao_id: it.talhao_id,
          produto_id: it.produto_id,
          cultivar_id: it.cultivar_id,
          unit: it.unit,
          area_ha: it.area_ha,
          produtividade: it.produtividade,
          plant_date: it.plant_date || null,
          close_date: it.close_date || null,
          production_sc: it.production_sc,
          production_kg: it.production_kg
        }))
      };
      if (editingId) {
        await updateEmpreendimento(token, editingId, payload);
      } else {
        await createEmpreendimento(token, payload);
      }
      await refreshData();
      setFormStep(0);
      setOpen(false);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao salvar empreendimento.");
    } finally {
      setSaving(false);
    }
  }

  async function runCloseEvent() {
    if (!closeEmpId || !closeDate) {
      setError("Selecione o empreendimento e a data de encerramento.");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const target = rows.find((e) => e.id === closeEmpId);
    if (!target) {
      setError("Empreendimento não encontrado.");
      return;
    }
    try {
      await updateEmpreendimento(token, closeEmpId, {
        status: "closed",
        items: target.items.map((it) => ({
          id: it.id,
          talhao_id: it.talhao_id,
          produto_id: it.produto_id,
          cultivar_id: it.cultivar_id,
          unit: it.unit,
          area_ha: it.area_ha,
          produtividade: it.produtividade,
          plant_date: it.plant_date || null,
          close_date: closeDate,
          production_sc: it.production_sc,
          production_kg: it.production_kg
        }))
      });
      await refreshData();
      setCloseOpen(false);
      setCloseEmpId("");
      setCloseDate("");
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao encerrar colheita.");
    }
  }

  function escapeHtml(value: unknown) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function openPrintHtml(title: string, body: string, orientation: "portrait" | "landscape" = "landscape") {
    const generatedAt = formatDateTimeBR(new Date());
    const logoUrl = `${window.location.origin}/logo_horizontal.png`;
    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
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
        table { width:100%; border-collapse: collapse; font-size: 12px; margin-top:10px; }
        th, td { border:1px solid #ddd; padding:6px; vertical-align:top; text-align:left; }
        th { background:#f6f6f6; }
        .num { text-align:right; white-space:nowrap; }
        .nowrap { white-space:nowrap; }
        .group { margin-top: 14px; page-break-inside: avoid; }
        .group h3 { margin: 0 0 6px; font-size: 14px; }
      </style></head><body><div class="page"><header class="header"><div><img src="${logoUrl}" alt="GR Dados" style="max-height:52px"/></div><div class="header-info"><p class="header-title">${escapeHtml(title)}</p><div class="header-meta">Cliente: GR Dados Demo<br/>Emissão: ${generatedAt}</div></div></header>${body}<footer class="footer"><strong>GR Dados</strong> · Todos os direitos reservados<br/>AV 22 de Abril, 519 - Centro - Laguna Carapã - MS · CEP 79920-000<br/>Contato: (67) 99869-8159</footer></div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "width=1280,height=900");
    if (!w) return;
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {}
      URL.revokeObjectURL(url);
    }, 350);
  }

  function reportResumo() {
    const safraNome = safras.find((s) => s.id === (safraFilter === "" ? -1 : Number(safraFilter)))?.name ?? "Todas";
    const rowsHtml = filtered
      .map((it) => {
        const status = normalizeEmpreendimentoStatus(it) === "closed" ? "Encerrado" : "Em andamento";
        const estSc = it.items.reduce((acc, r) => acc + n(r.production_sc), 0);
        const estKg = it.items.reduce((acc, r) => acc + n(r.production_kg), 0);
        const areaHa = it.items.reduce((acc, r) => acc + n(r.area_ha), 0);
        const mediaHa = areaHa > 0 ? estKg / areaHa : 0;
        const realKg = romaneios.filter((r) => r.empreendimento_id === it.id).reduce((acc, r) => acc + n(r.net_weight), 0);
        const safra = safras.find((s) => s.id === it.safra_id)?.name ?? "-";
        return `<tr><td>${escapeHtml(status)}</td><td class="nowrap">${escapeHtml(d(it.date))}</td><td class="nowrap">${escapeHtml(it.code)}</td><td>${escapeHtml(safra)}</td><td class="num">${estSc.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${estKg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${realKg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${mediaHa.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${escapeHtml(formatCurrencyBRL(n(it.sale_price)))}</td><td class="num">${escapeHtml(formatCurrencyBRL(it.billing_value))}</td></tr>`;
      })
      .join("");
    openPrintHtml(
      "Resumo de Empreendimentos",
      `<h1>Relatório resumo de empreendimentos</h1><p class="muted">Safra: ${escapeHtml(safraNome)} · ${filtered.length} registro(s)</p><table><thead><tr><th>Status</th><th>Data</th><th>Código</th><th>Safra</th><th class="num">Estimado SC</th><th class="num">Estimado KG</th><th class="num">Realizado KG</th><th class="num">Média/ha (KG)</th><th class="num">Preço produto</th><th class="num">Faturamento</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="10">Sem dados para os filtros selecionados.</td></tr>'}</tbody></table>`
    );
  }

  function reportAnalitico() {
    const groups = new Map<string, Empreendimento[]>();
    for (const it of filtered) {
      const safra = safras.find((s) => s.id === it.safra_id)?.name ?? "SEM SAFRA";
      const arr = groups.get(safra) ?? [];
      arr.push(it);
      groups.set(safra, arr);
    }
    const htmlGroups = [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
      .map(([safra, arr]) => {
        const rowsHtml = arr
          .map((it) => {
            const status = normalizeEmpreendimentoStatus(it) === "closed" ? "Encerrado" : "Em andamento";
            const estSc = it.items.reduce((acc, r) => acc + n(r.production_sc), 0);
            const estKg = it.items.reduce((acc, r) => acc + n(r.production_kg), 0);
            const areaHa = it.items.reduce((acc, r) => acc + n(r.area_ha), 0);
            const mediaHa = areaHa > 0 ? estKg / areaHa : 0;
            const realKg = romaneios.filter((r) => r.empreendimento_id === it.id).reduce((acc, r) => acc + n(r.net_weight), 0);
            const rowsItems = it.items
              .map((row) => {
                const talhao = talhoes.find((t) => t.id === row.talhao_id)?.name ?? "-";
                const produto = produtos.find((p) => p.id === row.produto_id)?.name ?? "-";
                const cultivar = cultivares.find((c) => c.id === row.cultivar_id)?.name ?? "-";
                return `${escapeHtml(talhao)} / ${escapeHtml(produto)} / ${escapeHtml(cultivar)}`;
              })
              .join("<br/>");
            return `<tr><td>${escapeHtml(status)}</td><td class="nowrap">${escapeHtml(d(it.date))}</td><td class="nowrap">${escapeHtml(it.code)}</td><td>${rowsItems || "-"}</td><td class="num">${estSc.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${estKg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${realKg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${mediaHa.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td><td class="num">${escapeHtml(formatCurrencyBRL(n(it.sale_price)))}</td><td class="num">${escapeHtml(formatCurrencyBRL(it.billing_value))}</td></tr>`;
          })
          .join("");
        return `<section class="group"><h3>${escapeHtml(safra)}</h3><table><thead><tr><th>Status</th><th>Data</th><th>Código</th><th>Talhão / Produto / Cultivar</th><th class="num">Estimado SC</th><th class="num">Estimado KG</th><th class="num">Realizado KG</th><th class="num">Média/ha (KG)</th><th class="num">Preço produto</th><th class="num">Faturamento</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="10">Sem dados.</td></tr>'}</tbody></table></section>`;
      })
      .join("");
    openPrintHtml("Analítico de Empreendimentos", `<h1>Relatório analítico de empreendimentos</h1>${htmlGroups || '<p class="muted">Sem dados para os filtros selecionados.</p>'}`);
  }

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-5">
          <section className="grid gap-3 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,2.05fr)] xl:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Produção</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Empreendimentos</h1>
              <p className="mt-1 text-sm text-zinc-300">Planejamento de produção e extimativa de produtividade.</p>
            </div>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Filtros</p>
                <div className="grid gap-1.5 md:grid-cols-[minmax(0,1fr)_92px_106px]">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-emerald-400/80 shadow-[0_0_0_4px_rgba(16,185,129,0.16)]" />
                    <select value={safraFilter} onChange={(e) => setSafraFilter(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-accent-500/40 bg-accent-500/15 pl-8 pr-3 py-2.5 text-xs font-semibold text-zinc-100 outline-none focus:border-accent-400">
                      <option value="" style={optionStyle}>Safra</option>
                      {safras.map((s) => (<option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>))}
                    </select>
                  </div>
                  <select value={viewUnit} onChange={(e) => setViewUnit(e.target.value as "KG" | "SC")} className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-zinc-100 outline-none focus:border-white/30">
                    <option value="KG" style={optionStyle}>KG</option>
                    <option value="SC" style={optionStyle}>SC</option>
                  </select>
                  <select value={String(sackWeight)} onChange={(e) => setSackWeight(Number(e.target.value) as 60 | 40)} disabled={viewUnit !== "SC"} className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-zinc-100 outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="60" style={optionStyle}>Sacas 60</option>
                    <option value="40" style={optionStyle}>Sacas 40</option>
                  </select>
                </div>
              </section>
              <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3.5">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Relatórios</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={reportResumo} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10">Resumo</button>
                  <button onClick={reportAnalitico} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10">Analítico</button>
                  <button onClick={() => setCloseOpen(true)} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10">Encerrar Colheita</button>
                  <button onClick={openCreate} className="rounded-2xl bg-accent-500 px-4 py-2.5 text-xs font-black text-zinc-950 hover:bg-accent-400">Novo</button>
                </div>
              </section>
            </div>
          </section>

          {error ? <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}

          <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="flex h-[88px] items-center gap-3 rounded-3xl border border-accent-400/30 bg-accent-500/10 p-3">
              <CardIcon tone="amber">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Faturamento R$</p>
                <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{formatCurrencyBRL(analytics.faturamento)}</p>
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
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Estimado ({viewUnitLabel})</p>
                <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{formatViewUnit(analytics.estimadoKg)}</p>
              </div>
            </div>
            <div className="flex h-[88px] items-center gap-3 rounded-3xl border border-sky-400/30 bg-sky-500/10 p-3">
              <CardIcon tone="sky">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h8v8H3z" />
                  <path d="M13 5h8v8h-8z" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Realizado ({viewUnitLabel})</p>
                <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{formatViewUnit(analytics.realizadoKg)}</p>
              </div>
            </div>
            <div className="flex h-[88px] items-center gap-3 rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-3">
              <CardIcon tone="emerald">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Saldo ({viewUnitLabel})</p>
                <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{formatViewUnit(analytics.saldoKg)}</p>
              </div>
            </div>
            <div className="flex h-[88px] items-center gap-3 rounded-3xl border border-rose-400/30 bg-rose-500/10 p-3">
              <CardIcon tone="rose">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 20h16" />
                  <path d="M7 16V8" />
                  <path d="M12 16V4" />
                  <path d="M17 16v-5" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Média/ha prevista</p>
                <p className="mt-1.5 text-[16px] font-black leading-tight text-white">{formatViewUnitPerHa(analytics.mediaPrevistaHaKg)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-sky-400/25 bg-sky-500/10 p-3.5">
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-sky-300/25 bg-black/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Chuva geral (filtro atual)</p>
                <p className="mt-1 text-[18px] font-black text-white">
                  {chuvaPanel.totalMm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mm
                </p>
                <p className="text-xs font-semibold text-sky-100/90">{chuvaPanel.status}</p>
              </div>
              <div className="rounded-2xl border border-sky-300/25 bg-black/20 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Empreendimento</p>
                  <p className="text-xs font-semibold text-sky-100/90">
                    {chuvaPanelEmp.totalMm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mm · {chuvaPanelEmp.status}
                  </p>
                </div>
                <select
                  value={rainEmpFilter}
                  onChange={(e) => setRainEmpFilter(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none focus:border-sky-300"
                >
                  {filtered.map((emp) => (
                    <option key={emp.id} value={String(emp.id)} style={optionStyle}>
                      {emp.code || emp.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-sky-300/20 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-black text-white">Linha acumulada por empreendimento selecionado</p>
                <p className="text-xs font-semibold text-zinc-300">{chuvaPanelEmp.points.length} ponto(s)</p>
              </div>
              {chuvaPanelEmp.points.length ? (
                <svg viewBox="0 0 100 36" className="h-32 w-full">
                  <polyline
                    fill="none"
                    stroke="rgba(56,189,248,0.95)"
                    strokeWidth="1.2"
                    points={chuvaPanelEmp.points.map((p, i) => {
                      const x = chuvaPanelEmp.points.length > 1 ? (i / (chuvaPanelEmp.points.length - 1)) * 100 : 50;
                      const y = 34 - (p.value / chuvaPanelEmp.max) * 30;
                      return `${x},${y}`;
                    }).join(" ")}
                  />
                  {chuvaPanelEmp.points.map((p, i) => {
                    const x = chuvaPanelEmp.points.length > 1 ? (i / (chuvaPanelEmp.points.length - 1)) * 100 : 50;
                    const y = 34 - (p.value / chuvaPanelEmp.max) * 30;
                    return (
                      <g key={`${p.date}-${i}`}>
                        <circle cx={x} cy={y} r="0.85" fill="rgba(125,211,252,1)" />
                        <text x={x} y={Math.max(2, y - 2)} textAnchor="middle" fontSize="2.1" fill="rgba(186,230,253,0.95)">
                          {rainDateShort(p.date)} · {p.daily.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}mm
                        </text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <p className="text-sm text-zinc-400">Sem leituras de chuva no período de plantio/colheita.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-3.5">
            <p className="text-[13px] font-black text-white">Quantidade estimada x realizada</p>
            <div className="mt-3 grid gap-3 xl:grid-cols-3">
              {[
                { title: "Por empreendimento", items: chartByEmpreendimento },
                { title: "Por propriedade", items: chartByPropriedade },
                { title: "Por safra", items: chartBySafra }
              ].map((group) => {
                const max = Math.max(1, ...group.items.map((item) => Math.max(item.qty, item.delivered)));
                return (
                  <div key={group.title} className="rounded-2xl border border-white/10 bg-zinc-950/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[12px] font-black text-zinc-200">{group.title}</p>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          Estimada
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          Realizada
                        </span>
                      </div>
                    </div>
                    {group.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-xs text-zinc-500">
                        Sem dados para exibir.
                      </div>
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fit,minmax(58px,1fr))] items-end gap-2">
                        {group.items.map((item) => {
                          const qtyHeight = Math.max(8, (item.qty / max) * 140);
                          const doneHeight = Math.max(8, (item.delivered / max) * 140);
                          const empId = (item as { empreendimentoId?: string }).empreendimentoId;
                          const isSelectedEmp = group.title === "Por empreendimento" && Boolean(empId) && rainEmpFilter === empId;
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                if (group.title === "Por empreendimento" && empId) {
                                  setRainEmpFilter(empId);
                                }
                              }}
                              onDoubleClick={() => {
                                if (group.title === "Por empreendimento" && empId) {
                                  window.location.href = `/producao/chuvas?empreendimento_id=${encodeURIComponent(empId)}&auto_open=1`;
                                }
                              }}
                              className={`min-w-0 rounded-xl p-1 text-left transition ${group.title === "Por empreendimento" ? "cursor-pointer hover:bg-white/5" : "cursor-default"} ${isSelectedEmp ? "ring-1 ring-sky-300/45 bg-sky-500/10" : ""}`}
                              disabled={group.title !== "Por empreendimento"}
                              title={group.title === "Por empreendimento" ? "Clique para filtrar chuva deste empreendimento. Duplo clique para abrir o cadastro de chuva." : undefined}
                            >
                              <div className="flex h-[164px] items-end justify-center gap-1">
                                <div className="flex flex-col items-center">
                                  <span className="mb-1 text-[9px] font-black text-amber-300">
                                    {formatViewUnitValue(item.qty)}
                                  </span>
                                  <div
                                    className="w-5 rounded-t-md bg-amber-400/90"
                                    style={{ height: `${qtyHeight}px` }}
                                    title={`Estimada: ${formatViewUnit(item.qty)}`}
                                  />
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="mb-1 text-[9px] font-black text-emerald-300">
                                    {formatViewUnitValue(item.delivered)}
                                  </span>
                                  <div
                                    className="w-5 rounded-t-md bg-emerald-400/90"
                                    style={{ height: `${doneHeight}px` }}
                                    title={`Realizada: ${formatViewUnit(item.delivered)}`}
                                  />
                                </div>
                              </div>
                              <p className="mt-2 truncate text-center text-[10px] font-semibold text-zinc-300">
                                {item.label}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-black text-white">Lista</p><p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p></div>
            <div className="mt-3 overflow-x-auto">
              <div className="hidden min-w-[1190px] grid-cols-[230px_120px_120px_125px_150px_100px_190px_74px] gap-2 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[12px] font-black uppercase tracking-[0.22em] text-zinc-400 xl:grid">
                <div>Código</div><div>Safra</div><div>Estimado ({viewUnitLabel})</div><div>Realizado ({viewUnitLabel})</div><div>Média/ha ({viewUnitLabel})</div><div>Preço</div><div>Faturamento</div><div className="text-right">Ações</div>
              </div>
              <div className="mt-3 space-y-2 xl:min-w-[1190px]">
                {filtered.map((it) => {
                  const estKg = it.items.reduce((acc, r) => acc + n(r.production_kg), 0);
                  const areaHa = it.items.reduce((acc, r) => acc + n(r.area_ha), 0);
                  const mediaHa = areaHa > 0 ? estKg / areaHa : 0;
                  const precoProduto = n(it.sale_price);
                  const realKg = romaneios.filter((r) => r.empreendimento_id === it.id).reduce((acc, r) => acc + n(r.net_weight), 0);
                  const safraName = safras.find((s) => s.id === Number(it.safra_id ?? 0))?.name ?? ((it.code || "").split(" - ")[0] || "-");
                  return (
                    <div key={it.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3">
                      <div className="grid grid-cols-1 gap-2 xl:grid-cols-[230px_120px_120px_125px_150px_100px_190px_74px] xl:items-center xl:gap-2">
                        <div className="whitespace-nowrap truncate text-[12px] text-zinc-100" title={it.code}>
                          {it.code}
                        </div>
                        <div className="truncate text-[12px] text-zinc-100">{safraName}</div>
                        <div className="text-[12px] text-zinc-100">{formatViewUnit(estKg)}</div>
                        <div className="text-[12px] text-zinc-100">{formatViewUnit(realKg)}</div>
                        <div className="text-[12px] text-zinc-100">{formatViewUnitPerHa(mediaHa)}</div>
                        <div className="text-[12px] text-zinc-100">{formatCurrencyBRL(precoProduto)}</div>
                        <div className="text-[12px] text-zinc-100">{formatCurrencyBRL(it.billing_value)}</div>
                        <div className="justify-self-end">
                          <div className="ml-auto flex w-fit items-center justify-end gap-1 whitespace-nowrap">
                            <button onClick={() => openEdit(it)} className="grid h-[30px] w-[30px] place-items-center rounded-xl border border-sky-400/25 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20" title="Editar" aria-label="Editar">
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </button>
                          <button onClick={() => { setDeleteError(""); setDeleteTarget(it); }} className="grid h-[30px] w-[30px] place-items-center rounded-xl border border-rose-400/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20" title="Excluir" aria-label="Excluir">
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
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
                  );
                })}
              </div>
            </div>
          </section>

          {open ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-3 sm:px-4">
              <button className="absolute inset-0 bg-zinc-950/55 backdrop-blur-sm" onClick={() => { setOpen(false); setFormStep(0); }} aria-label="Fechar" />
              <div className="relative w-full max-w-[1320px] max-h-[92vh] overflow-auto rounded-3xl border border-white/15 bg-zinc-900/95 p-3 sm:p-4 space-y-3 text-[13px] [&_input]:py-2 [&_input]:text-[13px] [&_select]:py-2 [&_select]:text-[13px] [&_textarea]:text-[13px]">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black text-white">{editingId ? "Editar empreendimento" : "Novo empreendimento"}</p>
                  <p className="text-[11px] font-semibold text-zinc-400">Etapa {formStep + 1} de 3</p>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {["Dados gerais", "Itens e talhões", "Resumo"].map((label, idx) => (
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
                  <>
                    <div className="grid gap-3 lg:grid-cols-4">
                      <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data</label><input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100 [color-scheme:dark]" /></div>
                      <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Empreendimento</label><input value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase())} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100" /></div>
                      <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Safra</label><select value={form.safra_id} onChange={(e) => setField("safra_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{safras.map((s) => <option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>)}</select></div>
                      <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Propriedade</label><select value={form.propriedade_id} onChange={(e) => setField("propriedade_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{propriedades.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}</select></div>
                      <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produto</label><select value={form.produto_id} onChange={(e) => setField("produto_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{produtos.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}</select></div>
                      <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Centro de Custo</label><select value={form.centro_custo_id} onChange={(e) => setField("centro_custo_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{centros.map((c) => <option key={c.id} value={c.id} style={optionStyle}>{c.name}</option>)}</select></div>
                      <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">UN</label><select value={form.unit} onChange={(e) => setField("unit", e.target.value as UnidadeProducao)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100"><option value="KG" style={optionStyle}>KG</option><option value="SC" style={optionStyle}>SC</option></select></div>
                      <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Preço Venda</label><input value={form.sale_price} onChange={(e) => setField("sale_price", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-right text-zinc-100" /></div>
                    </div>
                    <div className="text-[11px] text-zinc-400">Status: <span className="font-black text-zinc-200">Em andamento</span> (o encerramento é feito por evento de safra).</div>
                    {selectedPropriedade ? <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3 text-xs font-semibold text-sky-100">Área da propriedade selecionada: {n(selectedPropriedade.area_ha).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</div> : null}
                    <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Observação</label><textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-zinc-100" /></div>
                  </>
                ) : null}

                {formStep === 1 ? (
                  <>
                    <div className="hidden gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 xl:grid xl:grid-cols-[1fr_1fr_1fr_100px_110px_130px_130px_210px_72px] xl:items-center"><div>Talhão</div><div>Produto</div><div>Cultivar</div><div>UN</div><div>Área (ha)</div><div>Produtividade</div><div>Data Plantio</div><div>Produção</div><div className="text-center">Remover</div></div>
                    <div className="space-y-2">
                      {form.rows.map((r, idx) => {
                        const talhao = talhoes.find((t) => t.id === Number(r.talhao_id || 0));
                        const talhaoArea = n(talhao?.area_ha);
                        const used = Number(r.talhao_id || 0) ? groupedArea.get(Number(r.talhao_id)) ?? 0 : 0;
                        const available = talhaoArea - used;
                        const production = calcItemProduction(r.unit, n(r.area_ha), n(r.produtividade));
                        const cultivars = filteredCultivaresByProduto(r.produto_id);
                        return <div key={r.id} className="space-y-1"><div className="grid gap-2 xl:grid-cols-[1fr_1fr_1fr_100px_110px_130px_130px_210px_72px] xl:items-center"><select aria-label="Talhão" value={r.talhao_id} onChange={(e) => setRowField(idx, "talhao_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100"><option value="" style={optionStyle}>Talhão</option>{talhoes.filter((t) => !form.propriedade_id || t.propriedade?.id === Number(form.propriedade_id)).map((t) => <option key={t.id} value={t.id} style={optionStyle}>{t.name}</option>)}</select><select aria-label="Produto" value={r.produto_id} onChange={(e) => setRowField(idx, "produto_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100"><option value="" style={optionStyle}>Produto</option>{produtos.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}</select><select aria-label="Cultivar" value={r.cultivar_id} onChange={(e) => setRowField(idx, "cultivar_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100"><option value="" style={optionStyle}>Cultivar</option>{cultivars.map((c) => <option key={c.id} value={c.id} style={optionStyle}>{c.name}</option>)}</select><select aria-label="Unidade" value={r.unit} onChange={(e) => setRowField(idx, "unit", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100"><option value="KG" style={optionStyle}>KG</option><option value="SC" style={optionStyle}>SC</option></select><input aria-label="Área" value={r.area_ha} onChange={(e) => setRowField(idx, "area_ha", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-right text-zinc-100" /><input aria-label="Produtividade" value={r.produtividade} onChange={(e) => setRowField(idx, "produtividade", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-right text-zinc-100" /><input aria-label="Data Plantio" type="date" value={r.plant_date} onChange={(e) => setRowField(idx, "plant_date", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-zinc-100 [color-scheme:dark]" /><input aria-label="Produção" readOnly value={`${production.production_sc.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} SC / ${production.production_kg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KG`} className="rounded-2xl border border-white/10 bg-zinc-900/60 px-3 text-right text-zinc-100" /><button type="button" onClick={() => setForm((prev) => ({ ...prev, rows: prev.rows.filter((x) => x.id !== r.id) }))} className="mx-auto w-[72px] rounded-2xl border border-rose-400/25 bg-rose-500/15 px-3 py-2 text-sm font-black text-rose-100">x</button></div>{r.talhao_id ? <p className={`text-[11px] ${available < -0.0001 ? "text-rose-300" : "text-zinc-400"}`}>Área disponível no talhão: {(Math.max(available, 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</p> : null}</div>;
                      })}
                    </div>
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => setForm((prev) => ({ ...prev, rows: [...prev.rows, { ...EMPTY_ROW, id: uid("row") }] }))} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-100">Adicionar variedade no talhão</button>
                      <div className="text-right"><p className="text-xs text-zinc-400">Produção estimada: {formatSc(formTotals.sc)} | {formatKg(formTotals.kg)}</p><p className="text-sm font-black text-white">Faturamento R$: {formatCurrencyBRL(formTotals.billing)}</p></div>
                    </div>
                  </>
                ) : null}

                {formStep === 2 ? (
                  <section className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">Resumo para confirmação</p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 text-[12px] text-zinc-300">
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2">Data: {form.date || "-"}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2">Empreendimento: {form.code || "-"}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2">Safra: {selectedSafra?.name || "-"}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2">Propriedade: {selectedPropriedade?.name || "-"}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2">Itens: {form.rows.length}</div>
                      <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-2.5 py-2">Faturamento: {formatCurrencyBRL(formTotals.billing)}</div>
                    </div>
                  </section>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button onClick={() => { setOpen(false); setFormStep(0); }} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-black text-zinc-200">Cancelar</button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFormStep((s) => Math.max(s - 1, 0))} disabled={formStep === 0} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed">Voltar</button>
                    {formStep < 2 ? (
                      <button onClick={() => setFormStep((s) => Math.min(s + 1, 2))} className="rounded-2xl border border-accent-400/25 bg-accent-500/20 px-4 py-2 text-sm font-black text-accent-100">Próximo</button>
                    ) : (
                      <button onClick={requestSave} disabled={saving} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2 text-sm font-black text-emerald-100">{saving ? "Salvando..." : "Confirmar e salvar"}</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {deleteTarget ? (
            <div className="fixed inset-0 z-[60] grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/55 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
              <div className="relative w-full max-w-[560px] rounded-3xl border border-white/15 bg-zinc-900/95 p-5 space-y-3">
                <p className="text-lg font-black text-white">Excluir empreendimento</p>
                <p className="text-sm text-zinc-300">
                  Você está excluindo o empreendimento <span className="font-semibold text-white">{deleteTarget.code}</span>.
                </p>
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-[12px] text-rose-100">
                  <p className="font-semibold">Impactos da exclusão:</p>
                  <p className="mt-1">1. Remove o empreendimento e os talhões/variedades vinculados.</p>
                  <p>2. Atualiza os totais e indicadores do painel automaticamente.</p>
                  <p>3. Se houver vínculo bloqueante no backend, a exclusão será cancelada com aviso.</p>
                </div>
                {deleteError ? <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{deleteError}</p> : null}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200 disabled:opacity-60">Cancelar</button>
                  <button onClick={() => void removeItem(deleteTarget.id)} disabled={deleting} className="rounded-2xl border border-rose-400/25 bg-rose-500/15 px-5 py-2.5 text-sm font-black text-rose-100 disabled:opacity-60">{deleting ? "Excluindo..." : "Confirmar exclusão"}</button>
                </div>
              </div>
            </div>
          ) : null}
          {confirmSaveOpen ? (
            <div className="fixed inset-0 z-[60] grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/55 backdrop-blur-sm" onClick={() => setConfirmSaveOpen(false)} />
              <div className="relative w-full max-w-[560px] rounded-3xl border border-white/15 bg-zinc-900/95 p-5 space-y-3">
                <p className="text-lg font-black text-white">Confirmar salvamento</p>
                <p className="text-sm text-zinc-300">
                  {editingId
                    ? "Você está prestes a salvar alterações no empreendimento."
                    : "Você está prestes a criar um novo empreendimento."}
                </p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setConfirmSaveOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Cancelar</button>
                  <button onClick={save} disabled={saving} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Salvando..." : "Confirmar"}</button>
                </div>
              </div>
            </div>
          ) : null}

          {closeOpen ? <div className="fixed inset-0 z-[60] grid place-items-center px-4"><button className="absolute inset-0 bg-zinc-950/55 backdrop-blur-sm" onClick={() => setCloseOpen(false)} /><div className="relative w-full max-w-[560px] rounded-3xl border border-white/15 bg-zinc-900/95 p-5 space-y-3"><p className="text-lg font-black text-white">Encerrar Safra / Empreendimento</p><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Empreendimento</label><select value={closeEmpId} onChange={(e) => setCloseEmpId(e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{rows.map((e) => <option key={e.id} value={e.id} style={optionStyle}>{e.code}</option>)}</select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data de encerramento</label><input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" /></div><div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-100">Ao confirmar, todos os talhões do empreendimento receberão a data de encerramento e o status passará para Encerrado.</div><div className="flex justify-end gap-2"><button onClick={() => setCloseOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Cancelar</button><button onClick={runCloseEvent} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100">Encerrar</button></div></div></div> : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}

