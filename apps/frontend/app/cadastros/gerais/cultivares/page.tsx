"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { createCultivar, Cultivar, isApiError, listCultivares, updateCultivar } from "@/lib/api";
import { toUpperText } from "@/lib/text";

function prettyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const trimmed = (msg || "").trim();
  if (!trimmed) return "Falha inesperada.";
  return trimmed;
}

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
      <div className="relative w-full max-w-[920px] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 shadow-2xl">
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

export default function CultivaresPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Cultivar[]>([]);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [brandFilter, setBrandFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const editing = useMemo(() => items.find((i) => i.id === editingId) ?? null, [items, editingId]);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCycle, setFormCycle] = useState("");
  const [formMaturity, setFormMaturity] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bq = brandFilter.trim().toLowerCase();
    return [...items]
      .filter((c) => {
        if (activeFilter === "active" && !c.is_active) return false;
        if (activeFilter === "inactive" && c.is_active) return false;
        if (bq && !c.brand.toLowerCase().includes(bq)) return false;
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.brand.toLowerCase().includes(q) ||
          c.region_indicated.toLowerCase().includes(q) ||
          c.maturity.toLowerCase().includes(q) ||
          c.cycle.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [items, query, activeFilter, brandFilter]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const data = await listCultivares(token);
      setItems(data);
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
    setFormName("");
    setFormDesc("");
    setFormCycle("");
    setFormMaturity("");
    setFormRegion("");
    setFormBrand("");
    setFormActive(true);
    setSaveMessage("");
    setModalOpen(true);
  }

  function openEdit(id: number) {
    const c = items.find((i) => i.id === id);
    if (!c) return;
    setEditingId(id);
    setFormName(c.name ?? "");
    setFormDesc(c.description ?? "");
    setFormCycle(c.cycle ?? "");
    setFormMaturity(c.maturity ?? "");
    setFormRegion(c.region_indicated ?? "");
    setFormBrand(c.brand ?? "");
    setFormActive(Boolean(c.is_active));
    setSaveMessage("");
    setModalOpen(true);
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        name: formName.trim(),
        description: formDesc,
        cycle: formCycle,
        maturity: formMaturity,
        region_indicated: formRegion,
        brand: formBrand,
        is_active: formActive
      };

      if (!editingId) {
        const created = await createCultivar(token, payload);
        setItems((prev) => [...prev, created]);
        setModalOpen(false);
        return;
      }

      const updated = await updateCultivar(token, editingId, payload);
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

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Cadastros · Gerais</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Cultivares</h1>
              <p className="mt-1 text-sm text-zinc-300">Cadastre cultivar com descricao, ciclo, maturidade, regiao e marca.</p>
            </div>

            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400"
            >
              <IconPlus />
              Novo
            </button>
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">Filtros</p>
                <p className="mt-1 text-xs text-zinc-400">Refine por nome/marca e status.</p>
              </div>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_220px_180px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar (cultivar/marca/regiao/ciclo)..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
              />
              <input
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                placeholder="Filtrar por marca..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
              />
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
              >
                <option value="all" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                  Todos
                </option>
                <option value="active" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                  Ativos
                </option>
                <option value="inactive" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                  Inativos
                </option>
              </select>
            </div>

            {error ? (
              <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
                {error}
              </div>
            ) : null}
          </section>

          <section className="h-fit rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-white">Lista</p>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : "Ordenado A-Z"}</div>
            </div>

            <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 sm:grid">
              <div className="col-span-3">Cultivar</div>
              <div className="col-span-2">Marca</div>
              <div className="col-span-2">Regiao</div>
              <div className="col-span-2">Ciclo</div>
              <div className="col-span-2">Maturidade</div>
              <div className="col-span-1 text-right">Status</div>
            </div>

            <div className={`mt-4 pr-1 ${filtered.length > 10 ? "max-h-[560px] overflow-auto" : ""}`}>
              <div className="space-y-2">
                {filtered.map((c) => {
                  const badge = c.is_active
                    ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
                    : "bg-zinc-500/10 text-zinc-300 ring-white/10";

                  return (
                    <div
                      key={c.id}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 transition-colors hover:bg-white/5"
                    >
                      <button onClick={() => openEdit(c.id)} className="grid min-w-0 flex-1 grid-cols-12 items-center gap-3 text-left">
                        <div className="col-span-3 min-w-0">
                          <p className="truncate text-sm font-black text-white">{c.name}</p>
                          <p className="mt-0.5 text-xs font-semibold text-zinc-400">ID: {c.id}</p>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-200">{c.brand || "—"}</p>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-200">{c.region_indicated || "—"}</p>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-200">{c.cycle || "—"}</p>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-200">{c.maturity || "—"}</p>
                        </div>
                        <div className="col-span-1 text-right">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-black ring-1 ${badge}`}>
                            {c.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEdit(c.id)}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-zinc-950/30 text-zinc-300 hover:bg-white/5"
                        aria-label="Editar"
                        title="Editar"
                      >
                        <IconPencil />
                      </button>
                    </div>
                  );
                })}

                {!loading && filtered.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">
                    Nenhum cultivar encontrado.
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <Modal
            open={modalOpen}
            title={editing ? "Editar cultivar" : "Novo cultivar"}
            onClose={() => {
              setModalOpen(false);
              setSaveMessage("");
            }}
          >
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Cultivar</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(toUpperText(e.target.value))}
                    placeholder="Ex: BRS 1010"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Marca</label>
                  <input
                    value={formBrand}
                    onChange={(e) => setFormBrand(toUpperText(e.target.value))}
                    placeholder="Ex: Bayer"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Ciclo</label>
                  <input
                    value={formCycle}
                    onChange={(e) => setFormCycle(toUpperText(e.target.value))}
                    placeholder="Ex: 120 dias"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Maturidade</label>
                  <input
                    value={formMaturity}
                    onChange={(e) => setFormMaturity(toUpperText(e.target.value))}
                    placeholder="Ex: Precoce"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Regiao indicada</label>
                  <input
                    value={formRegion}
                    onChange={(e) => setFormRegion(toUpperText(e.target.value))}
                    placeholder="Ex: MS / MT"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Descricao</label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(toUpperText(e.target.value))}
                    placeholder="Observacoes sobre o cultivar..."
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-4 py-3">
                <div>
                  <p className="text-sm font-black text-white">Ativo</p>
                  <p className="text-xs text-zinc-400">Se desativado, nao aparece em novas operacoes.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormActive((v) => !v)}
                  className={`relative h-7 w-12 rounded-full border transition-colors ${
                    formActive ? "border-emerald-400/40 bg-emerald-500/25" : "border-white/10 bg-zinc-950/40"
                  }`}
                  aria-label="Alternar ativo"
                >
                  <span
                    className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all ${
                      formActive ? "left-6 bg-emerald-200" : "left-1 bg-zinc-300"
                    }`}
                  />
                </button>
              </label>

              {saveMessage ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-semibold text-zinc-200">
                  {saveMessage}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  disabled={saving || formName.trim().length < 2}
                  onClick={onSave}
                  className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  disabled={saving}
                  onClick={() => {
                    setModalOpen(false);
                    setSaveMessage("");
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-zinc-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </AuthedAdminShell>
  );
}
