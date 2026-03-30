"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import { toUpperText } from "@/lib/text";
import { maskCPF } from "@/lib/masks";
import {
  createProdutor,
  GrupoProdutor,
  isApiError,
  listGruposProdutores,
  listProdutores,
  Produtor,
  updateProdutor
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
      <div className="relative w-full max-w-[1020px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/85 shadow-2xl">
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

function formatArea(val: string | number | null | undefined) {
  const raw = String(val ?? "").trim();
  if (!raw) return "-";
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n)) return raw;
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha`;
}

export default function ProdutorPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Produtor[]>([]);
  const [groups, setGroups] = useState<GrupoProdutor[]>([]);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => items.find((i) => i.id === editingId) ?? null, [items, editingId]);

  const [formName, setFormName] = useState("");
  const [formGroupId, setFormGroupId] = useState<number | "">("");
  const [formInscricao, setFormInscricao] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formFazenda, setFormFazenda] = useState("");
  const [formEndereco, setFormEndereco] = useState("");
  const [formGoogle, setFormGoogle] = useState("");
  const [formArea, setFormArea] = useState("0");
  const [formMatricula, setFormMatricula] = useState("");
  const [formCidade, setFormCidade] = useState("");
  const [formUf, setFormUf] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...items]
      .filter((i) => {
        if (statusFilter === "active" && !i.is_active) return false;
        if (statusFilter === "inactive" && i.is_active) return false;
        if (!q) return true;
        return (
          i.name.toLowerCase().includes(q) ||
          (i.cpf || "").toLowerCase().includes(q) ||
          (i.farm || "").toLowerCase().includes(q) ||
          (i.city || "").toLowerCase().includes(q) ||
          (i.uf || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [items, query, statusFilter]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const [prod, grp] = await Promise.all([listProdutores(token), listGruposProdutores(token)]);
      setItems(prod);
      setGroups(grp);
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
    setWizardStep(1);
    setFormName("");
    setFormGroupId("");
    setFormInscricao("");
    setFormCpf("");
    setFormFazenda("");
    setFormEndereco("");
    setFormGoogle("");
    setFormArea("0");
    setFormMatricula("");
    setFormCidade("");
    setFormUf("");
    setFormActive(true);
    setSaveMessage("");
    setModalOpen(true);
  }

  function openEdit(id: number) {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setEditingId(id);
    setWizardStep(1);
    setFormName(it.name ?? "");
    setFormGroupId(it.grupo?.id ?? "");
    setFormInscricao(it.registration ?? "");
    setFormCpf(maskCPF(it.cpf ?? ""));
    setFormFazenda(it.farm ?? "");
    setFormEndereco(it.address ?? "");
    setFormGoogle(it.google_location ?? "");
    setFormArea(String(it.area_ha ?? "0"));
    setFormMatricula(it.matricula ?? "");
    setFormCidade(it.city ?? "");
    setFormUf(it.uf ?? "");
    setFormActive(it.is_active);
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
        grupo_id: formGroupId === "" ? null : Number(formGroupId),
        registration: formInscricao.trim(),
        cpf: formCpf.trim(),
        farm: formFazenda.trim(),
        address: formEndereco.trim(),
        google_location: formGoogle.trim(),
        area_ha: formArea,
        matricula: formMatricula.trim(),
        city: formCidade.trim(),
        uf: formUf.trim().toUpperCase().slice(0, 2),
        is_active: formActive
      };
      if (!editingId) {
        const created = await createProdutor(token, payload);
        setItems((prev) => [...prev, created]);
        setModalOpen(false);
        return;
      }
      const updated = await updateProdutor(token, editingId, payload);
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
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Cadastros · Gerencial</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Produtores</h1>
              <p className="mt-1 text-sm text-zinc-300">Cadastre produtores e dados da fazenda para organizar a operacao.</p>
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
                <p className="mt-1 text-xs text-zinc-400">Refine por produtor, CPF, fazenda, cidade e status.</p>
              </div>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produtor, CPF, fazenda, cidade..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
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

            <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 lg:grid">
              <div className="col-span-4">Produtor</div>
              <div className="col-span-2">CPF</div>
              <div className="col-span-3">Fazenda</div>
              <div className="col-span-2">Cidade/UF</div>
              <div className="col-span-1 text-right">Area</div>
            </div>

            <div className={`mt-4 pr-1 ${filtered.length > 10 ? "max-h-[560px] overflow-auto" : ""}`}>
              <div className="space-y-2">
                {filtered.map((it) => (
                  <div
                    key={it.id}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 transition-colors hover:bg-white/5"
                  >
                    <button
                      onClick={() => openEdit(it.id)}
                      className="grid min-w-0 flex-1 grid-cols-12 items-center gap-3 text-left"
                    >
                      <div className="col-span-12 min-w-0 lg:col-span-4">
                        <p className="truncate text-sm font-black text-white">{it.name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-zinc-400">{it.grupo?.name ? `Grupo: ${it.grupo.name}` : "Sem grupo"}</p>
                      </div>
                      <div className="col-span-12 min-w-0 lg:col-span-2">
                        <p className="truncate text-sm font-semibold text-zinc-100">{it.cpf || "-"}</p>
                      </div>
                      <div className="col-span-12 min-w-0 lg:col-span-3">
                        <p className="truncate text-sm font-semibold text-zinc-100">{it.farm || "-"}</p>
                      </div>
                      <div className="col-span-12 min-w-0 lg:col-span-2">
                        <p className="truncate text-sm font-semibold text-zinc-100">{[it.city, it.uf].filter(Boolean).join(" / ") || "-"}</p>
                      </div>
                      <div className="col-span-12 text-right lg:col-span-1">
                        <p className="text-sm font-semibold text-zinc-100">{formatArea(it.area_ha)}</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(it.id)}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-zinc-950/30 text-zinc-300 hover:bg-white/5"
                      aria-label="Editar"
                      title="Editar"
                    >
                      <IconPencil />
                    </button>
                  </div>
                ))}

                {!loading && filtered.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">
                    Nenhum produtor encontrado.
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <Modal
            open={modalOpen}
            title={`${editing ? "Editar produtor" : "Novo produtor"} · Etapa ${wizardStep} de 3`}
            onClose={() => {
              setModalOpen(false);
              setSaveMessage("");
            }}
          >
            <div className="grid gap-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] ${
                    wizardStep === 1
                      ? "border-accent-500/50 bg-accent-500/15 text-accent-100"
                      : "border-white/10 bg-white/5 text-zinc-400"
                  }`}
                >
                  Dados
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] ${
                    wizardStep === 2
                      ? "border-accent-500/50 bg-accent-500/15 text-accent-100"
                      : "border-white/10 bg-white/5 text-zinc-400"
                  }`}
                >
                  Localização
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] ${
                    wizardStep === 3
                      ? "border-accent-500/50 bg-accent-500/15 text-accent-100"
                      : "border-white/10 bg-white/5 text-zinc-400"
                  }`}
                >
                  Resumo
                </button>
              </div>

              {wizardStep === 1 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produtor</label>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(toUpperText(e.target.value))}
                      placeholder="Nome do produtor..."
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Grupo</label>
                    <select
                      value={formGroupId}
                      onChange={(e) => setFormGroupId(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                    >
                      <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                        Selecione
                      </option>
                      {groups
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
                        .map((g) => (
                          <option key={g.id} value={g.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Inscricao</label>
                    <input
                      value={formInscricao}
                      onChange={(e) => setFormInscricao(toUpperText(e.target.value))}
                      placeholder="Inscricao..."
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">CPF</label>
                    <input
                      value={formCpf}
                      onChange={(e) => setFormCpf(maskCPF(e.target.value))}
                      placeholder="CPF..."
                      inputMode="numeric"
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                    />
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Fazenda</label>
                    <input
                      value={formFazenda}
                      onChange={(e) => setFormFazenda(toUpperText(e.target.value))}
                      placeholder="Nome da fazenda..."
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                    />
                  </div>
                </div>
              ) : null}

              {wizardStep === 2 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Endereco</label>
                    <input
                      value={formEndereco}
                      onChange={(e) => setFormEndereco(toUpperText(e.target.value))}
                      placeholder="Endereco..."
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                    />
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Localizacao Google (URL)</label>
                    <input
                      value={formGoogle}
                      onChange={(e) => setFormGoogle(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Cidade</label>
                    <input
                      value={formCidade}
                      onChange={(e) => setFormCidade(toUpperText(e.target.value))}
                      placeholder="Cidade..."
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">UF</label>
                    <input
                      value={formUf}
                      onChange={(e) => setFormUf(toUpperText(e.target.value))}
                      placeholder="MS"
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                    />
                  </div>
                </div>
              ) : null}

              {wizardStep === 3 ? (
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Area (ha)</label>
                      <input
                        value={formArea}
                        onChange={(e) => setFormArea(e.target.value)}
                        inputMode="decimal"
                        placeholder="0"
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Matricula</label>
                      <input
                        value={formMatricula}
                        onChange={(e) => setFormMatricula(toUpperText(e.target.value))}
                        placeholder="Matricula..."
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
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

                  <div className="rounded-2xl border border-white/10 bg-zinc-950/35 p-4 text-sm">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Resumo para confirmação</p>
                    <div className="mt-3 grid gap-2 text-zinc-200 md:grid-cols-2">
                      <div><span className="text-zinc-400">Produtor:</span> {formName || "-"}</div>
                      <div><span className="text-zinc-400">Grupo:</span> {groups.find((g) => g.id === formGroupId)?.name ?? "-"}</div>
                      <div><span className="text-zinc-400">CPF:</span> {formCpf || "-"}</div>
                      <div><span className="text-zinc-400">Inscrição:</span> {formInscricao || "-"}</div>
                      <div><span className="text-zinc-400">Fazenda:</span> {formFazenda || "-"}</div>
                      <div><span className="text-zinc-400">Área:</span> {formatArea(formArea)}</div>
                      <div><span className="text-zinc-400">Cidade/UF:</span> {[formCidade, formUf].filter(Boolean).join(" / ") || "-"}</div>
                      <div><span className="text-zinc-400">Matrícula:</span> {formMatricula || "-"}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              {saveMessage ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-semibold text-zinc-200">
                  {saveMessage}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving || wizardStep === 1}
                    onClick={() => setWizardStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-zinc-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Voltar
                  </button>
                  {wizardStep < 3 ? (
                    <button
                      type="button"
                      disabled={saving || (wizardStep === 1 && formName.trim().length < 2)}
                      onClick={() => setWizardStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
                      className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Próximo
                    </button>
                  ) : (
                    <button
                      disabled={saving || formName.trim().length < 2}
                      onClick={onSave}
                      className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
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
