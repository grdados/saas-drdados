"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  createCultivar,
  Cultivar,
  Cultura,
  Fabricante,
  isApiError,
  listCultivares,
  listCulturas,
  listFabricantes,
  updateCultivar
} from "@/lib/api";
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
      <div className="relative w-full max-w-[920px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/85 shadow-2xl">
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
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [fabricanteFilter, setFabricanteFilter] = useState<string>("");
  const [culturaFilter, setCulturaFilter] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const editing = useMemo(() => items.find((i) => i.id === editingId) ?? null, [items, editingId]);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCycle, setFormCycle] = useState("");
  const [formMaturity, setFormMaturity] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formFabricanteId, setFormFabricanteId] = useState<string>("");
  const [formCulturaId, setFormCulturaId] = useState<string>("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...items]
      .filter((c) => {
        if (activeFilter === "active" && !c.is_active) return false;
        if (activeFilter === "inactive" && c.is_active) return false;
        if (fabricanteFilter && String(c.fabricante?.id ?? "") !== fabricanteFilter) return false;
        if (culturaFilter && String(c.cultura?.id ?? "") !== culturaFilter) return false;
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          (c.fabricante?.name ?? c.brand ?? "").toLowerCase().includes(q) ||
          c.region_indicated.toLowerCase().includes(q) ||
          c.maturity.toLowerCase().includes(q) ||
          c.cycle.toLowerCase().includes(q) ||
          (c.cultura?.name ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [items, query, activeFilter, fabricanteFilter, culturaFilter]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const [data, culturasData, fabricantesData] = await Promise.all([listCultivares(token), listCulturas(token), listFabricantes(token)]);
      setItems(data);
      setCulturas(culturasData);
      setFabricantes(fabricantesData);
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
    setFormFabricanteId("");
    setFormCulturaId("");
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
    setFormFabricanteId(
      c.fabricante?.id
        ? String(c.fabricante.id)
        : fabricantes.find((f) => f.name.toLowerCase() === (c.brand ?? "").toLowerCase())?.id
          ? String(fabricantes.find((f) => f.name.toLowerCase() === (c.brand ?? "").toLowerCase())?.id)
          : ""
    );
    setFormCulturaId(c.cultura?.id ? String(c.cultura.id) : "");
    setFormActive(Boolean(c.is_active));
    setSaveMessage("");
    setModalOpen(true);
  }

  function requestSave() {
    setSaveMessage("");
    setConfirmOpen(true);
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const fabricanteName = fabricantes.find((f) => f.id === Number(formFabricanteId || 0))?.name ?? "";
      const payload = {
        name: formName.trim(),
        description: formDesc,
        cycle: formCycle,
        maturity: formMaturity,
        region_indicated: formRegion,
        brand: fabricanteName,
        cultura_id: formCulturaId ? Number(formCulturaId) : null,
        fabricante_id: formFabricanteId ? Number(formFabricanteId) : null,
        is_active: formActive
      };

      if (!editingId) {
        await createCultivar(token, payload);
        await refresh();
        setConfirmOpen(false);
        setModalOpen(false);
        return;
      }

      await updateCultivar(token, editingId, payload);
      await refresh();
      setConfirmOpen(false);
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
              <p className="mt-1 text-sm text-zinc-300">Cadastre cultivar com vínculo de cultura.</p>
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
                <p className="mt-1 text-xs text-zinc-400">Refine por nome/fabricante/cultura e status.</p>
              </div>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_220px_220px_180px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar (cultivar/fabricante/cultura/ciclo)..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
              />
              <select
                value={fabricanteFilter}
                onChange={(e) => setFabricanteFilter(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
              >
                <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Todos fabricantes</option>
                {fabricantes.map((f) => (
                  <option key={f.id} value={f.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                    {f.name}
                  </option>
                ))}
              </select>
              <select
                value={culturaFilter}
                onChange={(e) => setCulturaFilter(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
              >
                <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Todas culturas</option>
                {culturas.map((c) => (
                  <option key={c.id} value={c.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
              >
                <option value="all" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Todos</option>
                <option value="active" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Ativos</option>
                <option value="inactive" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Inativos</option>
              </select>
            </div>

            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
          </section>

          <section className="h-fit rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-white">Lista</p>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : "Ordenado A-Z"}</div>
            </div>

            <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 sm:grid">
              <div className="col-span-3">Cultivar</div>
              <div className="col-span-2">Cultura</div>
              <div className="col-span-2">Fabricante</div>
              <div className="col-span-2">Ciclo</div>
              <div className="col-span-2">Maturidade</div>
              <div className="col-span-1 text-right">Status</div>
            </div>

            <div className={`mt-4 pr-1 ${filtered.length > 10 ? "max-h-[560px] overflow-auto" : ""}`}>
              <div className="space-y-2">
                {filtered.map((c) => {
                  const badge = c.is_active ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20" : "bg-zinc-500/10 text-zinc-300 ring-white/10";

                  return (
                    <div key={c.id} className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 transition-colors hover:bg-white/5">
                      <button onClick={() => openEdit(c.id)} className="grid min-w-0 flex-1 grid-cols-12 items-center gap-3 text-left">
                        <div className="col-span-3 min-w-0">
                          <p className="truncate text-sm font-black text-white">{c.name}</p>
                          <p className="mt-0.5 text-xs font-semibold text-zinc-400">ID: {c.id}</p>
                        </div>
                        <div className="col-span-2 min-w-0"><p className="truncate text-sm font-semibold text-zinc-200">{c.cultura?.name || "-"}</p></div>
                        <div className="col-span-2 min-w-0"><p className="truncate text-sm font-semibold text-zinc-200">{c.fabricante?.name ?? c.brand ?? "-"}</p></div>
                        <div className="col-span-2 min-w-0"><p className="truncate text-sm font-semibold text-zinc-200">{c.cycle || "-"}</p></div>
                        <div className="col-span-2 min-w-0"><p className="truncate text-sm font-semibold text-zinc-200">{c.maturity || "-"}</p></div>
                        <div className="col-span-1 text-right">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-black ring-1 ${badge}`}>{c.is_active ? "Ativo" : "Inativo"}</span>
                        </div>
                      </button>

                      <button type="button" onClick={() => openEdit(c.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-zinc-950/30 text-zinc-300 hover:bg-white/5" aria-label="Editar" title="Editar">
                        <IconPencil />
                      </button>
                    </div>
                  );
                })}

                {!loading && filtered.length === 0 ? <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">Nenhum cultivar encontrado.</div> : null}
              </div>
            </div>
          </section>

          <Modal open={modalOpen} title={editing ? "Editar cultivar" : "Novo cultivar"} onClose={() => { setModalOpen(false); setSaveMessage(""); }}>
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Cultivar</label>
                  <input value={formName} onChange={(e) => setFormName(toUpperText(e.target.value))} placeholder="Ex: BRS 1010" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Cultura</label>
                  <select value={formCulturaId} onChange={(e) => setFormCulturaId(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                    <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Selecione</option>
                    {culturas.map((c) => <option key={c.id} value={c.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>{c.name}</option>)}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Fabricante</label>
                  <select value={formFabricanteId} onChange={(e) => setFormFabricanteId(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                    <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Selecione</option>
                    {fabricantes.map((f) => <option key={f.id} value={f.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>{f.name}</option>)}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Ciclo</label>
                  <input value={formCycle} onChange={(e) => setFormCycle(toUpperText(e.target.value))} placeholder="Ex: 120 dias" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Maturidade</label>
                  <input value={formMaturity} onChange={(e) => setFormMaturity(toUpperText(e.target.value))} placeholder="Ex: Precoce" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Região indicada</label>
                  <input value={formRegion} onChange={(e) => setFormRegion(toUpperText(e.target.value))} placeholder="Ex: MS / MT" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Descrição</label>
                  <textarea value={formDesc} onChange={(e) => setFormDesc(toUpperText(e.target.value))} placeholder="Observações sobre o cultivar..." rows={4} className="w-full resize-none rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-4 py-3">
                <div>
                  <p className="text-sm font-black text-white">Ativo</p>
                  <p className="text-xs text-zinc-400">Se desativado, não aparece em novas operações.</p>
                </div>
                <button type="button" onClick={() => setFormActive((v) => !v)} className={`relative h-7 w-12 rounded-full border transition-colors ${formActive ? "border-emerald-400/40 bg-emerald-500/25" : "border-white/10 bg-zinc-950/40"}`} aria-label="Alternar ativo">
                  <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all ${formActive ? "left-6 bg-emerald-200" : "left-1 bg-zinc-300"}`} />
                </button>
              </label>

              {saveMessage ? <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-semibold text-zinc-200">{saveMessage}</div> : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button disabled={saving || formName.trim().length < 2} onClick={requestSave} className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
                <button disabled={saving} onClick={() => { setModalOpen(false); setSaveMessage(""); }} className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-zinc-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">Cancelar</button>
              </div>
            </div>
          </Modal>

          {confirmOpen ? (
            <div className="fixed inset-0 z-[60] grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/60" onClick={() => setConfirmOpen(false)} />
              <div className="relative w-full max-w-[560px] rounded-3xl border border-white/15 bg-zinc-900/95">
                <div className="border-b border-white/10 p-5">
                  <p className="text-lg font-black text-white">Confirmar alteração</p>
                  <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                    <p className="text-sm font-semibold text-emerald-100">
                      {editingId
                        ? "Deseja salvar as alterações deste cultivar?"
                        : "Deseja confirmar o cadastro deste cultivar?"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 p-5">
                  <button onClick={() => setConfirmOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">
                    Não
                  </button>
                  <button onClick={() => void onSave()} disabled={saving} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100">
                    {saving ? "Salvando..." : "Sim, confirmar"}
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
