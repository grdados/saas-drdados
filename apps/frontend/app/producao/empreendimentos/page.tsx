"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  CentroCusto,
  Cultivar,
  ProdutoItem,
  Propriedade,
  Safra,
  Talhao,
  isApiError,
  listCentrosCusto,
  listCultivares,
  listProdutosEstoque,
  listPropriedades,
  listSafras,
  listTalhoes
} from "@/lib/api";
import { formatCurrencyBRL, formatDateBR } from "@/lib/locale";
import {
  Empreendimento,
  EmpreendimentoItem,
  UnidadeProducao,
  calcItemProduction,
  loadEmpreendimentos,
  loadRomaneios,
  saveEmpreendimentos,
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
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG`;
}
function formatSc(v: number) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} SC`;
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

export default function EmpreendimentosPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [safras, setSafras] = useState<Safra[]>([]);
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [cultivares, setCultivares] = useState<Cultivar[]>([]);
  const [centros, setCentros] = useState<CentroCusto[]>([]);

  const [rows, setRows] = useState<Empreendimento[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [codeTouched, setCodeTouched] = useState(false);

  const [closeOpen, setCloseOpen] = useState(false);
  const [closeEmpId, setCloseEmpId] = useState("");
  const [closeDate, setCloseDate] = useState("");

  const [q, setQ] = useState("");
  const [safraFilter, setSafraFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState<"all" | Empreendimento["status"]>("all");

  useEffect(() => {
    const loaded = loadEmpreendimentos().map((x) => ({ ...x, status: normalizeEmpreendimentoStatus(x) }));
    setRows(loaded);
    saveEmpreendimentos(loaded);
    void loadRefs();
  }, []);

  async function loadRefs() {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [a, b, c, d, e, f] = await Promise.all([
        listSafras(token),
        listPropriedades(token),
        listTalhoes(token),
        listProdutosEstoque(token),
        listCultivares(token),
        listCentrosCusto(token)
      ]);
      setSafras(a);
      setPropriedades(b);
      setTalhoes(c);
      setProdutos(d);
      setCultivares(e);
      setCentros(f);
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
    const needle = q.trim().toLowerCase();
    return rows.filter((it) => {
      if (safraFilter !== "" && it.safra_id !== Number(safraFilter)) return false;
      if (statusFilter !== "all" && normalizeEmpreendimentoStatus(it) !== statusFilter) return false;
      if (!needle) return true;
      return it.code.toLowerCase().includes(needle);
    });
  }, [rows, q, safraFilter, statusFilter]);

  const analytics = useMemo(() => {
    let estimadoKg = 0;
    let estimadoSc = 0;
    let realizadoKg = 0;
    let faturamento = 0;
    for (const it of filtered) {
      estimadoKg += it.items.reduce((acc, r) => acc + n(r.production_kg), 0);
      estimadoSc += it.items.reduce((acc, r) => acc + n(r.production_sc), 0);
      faturamento += n(it.billing_value);
      realizadoKg += romaneios.filter((r) => r.empreendimento_id === it.id).reduce((acc, r) => acc + n(r.net_weight), 0);
    }
    return { faturamento, qty: filtered.length, estimadoKg, estimadoSc, realizadoKg, gapKg: estimadoKg - realizadoKg };
  }, [filtered, romaneios]);

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
    setOpen(true);
  }

  function removeItem(id: string) {
    if (!window.confirm("Excluir empreendimento?")) return;
    const next = rows.filter((x) => x.id !== id);
    setRows(next);
    saveEmpreendimentos(next);
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

  function save() {
    const areaError = validateAreaByTalhao(form.rows);
    if (areaError) return setError(areaError);
    if (!form.code.trim()) return setError("Informe o código do empreendimento.");
    if (!window.confirm(editingId ? "Confirmar alteração do empreendimento?" : "Confirmar novo empreendimento?")) return;

    setSaving(true);
    setError("");
    try {
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

      const next = editingId ? rows.map((x) => (x.id === editingId ? entity : x)) : [entity, ...rows];
      setRows(next);
      saveEmpreendimentos(next);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function runCloseEvent() {
    if (!closeEmpId || !closeDate) {
      setError("Selecione o empreendimento e a data de encerramento.");
      return;
    }
    if (!window.confirm("Confirmar encerramento da safra/empreendimento?")) return;

    const next = rows.map((e) => {
      if (e.id !== closeEmpId) return e;
      const items = e.items.map((it) => ({ ...it, close_date: closeDate }));
      const closed = { ...e, items, status: "closed" as const, updated_at: new Date().toISOString() };
      return closed;
    });
    setRows(next);
    saveEmpreendimentos(next);
    setCloseOpen(false);
    setCloseEmpId("");
    setCloseDate("");
  }

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Produção</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Empreendimentos</h1>
            <p className="mt-1 text-sm text-zinc-300">Planejamento de plantio, estimativa de produção e comparação estimado vs realizado.</p>
          </div>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button onClick={() => setCloseOpen(true)} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-zinc-100 hover:bg-white/10">Evento de encerramento</button>
              <button onClick={openCreate} className="rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400">Novo empreendimento</button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código..." className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 xl:col-span-2" />
              <select value={safraFilter} onChange={(e) => setSafraFilter(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Safra</option>{safras.map((s) => <option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>)}</select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | Empreendimento["status"])} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="all" style={optionStyle}>Status</option><option value="in_progress" style={optionStyle}>Em andamento</option><option value="closed" style={optionStyle}>Encerrado</option></select>
            </div>
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
          </section>

          <section className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-4"><p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Faturamento R$</p><p className="mt-2 text-2xl font-black text-white">{formatCurrencyBRL(analytics.faturamento)}</p></div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-4"><p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Empreendimentos</p><p className="mt-2 text-2xl font-black text-white">{analytics.qty}</p></div>
            <div className="rounded-3xl border border-sky-400/30 bg-sky-500/10 p-4"><p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Estimado (SC)</p><p className="mt-2 text-2xl font-black text-white">{formatSc(analytics.estimadoSc)}</p></div>
            <div className="rounded-3xl border border-sky-400/30 bg-sky-500/10 p-4"><p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Estimado (KG)</p><p className="mt-2 text-2xl font-black text-white">{formatKg(analytics.estimadoKg)}</p></div>
            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-4"><p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Realizado (KG)</p><p className="mt-2 text-2xl font-black text-white">{formatKg(analytics.realizadoKg)}</p></div>
            <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-4"><p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Gap (KG)</p><p className="mt-2 text-2xl font-black text-white">{formatKg(analytics.gapKg)}</p></div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-black text-white">Lista</p><p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p></div>
            <div className="mt-3 overflow-x-auto">
              <div className="hidden min-w-[1260px] grid-cols-[120px_110px_160px_160px_130px_130px_130px_130px_170px] gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 xl:grid">
                <div>Status</div><div>Data</div><div>Código</div><div>Safra</div><div>Estimado SC</div><div>Estimado KG</div><div>Realizado KG</div><div>Faturamento</div><div className="text-right">Ações</div>
              </div>
              <div className="mt-3 space-y-2 xl:min-w-[1260px]">
                {filtered.map((it) => {
                  const status = normalizeEmpreendimentoStatus(it);
                  const meta = statusMeta(status);
                  const estSc = it.items.reduce((acc, r) => acc + n(r.production_sc), 0);
                  const estKg = it.items.reduce((acc, r) => acc + n(r.production_kg), 0);
                  const realKg = romaneios.filter((r) => r.empreendimento_id === it.id).reduce((acc, r) => acc + n(r.net_weight), 0);
                  const safraName = safras.find((s) => s.id === it.safra_id)?.name ?? "-";
                  return <div key={it.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3"><div className="grid grid-cols-1 gap-2 xl:grid-cols-[120px_110px_160px_160px_130px_130px_130px_130px_170px] xl:items-center xl:gap-3"><div><span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-black ${meta.cls}`}>{meta.label}</span></div><div className="text-sm text-zinc-100">{d(it.date)}</div><div className="text-sm font-black text-zinc-100">{it.code}</div><div className="text-sm text-zinc-100">{safraName}</div><div className="text-sm text-zinc-100">{formatSc(estSc)}</div><div className="text-sm text-zinc-100">{formatKg(estKg)}</div><div className="text-sm text-zinc-100">{formatKg(realKg)}</div><div className="text-sm font-black text-zinc-100">{formatCurrencyBRL(it.billing_value)}</div><div className="text-right"><div className="flex w-full flex-nowrap justify-end gap-1.5 whitespace-nowrap"><button onClick={() => openEdit(it)} className="rounded-xl border border-sky-400/25 bg-sky-500/10 p-2 text-sky-200 hover:bg-sky-500/20" title="Editar" aria-label="Editar"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg></button><button onClick={() => removeItem(it.id)} className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-2 text-rose-200 hover:bg-rose-500/20" title="Excluir" aria-label="Excluir"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg></button></div></div></div></div>;
                })}
              </div>
            </div>
          </section>

          {open ? <div className="fixed inset-0 z-50 grid place-items-center px-4"><button className="absolute inset-0 bg-zinc-950/60" onClick={() => setOpen(false)} aria-label="Fechar" /><div className="relative w-full max-w-[1320px] max-h-[92vh] overflow-auto rounded-3xl border border-white/15 bg-zinc-900/95 p-5 space-y-4"><p className="text-sm font-black text-white">{editingId ? "Editar empreendimento" : "Novo empreendimento"}</p><div className="grid gap-3 lg:grid-cols-4"><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data</label><input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" /></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Empreendimento</label><input value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase())} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Safra</label><select value={form.safra_id} onChange={(e) => setField("safra_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{safras.map((s) => <option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>)}</select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Propriedade</label><select value={form.propriedade_id} onChange={(e) => setField("propriedade_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{propriedades.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}</select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produto</label><select value={form.produto_id} onChange={(e) => setField("produto_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{produtos.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}</select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Centro de Custo</label><select value={form.centro_custo_id} onChange={(e) => setField("centro_custo_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{centros.map((c) => <option key={c.id} value={c.id} style={optionStyle}>{c.name}</option>)}</select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">UN</label><select value={form.unit} onChange={(e) => setField("unit", e.target.value as UnidadeProducao)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="KG" style={optionStyle}>KG</option><option value="SC" style={optionStyle}>SC</option></select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Preço Venda</label><input value={form.sale_price} onChange={(e) => setField("sale_price", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div></div><div className="text-[11px] text-zinc-400">Status: <span className="font-black text-zinc-200">Em andamento</span> (o encerramento é feito por evento de safra).</div>{selectedPropriedade ? <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3 text-xs font-semibold text-sky-100">Área da propriedade selecionada: {n(selectedPropriedade.area_ha).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</div> : null}<div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Observação</label><textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div><div className="hidden gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 xl:grid xl:grid-cols-[1fr_1fr_1fr_100px_110px_130px_130px_180px_auto]"><div>Talhão</div><div>Produto</div><div>Cultivar</div><div>UN</div><div>Área (ha)</div><div>Produtividade</div><div>Data Plantio</div><div>Produção</div><div>Remover</div></div><div className="space-y-2">{form.rows.map((r, idx) => {const talhao = talhoes.find((t) => t.id === Number(r.talhao_id || 0));const talhaoArea = n(talhao?.area_ha);const used = Number(r.talhao_id || 0) ? groupedArea.get(Number(r.talhao_id)) ?? 0 : 0;const available = talhaoArea - used;const production = calcItemProduction(r.unit, n(r.area_ha), n(r.produtividade));const cultivars = filteredCultivaresByProduto(r.produto_id);return <div key={r.id} className="space-y-1"><div className="grid gap-2 xl:grid-cols-[1fr_1fr_1fr_100px_110px_130px_130px_180px_auto]"><select aria-label="Talhão" value={r.talhao_id} onChange={(e) => setRowField(idx, "talhao_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Talhão</option>{talhoes.filter((t) => !form.propriedade_id || t.propriedade?.id === Number(form.propriedade_id)).map((t) => <option key={t.id} value={t.id} style={optionStyle}>{t.name}</option>)}</select><select aria-label="Produto" value={r.produto_id} onChange={(e) => setRowField(idx, "produto_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Produto</option>{produtos.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}</select><select aria-label="Cultivar" value={r.cultivar_id} onChange={(e) => setRowField(idx, "cultivar_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Cultivar</option>{cultivars.map((c) => <option key={c.id} value={c.id} style={optionStyle}>{c.name}</option>)}</select><select aria-label="Unidade" value={r.unit} onChange={(e) => setRowField(idx, "unit", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="KG" style={optionStyle}>KG</option><option value="SC" style={optionStyle}>SC</option></select><input aria-label="Área" value={r.area_ha} onChange={(e) => setRowField(idx, "area_ha", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /><input aria-label="Produtividade" value={r.produtividade} onChange={(e) => setRowField(idx, "produtividade", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /><input aria-label="Data Plantio" type="date" value={r.plant_date} onChange={(e) => setRowField(idx, "plant_date", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" /><input aria-label="Produção" readOnly value={`${production.production_sc.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} SC / ${production.production_kg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG`} className="rounded-2xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-right text-sm text-zinc-100" /><button type="button" onClick={() => setForm((prev) => ({ ...prev, rows: prev.rows.filter((x) => x.id !== r.id) }))} className="rounded-2xl border border-rose-400/25 bg-rose-500/15 px-3 py-2.5 text-sm font-black text-rose-100">x</button></div>{r.talhao_id ? <p className={`text-[11px] ${available < -0.0001 ? "text-rose-300" : "text-zinc-400"}`}>Área disponível no talhão: {(Math.max(available, 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</p> : null}</div>;})}</div><div className="flex items-center justify-between"><button type="button" onClick={() => setForm((prev) => ({ ...prev, rows: [...prev.rows, { ...EMPTY_ROW, id: uid("row") }] }))} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-100">Adicionar variedade no talhão</button><div className="text-right"><p className="text-xs text-zinc-400">Produção estimada: {formatSc(formTotals.sc)} | {formatKg(formTotals.kg)}</p><p className="text-sm font-black text-white">Faturamento R$: {formatCurrencyBRL(formTotals.billing)}</p></div></div><div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Cancelar</button><button onClick={save} disabled={saving} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100">{saving ? "Salvando..." : "Salvar"}</button></div></div></div> : null}

          {closeOpen ? <div className="fixed inset-0 z-[60] grid place-items-center px-4"><button className="absolute inset-0 bg-zinc-950/60" onClick={() => setCloseOpen(false)} /><div className="relative w-full max-w-[560px] rounded-3xl border border-white/15 bg-zinc-900/95 p-5 space-y-3"><p className="text-lg font-black text-white">Encerrar Safra / Empreendimento</p><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Empreendimento</label><select value={closeEmpId} onChange={(e) => setCloseEmpId(e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{rows.map((e) => <option key={e.id} value={e.id} style={optionStyle}>{e.code}</option>)}</select></div><div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data de encerramento</label><input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" /></div><div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-100">Ao confirmar, todos os talhões do empreendimento receberão a data de encerramento e o status passará para Encerrado.</div><div className="flex justify-end gap-2"><button onClick={() => setCloseOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Cancelar</button><button onClick={runCloseEvent} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100">Encerrar</button></div></div></div> : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}
