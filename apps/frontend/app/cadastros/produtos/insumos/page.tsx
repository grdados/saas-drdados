"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { formatDateTimeBR } from "@/lib/locale";
import { toUpperText } from "@/lib/text";
import {
  Categoria,
  CentroCusto,
  createInsumo,
  Cultura,
  Fabricante,
  Insumo,
  isApiError,
  listCategorias,
  listCentrosCusto,
  listCulturas,
  listFabricantes,
  listInsumos,
  updateInsumo
} from "@/lib/api";

function IconPencil({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function IconPlus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-[1100px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/85 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <p className="text-sm font-black text-white">{title}</p>
            <p className="mt-1 text-xs text-zinc-400">Preencha os dados e clique em salvar.</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
            aria-label="Fechar modal"
            title="Fechar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function prettyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return (msg || "").trim() || "Falha inesperada.";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function openPrintHtml(title: string, htmlBody: string) {
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
        @page { size: A4 landscape; margin: 12mm 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #111; background: #fff; }
        .page { padding: 14px 10px 10px; }
        .header { display: grid; grid-template-columns: 260px 1fr; gap: 12px; align-items: center; border: 1px solid #e4e4e7; border-radius: 10px; padding: 8px 10px; margin-bottom: 12px; }
        .logo-wrap img { max-height: 52px; width: auto; object-fit: contain; }
        .header-info { text-align: right; }
        .header-title { margin: 0; font-size: 18px; font-weight: 800; }
        .header-meta { margin-top: 4px; color: #52525b; font-size: 11px; line-height: 1.4; }
        h1 { margin: 0 0 8px; font-size: 22px; }
        .muted { color: #555; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #e2e2e2; padding: 6px 8px; text-align: left; }
        th { background: #f7f7f7; }
      </style>
    </head>
    <body>
      <div class="page">
        <header class="header">
          <div class="logo-wrap"><img src="${logoUrl}" alt="GR Dados" /></div>
          <div class="header-info">
            <p class="header-title">${escapeHtml(title)}</p>
            <div class="header-meta">Cliente: GR Dados Demo<br/>Emissao: ${generatedAt}</div>
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

export default function InsumosPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Insumo[]>([]);
  const [error, setError] = useState("");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoriaFilter, setCategoriaFilter] = useState<number | "all">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => items.find((i) => i.id === editingId) ?? null, [items, editingId]);

  const [formName, setFormName] = useState("");
  const [formShort, setFormShort] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formCategoriaId, setFormCategoriaId] = useState<number | "">("");
  const [formCulturaId, setFormCulturaId] = useState<number | "">("");
  const [formFabricanteId, setFormFabricanteId] = useState<number | "">("");
  const [formCentroCustoId, setFormCentroCustoId] = useState<number | "">("");
  const [formSeedTreatment, setFormSeedTreatment] = useState(false);
  const [formTox, setFormTox] = useState("");
  const [formActiveIng, setFormActiveIng] = useState("");
  const [formDose, setFormDose] = useState("");
  const [formDensity, setFormDensity] = useState("");
  const [formMapa, setFormMapa] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...items]
      .filter((i) => {
        if (statusFilter === "active" && !i.is_active) return false;
        if (statusFilter === "inactive" && i.is_active) return false;
        if (categoriaFilter !== "all" && (i.categoria?.id ?? -1) !== categoriaFilter) return false;
        if (!q) return true;
        return (
          i.name.toLowerCase().includes(q) ||
          (i.short_description || "").toLowerCase().includes(q) ||
          (i.unit || "").toLowerCase().includes(q) ||
          (i.categoria?.name ?? "").toLowerCase().includes(q) ||
          (i.fabricante?.name ?? "").toLowerCase().includes(q) ||
          (i.centro_custo?.name ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [items, query, statusFilter, categoriaFilter]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const [ins, cat, cul, fab, cc] = await Promise.all([
        listInsumos(token),
        listCategorias(token),
        listCulturas(token),
        listFabricantes(token),
        listCentrosCusto(token)
      ]);
      setItems(ins);
      setCategorias(cat);
      setCulturas(cul);
      setFabricantes(fab);
      setCentrosCusto(cc);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(prettyError(err));
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
    setFormStep(1);
    setFormName("");
    setFormShort("");
    setFormUnit("");
    setFormCategoriaId("");
    setFormCulturaId("");
    setFormFabricanteId("");
    setFormCentroCustoId("");
    setFormSeedTreatment(false);
    setFormTox("");
    setFormActiveIng("");
    setFormDose("");
    setFormDensity("");
    setFormMapa("");
    setFormActive(true);
    setSaveMessage("");
    setModalOpen(true);
  }

  function openEdit(id: number) {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setEditingId(id);
    setFormStep(1);
    setFormName(it.name ?? "");
    setFormShort(it.short_description ?? "");
    setFormUnit(it.unit ?? "");
    setFormCategoriaId(it.categoria?.id ?? "");
    setFormCulturaId(it.cultura?.id ?? "");
    setFormFabricanteId(it.fabricante?.id ?? "");
    setFormCentroCustoId(it.centro_custo?.id ?? "");
    setFormSeedTreatment(!!it.has_seed_treatment);
    setFormTox(it.tox_class ?? "");
    setFormActiveIng(it.active_ingredient ?? "");
    setFormDose(it.dose ?? "");
    setFormDensity(it.density ?? "");
    setFormMapa(it.mapa_registry ?? "");
    setFormActive(it.is_active);
    setSaveMessage("");
    setModalOpen(true);
  }

  function nextStep() {
    if (formStep === 1 && formName.trim().length < 2) {
      setSaveMessage("Informe a descricao completa para avancar.");
      return;
    }
    setSaveMessage("");
    setFormStep((s) => (s === 1 ? 2 : s === 2 ? 3 : 4));
  }

  function prevStep() {
    setSaveMessage("");
    setFormStep((s) => (s === 4 ? 3 : s === 3 ? 2 : 1));
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        name: formName.trim(),
        short_description: formShort.trim(),
        unit: formUnit.trim(),
        categoria_id: formCategoriaId === "" ? null : Number(formCategoriaId),
        cultura_id: formCulturaId === "" ? null : Number(formCulturaId),
        fabricante_id: formFabricanteId === "" ? null : Number(formFabricanteId),
        centro_custo_id: formCentroCustoId === "" ? null : Number(formCentroCustoId),
        has_seed_treatment: formSeedTreatment,
        tox_class: formTox.trim(),
        active_ingredient: formActiveIng.trim(),
        dose: formDose.trim(),
        density: formDensity.trim(),
        mapa_registry: formMapa.trim(),
        is_active: formActive
      };
      if (!editingId) {
        const created = await createInsumo(token, payload);
        setItems((prev) => [...prev, created]);
        setModalOpen(false);
        return;
      }
      const updated = await updateInsumo(token, editingId, payload);
      setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
      setModalOpen(false);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setSaveMessage(prettyError(err));
    } finally {
      setSaving(false);
    }
  }

  function openResumoReport() {
    const rows = filtered
      .map(
        (it) => `
      <tr>
        <td>${escapeHtml(it.name || "-")}</td>
        <td>${escapeHtml(it.short_description || "-")}</td>
        <td>${escapeHtml(it.unit || "-")}</td>
        <td>${escapeHtml(it.categoria?.name || "-")}</td>
        <td>${escapeHtml(it.fabricante?.name || "-")}</td>
        <td>${it.is_active ? "Ativo" : "Inativo"}</td>
      </tr>
    `
      )
      .join("");

    openPrintHtml(
      "Insumos - Resumo",
      `
      <h1>Relatorio resumo de insumos</h1>
      <p class="muted">Resumo geral de cadastro de insumos.</p>
      <table>
        <thead><tr><th>Descricao</th><th>Abreviada</th><th>Unid.</th><th>Categoria</th><th>Fabricante</th><th>Status</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6">Sem dados para os filtros selecionados.</td></tr>'}</tbody>
      </table>
    `
    );
  }

  function openAnaliticoReport() {
    const byCategory = new Map<string, { name: string; total: number; active: number; inactive: number }>();
    for (const it of filtered) {
      const key = it.categoria?.name || "Sem categoria";
      const cur = byCategory.get(key) ?? { name: key, total: 0, active: 0, inactive: 0 };
      cur.total += 1;
      if (it.is_active) cur.active += 1;
      else cur.inactive += 1;
      byCategory.set(key, cur);
    }
    const rows = [...byCategory.values()]
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map(
        (r) => `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${r.total}</td>
        <td>${r.active}</td>
        <td>${r.inactive}</td>
      </tr>
    `
      )
      .join("");

    openPrintHtml(
      "Insumos - Analitico",
      `
      <h1>Relatorio analitico de insumos</h1>
      <p class="muted">Consolidado por categoria.</p>
      <table>
        <thead><tr><th>Categoria</th><th>Total</th><th>Ativos</th><th>Inativos</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">Sem dados para os filtros selecionados.</td></tr>'}</tbody>
      </table>
    `
    );
  }

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-6">
          <section className="grid gap-3 xl:grid-cols-[minmax(320px,1fr)_minmax(520px,0.9fr)] xl:items-stretch">
            <div className="rounded-3xl border border-white/10 bg-[#06080f]/85 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Cadastros · Produtos</p>
              <h1 className="mt-1 text-[clamp(1.6rem,2.5vw,2.2rem)] font-black tracking-tight text-white">Insumos</h1>
              <p className="mt-1 max-w-2xl text-[13px] text-zinc-300">Cadastre insumos com categoria, cultura, fabricante e dados tecnicos.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3.5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Relatorios</p>
              <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={openResumoReport}
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-3 py-2 text-[12px] font-medium text-zinc-100 transition hover:bg-white/[0.1]"
                >
                  Resumo
                </button>
                <button
                  type="button"
                  onClick={openAnaliticoReport}
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-3 py-2 text-[12px] font-medium text-zinc-100 transition hover:bg-white/[0.1]"
                >
                  Analitico
                </button>
                <button
                  onClick={openCreate}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-3.5 py-2 text-[12px] font-black text-zinc-950 hover:bg-accent-400"
                >
                  <IconPlus />
                  Novo
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-3.5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Filtros</p>
              <div className="text-[11px] font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</div>
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-[1fr_220px_160px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar insumo..."
                className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-accent-500/50"
              />
              <select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 outline-none transition focus:border-accent-500/50"
              >
                <option value="all" style={optionStyle}>
                  Todas categorias
                </option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id} style={optionStyle}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 outline-none transition focus:border-accent-500/50"
              >
                <option value="all" style={optionStyle}>
                  Todos
                </option>
                <option value="active" style={optionStyle}>
                  Ativos
                </option>
                <option value="inactive" style={optionStyle}>
                  Inativos
                </option>
              </select>
            </div>

            {error ? (
              <div className="mt-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-xs font-semibold text-amber-200">{error}</div>
            ) : null}
          </section>

          <section className="h-fit rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-white">Lista</p>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : "Ordenado A-Z"}</div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <div className="min-w-[1180px]">
                <div className="grid grid-cols-[2.3fr_1.4fr_0.7fr_1.3fr_1.3fr_1.3fr_1fr_0.7fr] gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
                  <div>Descricao</div>
                  <div>Abreviada</div>
                  <div>Unid.</div>
                  <div>Categoria</div>
                  <div>Fabricante</div>
                  <div>Centro</div>
                  <div>Status</div>
                  <div className="text-right">Acoes</div>
                </div>

                <div className="mt-2 space-y-2">
                  {filtered.map((it) => (
                    <div
                      key={it.id}
                      className="grid grid-cols-[2.3fr_1.4fr_0.7fr_1.3fr_1.3fr_1.3fr_1fr_0.7fr] items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 text-[10px]"
                    >
                      <div className="truncate font-semibold text-zinc-100">{it.name || "-"}</div>
                      <div className="truncate text-zinc-200">{it.short_description || "-"}</div>
                      <div className="truncate text-zinc-200">{it.unit || "-"}</div>
                      <div className="truncate text-zinc-200">{it.categoria?.name ?? "-"}</div>
                      <div className="truncate text-zinc-200">{it.fabricante?.name ?? "-"}</div>
                      <div className="truncate text-zinc-200">{it.centro_custo?.name ?? "-"}</div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            it.is_active
                              ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                              : "border-zinc-400/40 bg-zinc-500/20 text-zinc-300"
                          }`}
                        >
                          {it.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(it.id)}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-zinc-950/30 text-zinc-300 hover:bg-white/5"
                          aria-label="Editar"
                          title="Editar"
                        >
                          <IconPencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {!loading && filtered.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-3 text-xs text-zinc-300">Nenhum insumo encontrado.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <Modal
            open={modalOpen}
            title={editing ? "Editar insumo" : "Novo insumo"}
            onClose={() => {
              setModalOpen(false);
              setSaveMessage("");
            }}
          >
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { step: 1, label: "Base" },
                  { step: 2, label: "Vinculos" },
                  { step: 3, label: "Tecnico" },
                  { step: 4, label: "Resumo" }
                ].map((s) => (
                  <div
                    key={s.step}
                    className={`rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                      formStep === s.step
                        ? "border-accent-500/60 bg-accent-500/15 text-accent-200"
                        : "border-white/10 bg-zinc-900/50 text-zinc-400"
                    }`}
                  >
                    {s.label}
                  </div>
                ))}
              </div>

              {formStep === 1 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Descricao completa</label>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(toUpperText(e.target.value))}
                      placeholder="Descricao completa..."
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Descricao abreviada</label>
                    <input
                      value={formShort}
                      onChange={(e) => setFormShort(toUpperText(e.target.value))}
                      placeholder="Abreviada..."
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Unidade</label>
                    <input
                      value={formUnit}
                      onChange={(e) => setFormUnit(toUpperText(e.target.value))}
                      placeholder="Ex: KG, L, LT, UN"
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                    />
                  </div>
                </div>
              ) : null}

              {formStep === 2 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Categoria</label>
                    <select
                      value={formCategoriaId}
                      onChange={(e) => setFormCategoriaId(e.target.value === "" ? "" : Number(e.target.value))}
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 outline-none focus:border-accent-500/50"
                    >
                      <option value="" style={optionStyle}>
                        Selecione
                      </option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id} style={optionStyle}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Cultura</label>
                    <select
                      value={formCulturaId}
                      onChange={(e) => setFormCulturaId(e.target.value === "" ? "" : Number(e.target.value))}
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 outline-none focus:border-accent-500/50"
                    >
                      <option value="" style={optionStyle}>
                        Selecione
                      </option>
                      {culturas.map((c) => (
                        <option key={c.id} value={c.id} style={optionStyle}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Fabricante</label>
                    <select
                      value={formFabricanteId}
                      onChange={(e) => setFormFabricanteId(e.target.value === "" ? "" : Number(e.target.value))}
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 outline-none focus:border-accent-500/50"
                    >
                      <option value="" style={optionStyle}>
                        Selecione
                      </option>
                      {fabricantes.map((f) => (
                        <option key={f.id} value={f.id} style={optionStyle}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Centro de custo</label>
                    <select
                      value={formCentroCustoId}
                      onChange={(e) => setFormCentroCustoId(e.target.value === "" ? "" : Number(e.target.value))}
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 outline-none focus:border-accent-500/50"
                    >
                      <option value="" style={optionStyle}>
                        Selecione
                      </option>
                      {centrosCusto.map((cc) => (
                        <option key={cc.id} value={cc.id} style={optionStyle}>
                          {cc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              {formStep === 3 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2 md:col-span-2">
                    <span className="text-[12px] font-semibold text-zinc-200">Possui tratamento de semente?</span>
                    <button
                      type="button"
                      onClick={() => setFormSeedTreatment((v) => !v)}
                      className={`relative h-6 w-11 rounded-full border transition-colors ${
                        formSeedTreatment ? "border-emerald-400/40 bg-emerald-500/25" : "border-white/10 bg-zinc-950/40"
                      }`}
                      aria-label="Alternar tratamento"
                    >
                      <span
                        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all ${
                          formSeedTreatment ? "left-6 bg-emerald-200" : "left-1 bg-zinc-300"
                        }`}
                      />
                    </button>
                  </label>

                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Classe toxicologica</label>
                    <input
                      value={formTox}
                      onChange={(e) => setFormTox(toUpperText(e.target.value))}
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 outline-none focus:border-accent-500/50"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Principio ativo</label>
                    <input
                      value={formActiveIng}
                      onChange={(e) => setFormActiveIng(toUpperText(e.target.value))}
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 outline-none focus:border-accent-500/50"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Dose</label>
                    <input
                      value={formDose}
                      onChange={(e) => setFormDose(toUpperText(e.target.value))}
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 outline-none focus:border-accent-500/50"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Densidade</label>
                    <input
                      value={formDensity}
                      onChange={(e) => setFormDensity(toUpperText(e.target.value))}
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 outline-none focus:border-accent-500/50"
                    />
                  </div>
                  <div className="grid gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Registro MAPA</label>
                    <input
                      value={formMapa}
                      onChange={(e) => setFormMapa(toUpperText(e.target.value))}
                      className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 text-[12px] font-medium text-zinc-100 outline-none focus:border-accent-500/50"
                    />
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2 md:col-span-2">
                    <span className="text-[12px] font-semibold text-zinc-200">Ativo</span>
                    <button
                      type="button"
                      onClick={() => setFormActive((v) => !v)}
                      className={`relative h-6 w-11 rounded-full border transition-colors ${
                        formActive ? "border-emerald-400/40 bg-emerald-500/25" : "border-white/10 bg-zinc-950/40"
                      }`}
                      aria-label="Alternar ativo"
                    >
                      <span
                        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all ${
                          formActive ? "left-6 bg-emerald-200" : "left-1 bg-zinc-300"
                        }`}
                      />
                    </button>
                  </label>
                </div>
              ) : null}

              {formStep === 4 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-950/35 p-3">
                  <p className="text-xs font-black text-white">Resumo para confirmacao</p>
                  <div className="mt-2 grid gap-2 text-[12px] text-zinc-200 md:grid-cols-2">
                    <p><span className="text-zinc-400">Descricao:</span> {formName || "-"}</p>
                    <p><span className="text-zinc-400">Abreviada:</span> {formShort || "-"}</p>
                    <p><span className="text-zinc-400">Unidade:</span> {formUnit || "-"}</p>
                    <p><span className="text-zinc-400">Categoria:</span> {categorias.find((c) => c.id === Number(formCategoriaId))?.name || "-"}</p>
                    <p><span className="text-zinc-400">Cultura:</span> {culturas.find((c) => c.id === Number(formCulturaId))?.name || "-"}</p>
                    <p><span className="text-zinc-400">Fabricante:</span> {fabricantes.find((f) => f.id === Number(formFabricanteId))?.name || "-"}</p>
                    <p><span className="text-zinc-400">Centro:</span> {centrosCusto.find((c) => c.id === Number(formCentroCustoId))?.name || "-"}</p>
                    <p><span className="text-zinc-400">Trat. semente:</span> {formSeedTreatment ? "Sim" : "Nao"}</p>
                    <p><span className="text-zinc-400">Classe tox.:</span> {formTox || "-"}</p>
                    <p><span className="text-zinc-400">Principio ativo:</span> {formActiveIng || "-"}</p>
                    <p><span className="text-zinc-400">Dose:</span> {formDose || "-"}</p>
                    <p><span className="text-zinc-400">Densidade:</span> {formDensity || "-"}</p>
                    <p className="md:col-span-2"><span className="text-zinc-400">Registro MAPA:</span> {formMapa || "-"}</p>
                  </div>
                </div>
              ) : null}

              {saveMessage ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-xs font-semibold text-zinc-200">{saveMessage}</div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  disabled={saving}
                  onClick={() => {
                    setModalOpen(false);
                    setSaveMessage("");
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold text-zinc-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <div className="flex items-center gap-2">
                  <button
                    disabled={saving || formStep === 1}
                    onClick={prevStep}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold text-zinc-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Voltar
                  </button>
                  {formStep < 4 ? (
                    <button
                      disabled={saving}
                      onClick={nextStep}
                      className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-4 py-2 text-[12px] font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Proximo
                    </button>
                  ) : (
                    <button
                      disabled={saving || formName.trim().length < 2}
                      onClick={onSave}
                      className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-4 py-2 text-[12px] font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </AuthedAdminShell>
  );
}
