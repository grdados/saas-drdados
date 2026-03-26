"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { createCultura, Cultura, isApiError, listCulturas, updateCultura } from "@/lib/api";
import { toUpperText } from "@/lib/text";

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
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-[680px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/85 shadow-2xl">
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
  const status =
    typeof err === "object" && err && "status" in err && typeof (err as { status?: unknown }).status === "number"
      ? String((err as { status: number }).status)
      : "";
  const trimmed = (msg || "").trim();
  if (!trimmed) return "Falha inesperada.";
  if (trimmed.toLowerCase().includes("<!doctype html") || trimmed.toLowerCase().includes("<html")) {
    return `Erro interno no servidor${status ? ` (${status})` : ""}. Verifique os logs do backend e se as migracoes foram aplicadas.`;
  }
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

type Mode = "idle" | "view" | "edit" | "create";

export default function CulturaPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Cultura[]>([]);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [mode, setMode] = useState<Mode>("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);

  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...items]
      .filter((i) => {
        if (statusFilter === "active" && !i.is_active) return false;
        if (statusFilter === "inactive" && i.is_active) return false;
        if (!q) return true;
        return i.name.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [items, query, statusFilter]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const data = await listCulturas(token);
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

  // Keep form in sync when switching selected/mode
  useEffect(() => {
    if (mode === "create") {
      setFormName("");
      setFormActive(true);
      setSaveMessage("");
      return;
    }
    if (selected && (mode === "view" || mode === "edit")) {
      setFormName(selected.name);
      setFormActive(selected.is_active);
      setSaveMessage("");
    }
  }, [mode, selected]);

  function openCreate() {
    setSelectedId(null);
    setMode("create");
    setCreateOpen(true);
  }

  function openView(id: number) {
    setSelectedId(id);
    setMode("view");
  }

  function openEdit(id: number) {
    setSelectedId(id);
    setMode("edit");
    setCreateOpen(true);
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      if (mode === "create") {
        const created = await createCultura(token, { name: formName.trim(), is_active: formActive });
        setItems((prev) => [...prev, created]);
        setSelectedId(created.id);
        setMode("view");
        setCreateOpen(false);
        setConfirmOpen(false);
        setSaveMessage("Cultura criada com sucesso.");
        return;
      }

      if (mode === "edit" && selectedId) {
        const updated = await updateCultura(token, selectedId, { name: formName.trim(), is_active: formActive });
        setItems((prev) => prev.map((i) => (i.id === selectedId ? updated : i)));
        setMode("view");
        setCreateOpen(false);
        setConfirmOpen(false);
        setSaveMessage("Alteracoes salvas.");
        return;
      }
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

  function requestSave() {
    setSaveMessage("");
    setConfirmOpen(true);
  }

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Cadastros · Gerais</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Cultura</h1>
              <p className="mt-1 text-sm text-zinc-300">Cadastre e mantenha suas culturas. Selecione uma cultura para abrir o painel.</p>
            </div>

            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400"
            >
              <IconPlus />
              Novo
            </button>
          </div>

          <div className="grid items-start gap-6">
            {/* Left: filters */}
            <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">Filtros</p>
                  <p className="mt-1 text-xs text-zinc-400">Refine a lista por nome e status.</p>
                </div>
                <div className="text-xs font-semibold text-zinc-400">
                  {loading ? "Carregando..." : `${filtered.length} item(ns)`}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]">
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filtrar por nome..."
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>

              {error ? (
                <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
                  {error}
                </div>
              ) : null}
            </section>

            {/* List (full width) */}
            <section className="h-fit rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-white">Lista</p>
                <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : "Ordenado A-Z"}</div>
              </div>

              <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 sm:grid">
                <div className="col-span-7">Cultura</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-2 text-right">Atualizado</div>
              </div>

              {/* List */}
              <div className={`mt-4 pr-1 ${filtered.length > 10 ? "max-h-[560px] overflow-auto" : ""}`}>
                <div className="space-y-2">
                  {filtered.map((c) => {
                    const isSelected = c.id === selectedId && mode !== "create";
                    return (
                      <div
                        key={c.id}
                        className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 transition-colors ${
                          isSelected
                            ? "border-accent-500/35 bg-accent-500/10"
                            : "border-white/10 bg-zinc-950/35 hover:bg-white/5"
                        }`}
                      >
                        <button
                          onClick={() => openView(c.id)}
                          className="grid min-w-0 flex-1 grid-cols-12 items-center gap-3 text-left"
                        >
                          <div className="col-span-7 min-w-0">
                            <p className="truncate text-sm font-black text-white">{c.name}</p>
                            <p className="mt-0.5 text-xs font-semibold text-zinc-400">ID: {c.id}</p>
                          </div>

                          <div className="col-span-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-black ring-1 ${
                                c.is_active
                                  ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
                                  : "bg-zinc-500/10 text-zinc-300 ring-white/10"
                              }`}
                            >
                              {c.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </div>

                          <div className="col-span-2 text-right text-xs font-semibold text-zinc-400">
                            {new Date(c.updated_at).toLocaleDateString("pt-BR")}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEdit(c.id)}
                          className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
                            isSelected
                              ? "border-accent-500/25 bg-accent-500/10 text-accent-200"
                              : "border-white/10 bg-zinc-950/30 text-zinc-300 hover:bg-white/5"
                          }`}
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
                      Nenhuma cultura encontrada.
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          <Modal
            open={createOpen}
            title={mode === "edit" ? "Editar cultura" : "Nova cultura"}
            onClose={() => {
              setCreateOpen(false);
              setMode("idle");
              setSaveMessage("");
            }}
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Nome</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(toUpperText(e.target.value))}
                  placeholder="Ex: Soja"
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                />
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
                  onClick={requestSave}
                  className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  disabled={saving}
                  onClick={() => {
                    setCreateOpen(false);
                    setMode("idle");
                    setSaveMessage("");
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-zinc-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
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
                      {mode === "edit" ? "Deseja salvar as alterações desta cultura?" : "Deseja confirmar o cadastro desta cultura?"}
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
