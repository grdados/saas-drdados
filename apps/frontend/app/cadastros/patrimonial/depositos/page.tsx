"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { createDeposito, Deposito, isApiError, listDepositos, updateDeposito } from "@/lib/api";
import { toUpperText } from "@/lib/text";

type DepositoTipo = "insumos" | "graos" | "combustivel";

const TIPO_OPTIONS: Array<{ value: DepositoTipo; label: string }> = [
  { value: "insumos", label: "Insumos" },
  { value: "graos", label: "Graos" },
  { value: "combustivel", label: "Combustivel" }
];

function tipoLabel(tipo: string) {
  return TIPO_OPTIONS.find((t) => t.value === tipo)?.label ?? tipo;
}

export default function DepositosPage() {
  const [items, setItems] = useState<Deposito[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [tipoFilter, setTipoFilter] = useState<"" | DepositoTipo>("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formTipo, setFormTipo] = useState<DepositoTipo>("insumos");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...items]
      .filter((it) => {
        if (statusFilter === "active" && !it.is_active) return false;
        if (statusFilter === "inactive" && it.is_active) return false;
        if (tipoFilter && it.tipo !== tipoFilter) return false;
        if (!needle) return true;
        return it.name.toLowerCase().includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [items, query, statusFilter, tipoFilter]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const data = await listDepositos(token);
      setItems(data);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao carregar depositos.");
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
    setFormTipo("insumos");
    setFormActive(true);
    setSaveMessage("");
    setOpen(true);
  }

  function openEdit(id: number) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    setEditingId(id);
    setFormName(it.name);
    setFormTipo(it.tipo);
    setFormActive(it.is_active);
    setSaveMessage("");
    setOpen(true);
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      if (!editingId) {
        const created = await createDeposito(token, {
          name: toUpperText(formName),
          tipo: formTipo,
          is_active: formActive
        });
        setItems((prev) => [...prev, created]);
        setOpen(false);
      } else {
        const updated = await updateDeposito(token, editingId, {
          name: toUpperText(formName),
          tipo: formTipo,
          is_active: formActive
        });
        setItems((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
        setOpen(false);
      }
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setSaveMessage(err instanceof Error ? err.message : "Falha ao salvar deposito.");
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
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Cadastros · Patrimonial</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Depositos</h1>
              <p className="mt-1 text-sm text-zinc-300">Cadastre depositos e o tipo de armazenagem (Insumos, Graos ou Combustivel).</p>
            </div>
            <button onClick={openCreate} className="rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400">
              + Novo
            </button>
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar por nome..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
              />
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter((e.target.value || "") as "" | DepositoTipo)}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
              >
                <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Tipo (todos)</option>
                {TIPO_OPTIONS.map((op) => (
                  <option key={op.value} value={op.value} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                    {op.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
              >
                <option value="all" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Status (todos)</option>
                <option value="active" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Ativo</option>
                <option value="inactive" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Inativo</option>
              </select>
            </div>
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Lista</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
            </div>
            <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 sm:grid">
              <div className="col-span-5">Deposito</div>
              <div className="col-span-3">Tipo</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Acoes</div>
            </div>
            <div className="mt-3 space-y-2">
              {filtered.map((it) => {
                const badge = it.is_active
                  ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20"
                  : "bg-zinc-500/10 text-zinc-300 ring-white/10";
                return (
                  <div key={it.id} className="grid grid-cols-12 items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 hover:bg-white/5">
                    <div className="col-span-5 min-w-0">
                      <p className="truncate text-sm font-black text-white">{it.name}</p>
                    </div>
                    <div className="col-span-3">
                      <span className="inline-flex rounded-full border border-accent-400/30 bg-accent-500/10 px-2 py-1 text-[11px] font-black text-accent-100">
                        {tipoLabel(it.tipo)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black ring-1 ${badge}`}>{it.is_active ? "Ativo" : "Inativo"}</span>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button
                        onClick={() => openEdit(it.id)}
                        className="rounded-xl border border-sky-400/25 bg-sky-500/10 p-2 text-sky-200 hover:bg-sky-500/20"
                        title="Editar"
                        aria-label="Editar"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {open ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Fechar" />
              <div className="relative w-full max-w-[720px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/90 shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <p className="text-sm font-black text-white">{editingId ? "Editar deposito" : "Novo deposito"}</p>
                    <p className="mt-1 text-xs text-zinc-400">Preencha os dados e clique em salvar.</p>
                  </div>
                  <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10" aria-label="Fechar modal">×</button>
                </div>
                <div className="space-y-4 p-5">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Deposito</label>
                      <input
                        value={formName}
                        onChange={(e) => setFormName(toUpperText(e.target.value))}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                        placeholder="Nome do deposito"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Tipo</label>
                      <select
                        value={formTipo}
                        onChange={(e) => setFormTipo(e.target.value as DepositoTipo)}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        {TIPO_OPTIONS.map((op) => (
                          <option key={op.value} value={op.value} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                    <div>
                      <p className="text-sm font-black text-white">Ativo</p>
                      <p className="text-xs text-zinc-400">Se desativado, nao aparece em novas operacoes.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormActive((v) => !v)}
                      className={`relative h-8 w-14 rounded-full transition ${formActive ? "bg-emerald-500/80" : "bg-zinc-700"}`}
                    >
                      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${formActive ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                  {saveMessage ? <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{saveMessage}</div> : null}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200 hover:bg-white/10">Cancelar</button>
                    <button disabled={saving || formName.trim().length < 2} onClick={onSave} className="rounded-2xl bg-accent-500 px-5 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:opacity-60">
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}

