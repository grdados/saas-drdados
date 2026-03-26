"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  createTransportador,
  createTransportadorPlaca,
  isApiError,
  listTransportadores,
  listTransportadorPlacas,
  Transportador,
  TransportadorPlaca,
  updateTransportador,
  updateTransportadorPlaca
} from "@/lib/api";
import { toUpperText } from "@/lib/text";

function IconPencil({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-[760px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/90 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <p className="text-sm font-black text-white">{title}</p>
            <p className="mt-1 text-xs text-zinc-400">Preencha os dados e clique em salvar.</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
            aria-label="Fechar modal"
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

export default function TransportadoresPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transportadores, setTransportadores] = useState<Transportador[]>([]);
  const [placas, setPlacas] = useState<TransportadorPlaca[]>([]);

  const [query, setQuery] = useState("");

  const [openTransportador, setOpenTransportador] = useState(false);
  const [editingTransportadorId, setEditingTransportadorId] = useState<number | null>(null);
  const [formTransportadorName, setFormTransportadorName] = useState("");
  const [formTransportadorActive, setFormTransportadorActive] = useState(true);

  const [openPlaca, setOpenPlaca] = useState(false);
  const [editingPlacaId, setEditingPlacaId] = useState<number | null>(null);
  const [formPlacaTransportadorId, setFormPlacaTransportadorId] = useState<number | "">("");
  const [formPlaca, setFormPlaca] = useState("");
  const [formPlacaActive, setFormPlacaActive] = useState(true);

  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return placas;
    return placas.filter((p) => {
      const t = p.transportador?.name?.toLowerCase() ?? "";
      return t.includes(needle) || p.plate.toLowerCase().includes(needle);
    });
  }, [placas, query]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [trs, pls] = await Promise.all([listTransportadores(token), listTransportadorPlacas(token)]);
      setTransportadores(trs);
      setPlacas(pls);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao carregar transportadoras.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openNewTransportador() {
    setEditingTransportadorId(null);
    setFormTransportadorName("");
    setFormTransportadorActive(true);
    setOpenTransportador(true);
  }

  function openEditTransportador(item: Transportador) {
    setEditingTransportadorId(item.id);
    setFormTransportadorName(item.name);
    setFormTransportadorActive(item.is_active);
    setOpenTransportador(true);
  }

  function openNewPlaca() {
    setEditingPlacaId(null);
    setFormPlacaTransportadorId("");
    setFormPlaca("");
    setFormPlacaActive(true);
    setOpenPlaca(true);
  }

  function openEditPlaca(item: TransportadorPlaca) {
    setEditingPlacaId(item.id);
    setFormPlacaTransportadorId(item.transportador?.id ?? "");
    setFormPlaca(item.plate);
    setFormPlacaActive(item.is_active);
    setOpenPlaca(true);
  }

  async function saveTransportador() {
    const token = getAccessToken();
    if (!token) return;
    if (!formTransportadorName.trim()) return;
    setSaving(true);
    try {
      if (!editingTransportadorId) {
        await createTransportador(token, { name: formTransportadorName.trim(), is_active: formTransportadorActive });
      } else {
        await updateTransportador(token, editingTransportadorId, {
          name: formTransportadorName.trim(),
          is_active: formTransportadorActive
        });
      }
      setOpenTransportador(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar transportadora.");
    } finally {
      setSaving(false);
    }
  }

  async function savePlaca() {
    const token = getAccessToken();
    if (!token) return;
    if (!formPlacaTransportadorId || !formPlaca.trim()) return;
    setSaving(true);
    try {
      if (!editingPlacaId) {
        await createTransportadorPlaca(token, {
          transportador_id: Number(formPlacaTransportadorId),
          plate: formPlaca.trim(),
          is_active: formPlacaActive
        });
      } else {
        await updateTransportadorPlaca(token, editingPlacaId, {
          transportador_id: Number(formPlacaTransportadorId),
          plate: formPlaca.trim(),
          is_active: formPlacaActive
        });
      }
      setOpenPlaca(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar placa.");
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
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Cadastros · Gerencial</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Transportadoras</h1>
              <p className="mt-1 text-sm text-zinc-300">Cadastre transportadora e placas para uso no Romaneio.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={openNewTransportador} className="rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400">
                Nova transportadora
              </button>
              <button onClick={openNewPlaca} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2.5 text-sm font-black text-emerald-100 hover:bg-emerald-500/20">
                Nova placa
              </button>
            </div>
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por transportadora ou placa..."
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500"
            />
            {error ? <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Lista de placas</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
            </div>
            <div className="mt-3 space-y-2">
              {filtered.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-zinc-100">{item.plate}</p>
                    <p className="truncate text-xs text-zinc-400">{item.transportador?.name ?? "-"}</p>
                  </div>
                  <button
                    onClick={() => openEditPlaca(item)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-zinc-950/30 text-zinc-300 hover:bg-white/5"
                    title="Editar"
                  >
                    <IconPencil />
                  </button>
                </div>
              ))}
              {!loading && filtered.length === 0 ? <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">Nenhuma placa encontrada.</div> : null}
            </div>
          </section>

          <Modal open={openTransportador} title={editingTransportadorId ? "Editar transportadora" : "Nova transportadora"} onClose={() => setOpenTransportador(false)}>
            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Transportadora</span>
                <input value={formTransportadorName} onChange={(e) => setFormTransportadorName(toUpperText(e.target.value))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" />
              </label>
              <button
                type="button"
                onClick={() => setFormTransportadorActive((v) => !v)}
                className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold ${formTransportadorActive ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-zinc-950/40 text-zinc-300"}`}
              >
                {formTransportadorActive ? "Ativo" : "Inativo"}
              </button>
              <div className="flex justify-end gap-2">
                <button onClick={() => setOpenTransportador(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Cancelar</button>
                <button onClick={() => void saveTransportador()} disabled={saving || !formTransportadorName.trim()} className="rounded-2xl bg-accent-500 px-5 py-2.5 text-sm font-black text-zinc-950 disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </Modal>

          <Modal open={openPlaca} title={editingPlacaId ? "Editar placa" : "Nova placa"} onClose={() => setOpenPlaca(false)}>
            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Transportadora</span>
                <select value={formPlacaTransportadorId} onChange={(e) => setFormPlacaTransportadorId(e.target.value === "" ? "" : Number(e.target.value))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100">
                  <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Selecione</option>
                  {transportadores.filter((t) => t.is_active).map((t) => (
                    <option key={t.id} value={t.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Placa</span>
                <input value={formPlaca} onChange={(e) => setFormPlaca(toUpperText(e.target.value))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" />
              </label>
              <button
                type="button"
                onClick={() => setFormPlacaActive((v) => !v)}
                className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold ${formPlacaActive ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-zinc-950/40 text-zinc-300"}`}
              >
                {formPlacaActive ? "Ativa" : "Inativa"}
              </button>
              <div className="flex justify-end gap-2">
                <button onClick={() => setOpenPlaca(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Cancelar</button>
                <button onClick={() => void savePlaca()} disabled={saving || !formPlaca.trim() || !formPlacaTransportadorId} className="rounded-2xl bg-accent-500 px-5 py-2.5 text-sm font-black text-zinc-950 disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </AuthedAdminShell>
  );
}

