"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  createMaquina,
  FornecedorGerencial,
  isApiError,
  listFornecedoresGerencial,
  listMaquinas,
  listProdutores,
  Maquina,
  Produtor,
  updateMaquina,
} from "@/lib/api";
import { formatCurrencyBRL } from "@/lib/locale";
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

function toApiDecimal(v: string | number) {
  const n = Number(String(v || "0").replace(",", "."));
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function text(v: string | null | undefined) {
  return (v || "").trim();
}

function Modal({
  open,
  title,
  children,
  onClose,
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
            <p className="mt-1 text-xs text-zinc-400">Preencha os dados por etapas e confirme no resumo.</p>
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

export default function MaquinasPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Maquina[]>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorGerencial[]>([]);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => items.find((i) => i.id === editingId) ?? null, [items, editingId]);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [formName, setFormName] = useState("");
  const [formShortName, setFormShortName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formChassis, setFormChassis] = useState("");
  const [formRenavam, setFormRenavam] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formEngine, setFormEngine] = useState("");
  const [formSeries, setFormSeries] = useState("");
  const [formOwner, setFormOwner] = useState("");
  const [formColor, setFormColor] = useState("");
  const [formProdutorId, setFormProdutorId] = useState<number | "">("");
  const [formPurchaseDate, setFormPurchaseDate] = useState("");
  const [formSaleDate, setFormSaleDate] = useState("");
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
  const [formFornecedorId, setFormFornecedorId] = useState<number | "">("");
  const [formPurchaseValue, setFormPurchaseValue] = useState("0");
  const [formSaleValue, setFormSaleValue] = useState("0");
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
          (i.short_name || "").toLowerCase().includes(q) ||
          (i.brand || "").toLowerCase().includes(q) ||
          (i.model || "").toLowerCase().includes(q) ||
          (i.plate || "").toLowerCase().includes(q)
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
      const [m, p, f] = await Promise.all([listMaquinas(token), listProdutores(token), listFornecedoresGerencial(token)]);
      setItems(m);
      setProdutores(p);
      setFornecedores(f);
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

  function resetForm() {
    setStep(1);
    setFormName("");
    setFormShortName("");
    setFormBrand("");
    setFormModel("");
    setFormYear("");
    setFormChassis("");
    setFormRenavam("");
    setFormPlate("");
    setFormEngine("");
    setFormSeries("");
    setFormOwner("");
    setFormColor("");
    setFormProdutorId("");
    setFormPurchaseDate("");
    setFormSaleDate("");
    setFormInvoiceNumber("");
    setFormFornecedorId("");
    setFormPurchaseValue("0");
    setFormSaleValue("0");
    setFormActive(true);
    setSaveMessage("");
  }

  function openCreate() {
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  }

  function openEdit(id: number) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    setEditingId(id);
    setStep(1);
    setFormName(it.name || "");
    setFormShortName(it.short_name || "");
    setFormBrand(it.brand || "");
    setFormModel(it.model || "");
    setFormYear(it.year || "");
    setFormChassis(it.chassis || "");
    setFormRenavam(it.renavam || "");
    setFormPlate(it.plate || "");
    setFormEngine(it.engine || "");
    setFormSeries(it.series || "");
    setFormOwner(it.owner || "");
    setFormColor(it.color || "");
    setFormProdutorId(it.produtor?.id ?? "");
    setFormPurchaseDate(it.purchase_date || "");
    setFormSaleDate(it.sale_date || "");
    setFormInvoiceNumber(it.invoice_number || "");
    setFormFornecedorId(it.fornecedor?.id ?? "");
    setFormPurchaseValue(String(it.purchase_value || "0"));
    setFormSaleValue(String(it.sale_value || "0"));
    setFormActive(it.is_active);
    setSaveMessage("");
    setModalOpen(true);
  }

  function nextStep() {
    if (step === 1 && text(formName).length < 2) {
      setSaveMessage("Informe a maquina para avancar.");
      return;
    }
    setSaveMessage("");
    setStep((s) => (s === 1 ? 2 : 3));
  }

  function prevStep() {
    setSaveMessage("");
    setStep((s) => (s === 3 ? 2 : 1));
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        name: toUpperText(formName),
        short_name: toUpperText(formShortName),
        brand: toUpperText(formBrand),
        model: toUpperText(formModel),
        year: text(formYear),
        chassis: toUpperText(formChassis),
        renavam: text(formRenavam),
        plate: toUpperText(formPlate),
        engine: toUpperText(formEngine),
        series: toUpperText(formSeries),
        owner: toUpperText(formOwner),
        color: toUpperText(formColor),
        produtor_id: formProdutorId === "" ? null : Number(formProdutorId),
        purchase_date: formPurchaseDate || null,
        sale_date: formSaleDate || null,
        invoice_number: text(formInvoiceNumber),
        fornecedor_id: formFornecedorId === "" ? null : Number(formFornecedorId),
        purchase_value: toApiDecimal(formPurchaseValue),
        sale_value: toApiDecimal(formSaleValue),
        is_active: formActive,
      };
      if (!editingId) {
        const created = await createMaquina(token, payload);
        setItems((prev) => [...prev, created]);
      } else {
        const updated = await updateMaquina(token, editingId, payload);
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

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-6">
          <section className="grid gap-3 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)] xl:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Cadastros · Patrimonial</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Maquinas</h1>
              <p className="mt-1 text-sm text-zinc-300">Cadastro de maquinas com dados tecnicos, proprietario e valores.</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Acoes</p>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
                <p className="mt-1 text-xs text-zinc-400">Refine por maquina, marca, modelo e placa.</p>
              </div>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</div>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_180px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar maquina, marca, modelo, placa..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
              >
                <option value="all" style={optionStyle}>Todos</option>
                <option value="active" style={optionStyle}>Ativos</option>
                <option value="inactive" style={optionStyle}>Inativos</option>
              </select>
            </div>
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-white">Lista</p>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : "Ordenado A-Z"}</div>
            </div>

            <div className="mt-3 hidden grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 lg:grid">
              <div className="col-span-3">Maquina</div>
              <div className="col-span-2">Marca / Modelo</div>
              <div className="col-span-1">Placa</div>
              <div className="col-span-2">Produtor</div>
              <div className="col-span-2">Fornecedor</div>
              <div className="col-span-1 text-right">Compra</div>
              <div className="col-span-1 text-right">Venda</div>
            </div>

            <div className={`mt-4 pr-1 ${filtered.length > 10 ? "max-h-[560px] overflow-auto" : ""}`}>
              <div className="space-y-2">
                {filtered.map((it) => (
                  <div key={it.id} className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 transition-colors hover:bg-white/5">
                    <button onClick={() => openEdit(it.id)} className="grid min-w-0 flex-1 grid-cols-12 items-center gap-3 text-left">
                      <div className="col-span-12 min-w-0 lg:col-span-3">
                        <p className="truncate text-sm font-black text-white">{it.name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-zinc-400">{it.short_name || "-"}</p>
                      </div>
                      <div className="col-span-12 min-w-0 lg:col-span-2">
                        <p className="truncate text-sm font-semibold text-zinc-100">{[it.brand, it.model].filter(Boolean).join(" / ") || "-"}</p>
                      </div>
                      <div className="col-span-12 min-w-0 lg:col-span-1"><p className="truncate text-sm font-semibold text-zinc-100">{it.plate || "-"}</p></div>
                      <div className="col-span-12 min-w-0 lg:col-span-2"><p className="truncate text-sm font-semibold text-zinc-100">{it.produtor?.name || "-"}</p></div>
                      <div className="col-span-12 min-w-0 lg:col-span-2"><p className="truncate text-sm font-semibold text-zinc-100">{it.fornecedor?.name || "-"}</p></div>
                      <div className="col-span-12 text-right lg:col-span-1"><p className="text-sm font-semibold text-zinc-100">{formatCurrencyBRL(Number(it.purchase_value || 0))}</p></div>
                      <div className="col-span-12 text-right lg:col-span-1"><p className="text-sm font-semibold text-zinc-100">{formatCurrencyBRL(Number(it.sale_value || 0))}</p></div>
                    </button>
                    <button type="button" onClick={() => openEdit(it.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-zinc-950/30 text-zinc-300 hover:bg-white/5" aria-label="Editar" title="Editar">
                      <IconPencil />
                    </button>
                  </div>
                ))}

                {!loading && filtered.length === 0 ? <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">Nenhuma maquina encontrada.</div> : null}
              </div>
            </div>
          </section>

          <Modal open={modalOpen} title={`${editing ? "Editar maquina" : "Nova maquina"} · Etapa ${step} de 3`} onClose={() => setModalOpen(false)}>
            <div className="grid grid-cols-3 gap-2">
              {(["Dados", "Identificacao", "Financeiro"] as const).map((lbl, idx) => (
                <button
                  key={lbl}
                  onClick={() => setStep((idx + 1) as 1 | 2 | 3)}
                  className={`rounded-xl border px-3 py-2 text-sm uppercase tracking-[0.15em] ${step === idx + 1 ? "border-accent-400/45 bg-accent-500/20 text-amber-200" : "border-white/15 bg-white/5 text-zinc-300"}`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {step === 1 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <label className="lg:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Maquina</span><input value={formName} onChange={(e) => setFormName(toUpperText(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Abreviado</span><input value={formShortName} onChange={(e) => setFormShortName(toUpperText(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Marca</span><input value={formBrand} onChange={(e) => setFormBrand(toUpperText(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Modelo</span><input value={formModel} onChange={(e) => setFormModel(toUpperText(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Ano</span><input value={formYear} onChange={(e) => setFormYear(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <label className="lg:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Chassi</span><input value={formChassis} onChange={(e) => setFormChassis(toUpperText(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Renavam</span><input value={formRenavam} onChange={(e) => setFormRenavam(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Placa</span><input value={formPlate} onChange={(e) => setFormPlate(toUpperText(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Motor</span><input value={formEngine} onChange={(e) => setFormEngine(toUpperText(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Serie</span><input value={formSeries} onChange={(e) => setFormSeries(toUpperText(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                <label className="lg:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Proprietario</span><input value={formOwner} onChange={(e) => setFormOwner(toUpperText(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Cor</span><input value={formColor} onChange={(e) => setFormColor(toUpperText(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                <label className="lg:col-span-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Produtor</span><select value={formProdutorId} onChange={(e) => setFormProdutorId(e.target.value === "" ? "" : Number(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"><option value="">Selecione</option>{produtores.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Data compra</span><input type="date" value={formPurchaseDate} onChange={(e) => setFormPurchaseDate(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                  <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Data venda</span><input type="date" value={formSaleDate} onChange={(e) => setFormSaleDate(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                  <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Nota fiscal</span><input value={formInvoiceNumber} onChange={(e) => setFormInvoiceNumber(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                  <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Fornecedor</span><select value={formFornecedorId} onChange={(e) => setFormFornecedorId(e.target.value === "" ? "" : Number(e.target.value))} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"><option value="">Selecione</option>{fornecedores.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
                  <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Valor compra</span><input value={formPurchaseValue} onChange={(e) => setFormPurchaseValue(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                  <label><span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Valor venda</span><input value={formSaleValue} onChange={(e) => setFormSaleValue(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/12 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100" /></label>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-white">Ativo</p>
                      <p className="text-xs text-zinc-400">Se desativado, nao aparece em novas operacoes.</p>
                    </div>
                    <button type="button" onClick={() => setFormActive((v) => !v)} className={`relative h-8 w-14 rounded-full transition ${formActive ? "bg-emerald-500/80" : "bg-zinc-700"}`}>
                      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${formActive ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  <p className="font-semibold">Resumo financeiro</p>
                  <p>Valor compra: <span className="font-black">{formatCurrencyBRL(Number(formPurchaseValue || 0))}</span></p>
                  <p>Valor venda: <span className="font-black">{formatCurrencyBRL(Number(formSaleValue || 0))}</span></p>
                </div>
              </div>
            ) : null}

            {saveMessage ? <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{saveMessage}</div> : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => (step === 1 ? setModalOpen(false) : prevStep())} className="rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-200">{step === 1 ? "Cancelar" : "Voltar"}</button>
              {step < 3 ? (
                <button onClick={nextStep} className="rounded-2xl border border-accent-400/40 bg-accent-500 px-5 py-2.5 text-sm font-bold text-black">Proximo</button>
              ) : (
                <button disabled={saving || text(formName).length < 2} onClick={onSave} className="rounded-2xl border border-emerald-400/35 bg-emerald-500/25 px-5 py-2.5 text-sm font-bold text-emerald-100 disabled:opacity-60">{saving ? "Salvando..." : "Salvar maquina"}</button>
              )}
            </div>
          </Modal>
        </div>
      )}
    </AuthedAdminShell>
  );
}
