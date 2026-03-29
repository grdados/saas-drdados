"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  createFornecedorGerencial,
  FornecedorGerencial,
  isApiError,
  listFornecedoresGerencial,
  updateFornecedorGerencial
} from "@/lib/api";
import { formatDateTimeBR } from "@/lib/locale";
import { maskCEP, maskCpfCnpj } from "@/lib/masks";
import { toUpperText } from "@/lib/text";

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
        .kpi { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
        .card { border: 1px solid #e2e2e2; border-radius: 8px; padding: 8px; }
        .label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
        .value { margin-top: 4px; font-size: 18px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #e2e2e2; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f7f7f7; }
      </style>
    </head>
    <body>
      <div class="page">
        <header class="header">
          <div class="logo-wrap"><img src="${logoUrl}" alt="GR Dados" /></div>
          <div class="header-info">
            <p class="header-title">${escapeHtml(title)}</p>
            <div class="header-meta">Cliente: GR Dados Demo<br/>Emissão: ${generatedAt}</div>
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
      <div className="relative w-full max-w-[1100px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/90 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <p className="text-sm font-black text-white">{title}</p>
            <p className="mt-1 text-xs text-zinc-400">Preencha os dados por etapas e confirme no resumo final.</p>
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

export default function FornecedoresPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FornecedorGerencial[]>([]);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => items.find((i) => i.id === editingId) ?? null, [items, editingId]);

  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [formName, setFormName] = useState("");
  const [formDoc, setFormDoc] = useState("");
  const [formIe, setFormIe] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCep, setFormCep] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formUf, setFormUf] = useState("");
  const [formActive, setFormActive] = useState(true);
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
          (i.doc || "").toLowerCase().includes(q) ||
          (i.ie || "").toLowerCase().includes(q) ||
          (i.city || "").toLowerCase().includes(q) ||
          (i.uf || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [items, query, statusFilter]);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.is_active).length;
    const inactive = items.length - active;
    const cities = new Set(items.map((i) => `${i.city || ""}-${i.uf || ""}`.trim()).filter(Boolean)).size;
    return { total: items.length, active, inactive, cities };
  }, [items]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const data = await listFornecedoresGerencial(token);
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
    setFormDoc("");
    setFormIe("");
    setFormAddress("");
    setFormCep("");
    setFormCity("");
    setFormUf("");
    setFormActive(true);
    setFormStep(1);
    setSaveMessage("");
    setModalOpen(true);
  }

  function openEdit(id: number) {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setEditingId(id);
    setFormName(it.name ?? "");
    setFormDoc(maskCpfCnpj(it.doc ?? ""));
    setFormIe(it.ie ?? "");
    setFormAddress(it.address ?? "");
    setFormCep(maskCEP(it.cep ?? ""));
    setFormCity(it.city ?? "");
    setFormUf(it.uf ?? "");
    setFormActive(it.is_active);
    setFormStep(1);
    setSaveMessage("");
    setModalOpen(true);
  }

  function nextStep() {
    if (formStep === 1 && formName.trim().length < 2) {
      setSaveMessage("Informe o nome do fornecedor para avançar.");
      return;
    }
    setSaveMessage("");
    setFormStep((s) => (s === 1 ? 2 : 3));
  }

  function prevStep() {
    setSaveMessage("");
    setFormStep((s) => (s === 3 ? 2 : 1));
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        name: formName.trim(),
        doc: formDoc.trim(),
        ie: formIe.trim(),
        address: formAddress.trim(),
        cep: formCep.trim(),
        city: formCity.trim(),
        uf: formUf.trim(),
        is_active: formActive
      };
      if (!editingId) {
        const created = await createFornecedorGerencial(token, payload);
        setItems((prev) => [...prev, created]);
      } else {
        const updated = await updateFornecedorGerencial(token, editingId, payload);
        setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
      }
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
        <td>${escapeHtml(it.doc || "-")}</td>
        <td>${escapeHtml(it.ie || "-")}</td>
        <td>${escapeHtml(it.city || "-")}${it.uf ? `/${escapeHtml(it.uf)}` : ""}</td>
        <td>${it.is_active ? "Ativo" : "Inativo"}</td>
      </tr>
    `
      )
      .join("");
    openPrintHtml(
      "Fornecedores - Resumo",
      `
      <h1>Relatório resumo de fornecedores</h1>
      <p class="muted">Resumo geral de cadastro de fornecedores.</p>
      <div class="kpi">
        <div class="card"><div class="label">Total</div><div class="value">${stats.total}</div></div>
        <div class="card"><div class="label">Ativos</div><div class="value">${stats.active}</div></div>
        <div class="card"><div class="label">Inativos</div><div class="value">${stats.inactive}</div></div>
        <div class="card"><div class="label">Cidades</div><div class="value">${stats.cities}</div></div>
      </div>
      <table>
        <thead><tr><th>Fornecedor</th><th>CPF/CNPJ</th><th>IE</th><th>Cidade/UF</th><th>Status</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">Sem dados para os filtros selecionados.</td></tr>'}</tbody>
      </table>
    `
    );
  }

  function openAnaliticoReport() {
    const byCity = new Map<string, { city: string; active: number; inactive: number; total: number }>();
    for (const it of filtered) {
      const key = `${it.city || "-"}${it.uf ? `/${it.uf}` : ""}`;
      const cur = byCity.get(key) ?? { city: key, active: 0, inactive: 0, total: 0 };
      cur.total += 1;
      if (it.is_active) cur.active += 1;
      else cur.inactive += 1;
      byCity.set(key, cur);
    }
    const rows = [...byCity.values()]
      .sort((a, b) => a.city.localeCompare(b.city, "pt-BR"))
      .map(
        (r) => `
      <tr>
        <td>${escapeHtml(r.city)}</td>
        <td>${r.total}</td>
        <td>${r.active}</td>
        <td>${r.inactive}</td>
      </tr>
    `
      )
      .join("");
    openPrintHtml(
      "Fornecedores - Analítico",
      `
      <h1>Relatório analítico de fornecedores</h1>
      <p class="muted">Consolidado por cidade/UF.</p>
      <table>
        <thead><tr><th>Cidade/UF</th><th>Total</th><th>Ativos</th><th>Inativos</th></tr></thead>
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
          <section className="grid gap-3 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)] xl:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Cadastros · Gerencial</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Fornecedores</h1>
              <p className="mt-1 text-sm text-zinc-300">Cadastre fornecedores para pedidos de compra.</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Relatórios</p>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <button onClick={openResumoReport} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/10">Resumo</button>
                  <button onClick={openAnaliticoReport} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/10">Analitico</button>
                  <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-2 text-sm font-black text-zinc-950 hover:bg-accent-400">
                    <IconPlus />
                    Novo
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-3.5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">Filtros</p>
                <p className="mt-1 text-xs text-zinc-400">Refine por nome, documento, cidade e status.</p>
              </div>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</div>
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_180px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar fornecedor..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
              >
                <option value="all" style={optionStyle}>Todos</option>
                <option value="active" style={optionStyle}>Ativos</option>
                <option value="inactive" style={optionStyle}>Inativos</option>
              </select>
            </div>

            {error ? (
              <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
                {error}
              </div>
            ) : null}
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total", value: stats.total, tone: "border-amber-400/30 bg-amber-500/10" },
              { label: "Ativos", value: stats.active, tone: "border-emerald-400/30 bg-emerald-500/10" },
              { label: "Inativos", value: stats.inactive, tone: "border-sky-400/30 bg-sky-500/10" },
              { label: "Cidades", value: stats.cities, tone: "border-white/15 bg-white/5" }
            ].map((c) => (
              <article key={c.label} className={`h-[96px] rounded-3xl border px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] ${c.tone}`}>
                <div className="flex h-full items-center justify-end">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300/90">{c.label}</p>
                    <p className="mt-0.5 text-[16px] font-black leading-none text-white">{c.value}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="h-fit rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-white">Lista</p>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : "Ordenado A-Z"}</div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <div className="hidden min-w-[980px] grid-cols-[minmax(260px,1.6fr)_minmax(170px,1fr)_minmax(220px,1fr)_110px] gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 lg:grid">
                <div>Fornecedor</div>
                <div>CPF/CNPJ</div>
                <div>Cidade/UF</div>
                <div className="text-right">Status</div>
              </div>

              <div className="mt-3 space-y-2 lg:min-w-[980px]">
              {filtered.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 hover:bg-white/5">
                  <button
                    type="button"
                    onClick={() => openEdit(it.id)}
                    className="grid w-full grid-cols-1 items-center gap-2 text-left lg:grid-cols-[minmax(260px,1.6fr)_minmax(170px,1fr)_minmax(220px,1fr)_110px] lg:gap-3"
                    title="Editar"
                  >
                    <div className="min-w-0">
                      <p className="truncate whitespace-nowrap text-[10px] font-black text-white">{it.name}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate whitespace-nowrap text-[10px] font-semibold text-zinc-100">{it.doc || "-"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate whitespace-nowrap text-[10px] font-semibold text-zinc-100">{(it.city || "-") + (it.uf ? `/${it.uf}` : "")}</p>
                    </div>
                    <div className="lg:text-right">
                      <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-black ${it.is_active ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-zinc-200"}`}>
                        {it.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </button>

                  <button type="button" onClick={() => openEdit(it.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-zinc-950/30 text-zinc-300 hover:bg-white/5" aria-label="Editar" title="Editar">
                    <IconPencil />
                  </button>
                </div>
              ))}

                {!loading && filtered.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">
                    Nenhum fornecedor encontrado.
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <Modal open={modalOpen} title={editing ? "Editar fornecedor" : "Novo fornecedor"} onClose={() => { setModalOpen(false); setSaveMessage(""); }}>
            <div className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { id: 1 as const, label: "Dados" },
                  { id: 2 as const, label: "Endereço" },
                  { id: 3 as const, label: "Resumo" }
                ].map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setFormStep(step.id)}
                    className={`rounded-xl border px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] ${formStep === step.id ? "border-accent-400/40 bg-accent-500/20 text-accent-100" : "border-white/10 bg-white/5 text-zinc-300"}`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>

              {formStep === 1 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Fornecedor</label>
                    <input value={formName} onChange={(e) => setFormName(toUpperText(e.target.value))} placeholder="Nome/Razao social..." className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">CPF/CNPJ</label>
                    <input value={formDoc} onChange={(e) => setFormDoc(maskCpfCnpj(e.target.value))} placeholder="Documento..." inputMode="numeric" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">IE</label>
                    <input value={formIe} onChange={(e) => setFormIe(toUpperText(e.target.value))} placeholder="Inscricao estadual..." className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                  </div>
                </div>
              ) : null}

              {formStep === 2 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Endereco</label>
                    <input value={formAddress} onChange={(e) => setFormAddress(toUpperText(e.target.value))} placeholder="Endereco completo..." className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">CEP</label>
                    <input value={formCep} onChange={(e) => setFormCep(maskCEP(e.target.value))} placeholder="00000-000" inputMode="numeric" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Cidade</label>
                    <input value={formCity} onChange={(e) => setFormCity(toUpperText(e.target.value))} placeholder="Cidade..." className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">UF</label>
                    <input value={formUf} onChange={(e) => setFormUf(toUpperText(e.target.value))} placeholder="MS" maxLength={2} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-black text-white">Ativo</p>
                      <p className="text-xs text-zinc-400">Se desativado, não aparece em novas operações.</p>
                    </div>
                    <button type="button" onClick={() => setFormActive((v) => !v)} className={`relative h-7 w-12 rounded-full border transition-colors ${formActive ? "border-emerald-400/40 bg-emerald-500/25" : "border-white/10 bg-zinc-950/40"}`} aria-label="Alternar ativo">
                      <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all ${formActive ? "left-6 bg-emerald-200" : "left-1 bg-zinc-300"}`} />
                    </button>
                  </label>
                </div>
              ) : null}

              {formStep === 3 ? (
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3 text-sm text-zinc-200">
                      <p><span className="text-zinc-400">Fornecedor:</span> {formName || "-"}</p>
                      <p><span className="text-zinc-400">CPF/CNPJ:</span> {formDoc || "-"}</p>
                      <p><span className="text-zinc-400">IE:</span> {formIe || "-"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3 text-sm text-zinc-200">
                      <p><span className="text-zinc-400">Endereço:</span> {formAddress || "-"}</p>
                      <p><span className="text-zinc-400">Cidade:</span> {formCity || "-"}{formUf ? `/${formUf}` : ""}</p>
                      <p><span className="text-zinc-400">CEP:</span> {formCep || "-"}</p>
                      <p><span className="text-zinc-400">Status:</span> {formActive ? "Ativo" : "Inativo"}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {saveMessage ? <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-semibold text-zinc-200">{saveMessage}</div> : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button onClick={() => { setModalOpen(false); setSaveMessage(""); }} disabled={saving} className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
                  Cancelar
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={prevStep} disabled={saving || formStep === 1} className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
                    Voltar
                  </button>
                  {formStep < 3 ? (
                    <button type="button" onClick={nextStep} disabled={saving} className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60">
                      Próximo
                    </button>
                  ) : (
                    <button type="button" disabled={saving || formName.trim().length < 2} onClick={onSave} className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60">
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
