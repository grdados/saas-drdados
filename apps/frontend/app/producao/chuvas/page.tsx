"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  ChuvaApi,
  EmpreendimentoApi,
  Safra,
  Talhao,
  createChuva,
  deleteChuva,
  isApiError,
  listChuvas,
  listEmpreendimentos,
  listSafras,
  listTalhoes,
  updateChuva
} from "@/lib/api";
import { formatDateBR } from "@/lib/locale";

function n(v: unknown) {
  const x = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

type ChuvaTipo = "chuvisco" | "chuva" | "tempestade" | "granizo";

const TIPOS: Array<{ value: ChuvaTipo; label: string }> = [
  { value: "chuvisco", label: "Chuvisco" },
  { value: "chuva", label: "Chuva" },
  { value: "tempestade", label: "Tempestade" },
  { value: "granizo", label: "Granizo" }
];

function classificarChuva(totalMm: number) {
  if (totalMm <= 40) return "Pouca chuva";
  if (totalMm <= 80) return "Quase Bom";
  if (totalMm <= 100) return "Bom";
  return "Excelente";
}

function fmtMm(v: number) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} mm`;
}

function fmtDateShort(isoDate: string) {
  if (!isoDate) return "-";
  return formatDateBR(new Date(`${isoDate}T00:00:00`)).slice(0, 5);
}

type FormState = {
  date: string;
  empreendimento_id: string;
  talhao_id: string;
  pluviometro_id: string;
  tipo: ChuvaTipo;
  volume_mm: string;
};

const EMPTY_FORM: FormState = {
  date: "",
  empreendimento_id: "",
  talhao_id: "",
  pluviometro_id: "",
  tipo: "chuva",
  volume_mm: "0"
};

export default function ChuvasPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [safras, setSafras] = useState<Safra[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoApi[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [chuvas, setChuvas] = useState<ChuvaApi[]>([]);

  const [safraFilter, setSafraFilter] = useState<string>("");
  const [empreendimentoFilter, setEmpreendimentoFilter] = useState<string>("");
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [step, setStep] = useState(0);
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (prefillApplied) return;
    if (!empreendimentos.length) return;
    const eid = searchParams.get("empreendimento_id") || "";
    if (!eid) {
      setPrefillApplied(true);
      return;
    }
    const exists = empreendimentos.some((e) => String(e.id) === eid);
    if (!exists) {
      setPrefillApplied(true);
      return;
    }
    const autoOpen = searchParams.get("auto_open") === "1";
    setEmpreendimentoFilter(eid);
    setForm((prev) => ({ ...prev, empreendimento_id: eid }));
    if (autoOpen) {
      setEditingId(null);
      setStep(0);
      setOpenForm(true);
    }
    setPrefillApplied(true);
  }, [empreendimentos, prefillApplied, searchParams]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [a, b, c, d] = await Promise.all([listSafras(token), listEmpreendimentos(token), listTalhoes(token), listChuvas(token)]);
      setSafras(a);
      setEmpreendimentos(b);
      setTalhoes(c);
      setChuvas(d);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao carregar chuvas.");
    } finally {
      setLoading(false);
    }
  }

  const empreendimentoSafra = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const e of empreendimentos) {
      map.set(String(e.id), e.safra_id ?? e.safra?.id ?? null);
    }
    return map;
  }, [empreendimentos]);

  const filteredEmpreendimentos = useMemo(() => {
    return empreendimentos.filter((e) => {
      if (!safraFilter) return true;
      return String(e.safra_id ?? e.safra?.id ?? "") === safraFilter;
    });
  }, [empreendimentos, safraFilter]);

  const filtered = useMemo(() => {
    return chuvas
      .filter((r) => {
        const eid = String(r.empreendimento_id ?? r.empreendimento?.id ?? "");
        const rowDate = r.date ?? "";
        if (safraFilter) {
          const safraId = empreendimentoSafra.get(eid);
          if (String(safraId ?? "") !== safraFilter) return false;
        }
        if (empreendimentoFilter && eid !== empreendimentoFilter) return false;
        if (tipoFilter && r.tipo !== tipoFilter) return false;
        if (dateFrom && rowDate && rowDate < dateFrom) return false;
        if (dateTo && rowDate && rowDate > dateTo) return false;
        return true;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [chuvas, empreendimentoFilter, safraFilter, tipoFilter, dateFrom, dateTo, empreendimentoSafra]);

  const acumuladoMm = useMemo(() => filtered.reduce((acc, x) => acc + n(x.volume_mm), 0), [filtered]);
  const classificacao = classificarChuva(acumuladoMm);

  const chartDates = useMemo(() => {
    return [...new Set(filtered.map((x) => x.date || "").filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [filtered]);

  const linhasPorEmpreendimento = useMemo(() => {
    const byEmp = new Map<
      string,
      {
        code: string;
        volumeByDate: Map<string, number>;
      }
    >();

    for (const x of filtered) {
      const eid = String(x.empreendimento_id ?? x.empreendimento?.id ?? "");
      const date = x.date || "";
      if (!eid || !date) continue;
      const row = byEmp.get(eid) ?? {
        code: x.empreendimento?.code || `Empreendimento ${eid}`,
        volumeByDate: new Map<string, number>()
      };
      row.volumeByDate.set(date, (row.volumeByDate.get(date) || 0) + n(x.volume_mm));
      byEmp.set(eid, row);
    }

    return Array.from(byEmp.entries()).map(([id, row]) => {
      let acc = 0;
      const points = chartDates.map((date) => {
        acc += row.volumeByDate.get(date) || 0;
        return { date, value: acc };
      });
      return { id, code: row.code, points };
    });
  }, [filtered, chartDates]);

  const maxSerie = useMemo(
    () => Math.max(1, ...linhasPorEmpreendimento.flatMap((s) => s.points.map((p) => p.value))),
    [linhasPorEmpreendimento]
  );

  const lineColors = useMemo(
    () => [
      "rgba(16,185,129,0.95)",
      "rgba(56,189,248,0.95)",
      "rgba(250,204,21,0.95)",
      "rgba(244,114,182,0.95)",
      "rgba(167,139,250,0.95)",
      "rgba(251,146,60,0.95)",
      "rgba(52,211,153,0.95)"
    ],
    []
  );

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setStep(0);
    setOpenForm(true);
  }

  function openEdit(row: ChuvaApi) {
    setEditingId(row.id);
    setForm({
      date: row.date ?? "",
      empreendimento_id: String(row.empreendimento_id ?? row.empreendimento?.id ?? ""),
      talhao_id: String(row.talhao_id ?? row.talhao?.id ?? ""),
      pluviometro_id: row.pluviometro_id || "",
      tipo: (row.tipo as ChuvaTipo) || "chuva",
      volume_mm: String(row.volume_mm ?? "0")
    });
    setStep(0);
    setOpenForm(true);
  }

  async function save() {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    if (!form.empreendimento_id) {
      setError("Selecione o empreendimento.");
      return;
    }
    if (!form.talhao_id) {
      setError("Selecione o talhão.");
      return;
    }
    if (!form.pluviometro_id.trim()) {
      setError("Informe o ID do pluviômetro.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        date: form.date || null,
        empreendimento_id: form.empreendimento_id,
        talhao_id: Number(form.talhao_id),
        pluviometro_id: form.pluviometro_id.trim().toUpperCase(),
        tipo: form.tipo,
        volume_mm: n(form.volume_mm)
      };
      if (editingId) {
        await updateChuva(token, editingId, payload);
      } else {
        await createChuva(token, payload);
      }
      await refresh();
      setOpenForm(false);
      setStep(0);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao salvar chuva.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const token = getAccessToken();
    if (!token || !deleteId) return;
    try {
      await deleteChuva(token, deleteId);
      setDeleteId(null);
      await refresh();
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao excluir chuva.");
    }
  }

  const formClassificacao = classificarChuva(n(form.volume_mm));
  const talhoesByEmpreendimento = useMemo(() => {
    const e = empreendimentos.find((x) => String(x.id) === form.empreendimento_id);
    const ids = new Set<number>();
    for (const it of e?.items || []) {
      const id = it.talhao_id ?? it.talhao?.id;
      if (id) ids.add(id);
    }
    if (!ids.size) return talhoes;
    return talhoes.filter((t) => ids.has(t.id));
  }, [empreendimentos, form.empreendimento_id, talhoes]);

  useEffect(() => {
    if (!form.talhao_id) return;
    const exists = talhoesByEmpreendimento.some((t) => String(t.id) === form.talhao_id);
    if (!exists) {
      setForm((prev) => ({ ...prev, talhao_id: "" }));
    }
  }, [form.talhao_id, talhoesByEmpreendimento]);

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-5">
          <section className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Produção</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Chuvas</h1>
              <p className="mt-1 text-sm text-zinc-300">Registro e monitoramento de volume de chuva por empreendimento.</p>
            </div>
            <section className="w-full rounded-3xl border border-white/15 bg-zinc-900/55 p-3.5 xl:w-auto xl:min-w-[420px]">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Relatórios</p>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => window.print()} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10">Resumo</button>
                <button onClick={() => window.print()} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10">Analítico</button>
                <button onClick={openCreate} className="rounded-2xl bg-accent-500 px-4 py-2.5 text-xs font-black text-zinc-950 hover:bg-accent-400">Nova chuva</button>
              </div>
            </section>
          </section>

          {error ? <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}

          <section className="rounded-3xl border border-white/10 bg-white/5 p-3.5">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
              <select value={safraFilter} onChange={(e) => setSafraFilter(e.target.value)} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none focus:border-white/30">
                <option value="" style={optionStyle}>Safra</option>
                {safras.map((s) => <option key={s.id} value={String(s.id)} style={optionStyle}>{s.name}</option>)}
              </select>
              <select value={empreendimentoFilter} onChange={(e) => setEmpreendimentoFilter(e.target.value)} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none focus:border-white/30">
                <option value="" style={optionStyle}>Empreendimento</option>
                {filteredEmpreendimentos.map((e) => <option key={e.id} value={String(e.id)} style={optionStyle}>{e.code || e.id}</option>)}
              </select>
              <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none focus:border-white/30">
                <option value="" style={optionStyle}>Tipo</option>
                {TIPOS.map((t) => <option key={t.value} value={t.value} style={optionStyle}>{t.label}</option>)}
              </select>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none focus:border-white/30" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none focus:border-white/30" />
              <button onClick={() => { setSafraFilter(""); setEmpreendimentoFilter(""); setTipoFilter(""); setDateFrom(""); setDateTo(""); }} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10">Limpar</button>
            </div>
          </section>

          <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-sky-400/30 bg-sky-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Volume acumulado</p>
              <p className="mt-2 text-2xl font-black text-white">{fmtMm(acumuladoMm)}</p>
            </div>
            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Classificação</p>
              <p className="mt-2 text-2xl font-black text-white">{classificacao}</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Registros</p>
              <p className="mt-2 text-2xl font-black text-white">{filtered.length}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[14px] font-black text-white">Linha de chuva acumulada</p>
              <p className="text-xs font-semibold text-zinc-400">{chartDates.length} ponto(s)</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              {linhasPorEmpreendimento.length && chartDates.length ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {linhasPorEmpreendimento.map((line, idx) => (
                      <div key={line.id} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: lineColors[idx % lineColors.length] }}
                        />
                        <span className="text-[10px] font-semibold text-zinc-200">{line.code}</span>
                      </div>
                    ))}
                  </div>

                  <svg viewBox="0 0 100 40" className="h-48 w-full">
                    {linhasPorEmpreendimento.map((line, idx) => {
                      const color = lineColors[idx % lineColors.length];
                      return (
                        <g key={line.id}>
                          <polyline
                            fill="none"
                            stroke={color}
                            strokeWidth="0.95"
                            points={line.points
                              .map((p, i) => {
                                const x = chartDates.length > 1 ? (i / (chartDates.length - 1)) * 100 : 50;
                                const y = 32 - (p.value / maxSerie) * 26;
                                return `${x},${y}`;
                              })
                              .join(" ")}
                          />
                          {line.points.map((p, i) => {
                            const x = chartDates.length > 1 ? (i / (chartDates.length - 1)) * 100 : 50;
                            const y = 32 - (p.value / maxSerie) * 26;
                            return (
                              <g key={`${line.id}-${p.date}-${i}`}>
                                <circle cx={x} cy={y} r="0.65" fill={color} />
                                <text x={x} y={Math.max(2, y - 1.8)} textAnchor="middle" fontSize="1.9" fill={color}>
                                  {fmtDateShort(p.date)} • {Math.round(p.value)}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Sem dados para o período.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[14px] font-black text-white">Lista</p>
              <p className="text-xs font-semibold text-zinc-400">{filtered.length} item(ns)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-y border-white/10 text-[10px] uppercase tracking-[0.22em] text-zinc-400">
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Empreendimento</th>
                    <th className="px-3 py-2 text-left">Talhão</th>
                    <th className="px-3 py-2 text-left">Pluviômetro</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-right">Volume (mm)</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-white/10 text-zinc-100">
                      <td className="px-3 py-2">{r.date ? formatDateBR(new Date(`${r.date}T00:00:00`)) : "-"}</td>
                      <td className="px-3 py-2">{r.empreendimento?.code || "-"}</td>
                      <td className="px-3 py-2">{r.talhao?.name || "-"}</td>
                      <td className="px-3 py-2">{r.pluviometro_id || "-"}</td>
                      <td className="px-3 py-2">{TIPOS.find((t) => t.value === r.tipo)?.label || r.tipo}</td>
                      <td className="px-3 py-2 text-right">{n(r.volume_mm).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(r)} className="rounded-lg border border-sky-400/35 bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-200">Editar</button>
                          <button onClick={() => setDeleteId(r.id)} className="rounded-lg border border-rose-400/35 bg-rose-500/15 px-2 py-1 text-[11px] font-semibold text-rose-200">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {openForm ? (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-3 backdrop-blur-sm">
              <div className="w-full max-w-4xl rounded-3xl border border-white/15 bg-zinc-950/95">
                <div className="border-b border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-black text-white">{editingId ? "Editar chuva" : "Nova chuva"}</p>
                      <p className="text-sm text-zinc-400">Etapa {step + 1} de 3</p>
                    </div>
                    <button onClick={() => setOpenForm(false)} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100">Fechar</button>
                  </div>
                </div>
                <div className="space-y-4 p-4">
                  <div className="grid gap-2 md:grid-cols-3">
                    {["Dados", "Leitura", "Resumo"].map((label, i) => (
                      <button key={label} onClick={() => setStep(i)} className={`rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] ${step === i ? "border-accent-400/40 bg-accent-500/20 text-accent-200" : "border-white/15 bg-white/5 text-zinc-400"}`}>{label}</button>
                    ))}
                  </div>

                  {step === 0 ? (
                    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Data</p>
                        <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-400" />
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Empreendimento</p>
                        <select value={form.empreendimento_id} onChange={(e) => setForm((p) => ({ ...p, empreendimento_id: e.target.value, talhao_id: "" }))} className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-400">
                          <option value="" style={optionStyle}>Selecione</option>
                          {empreendimentos.map((e) => <option key={e.id} value={String(e.id)} style={optionStyle}>{e.code || e.id}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Talhão</p>
                        <select value={form.talhao_id} onChange={(e) => setForm((p) => ({ ...p, talhao_id: e.target.value }))} className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-400">
                          <option value="" style={optionStyle}>Selecione</option>
                          {talhoesByEmpreendimento.map((t) => <option key={t.id} value={String(t.id)} style={optionStyle}>{t.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">ID Pluviômetro</p>
                        <input value={form.pluviometro_id} onChange={(e) => setForm((p) => ({ ...p, pluviometro_id: e.target.value }))} placeholder="Ex: PLV-T1-01" className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold uppercase text-zinc-100 outline-none focus:border-accent-400" />
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Tipo</p>
                        <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as ChuvaTipo }))} className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-400">
                          {TIPOS.map((t) => <option key={t.value} value={t.value} style={optionStyle}>{t.label}</option>)}
                        </select>
                      </div>
                    </section>
                  ) : null}

                  {step === 1 ? (
                    <section className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Volume de chuva (mm)</p>
                        <input type="number" min={0} step="0.1" value={form.volume_mm} onChange={(e) => setForm((p) => ({ ...p, volume_mm: e.target.value }))} className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-400" />
                      </div>
                      <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Classificação da leitura</p>
                        <p className="mt-2 text-xl font-black text-white">{formClassificacao}</p>
                        <p className="mt-1 text-xs text-zinc-300">{fmtMm(n(form.volume_mm))}</p>
                      </div>
                    </section>
                  ) : null}

                  {step === 2 ? (
                    <section className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-200">
                      <p><strong>Data:</strong> {form.date ? formatDateBR(new Date(`${form.date}T00:00:00`)) : "-"}</p>
                      <p><strong>Empreendimento:</strong> {empreendimentos.find((e) => String(e.id) === form.empreendimento_id)?.code || "-"}</p>
                      <p><strong>Talhão:</strong> {talhoes.find((t) => String(t.id) === form.talhao_id)?.name || "-"}</p>
                      <p><strong>Pluviômetro:</strong> {form.pluviometro_id || "-"}</p>
                      <p><strong>Tipo:</strong> {TIPOS.find((t) => t.value === form.tipo)?.label || form.tipo}</p>
                      <p><strong>Volume:</strong> {fmtMm(n(form.volume_mm))}</p>
                      <p><strong>Classificação:</strong> {formClassificacao}</p>
                    </section>
                  ) : null}
                </div>

                <div className="flex items-center justify-between border-t border-white/10 p-4">
                  <button onClick={() => setOpenForm(false)} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100">Cancelar</button>
                  <div className="flex items-center gap-2">
                    <button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 disabled:opacity-40">Voltar</button>
                    {step < 2 ? (
                      <button onClick={() => setStep((s) => Math.min(2, s + 1))} className="rounded-2xl bg-accent-500 px-4 py-2 text-sm font-black text-zinc-950">Próximo</button>
                    ) : (
                      <button disabled={saving} onClick={save} className="rounded-2xl bg-accent-500 px-4 py-2 text-sm font-black text-zinc-950 disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {deleteId ? (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-3 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-3xl border border-rose-400/30 bg-zinc-950/95 p-4">
                <p className="text-xl font-black text-white">Excluir registro de chuva</p>
                <p className="mt-2 text-sm text-zinc-300">Essa ação remove o lançamento de chuva de forma permanente.</p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button onClick={() => setDeleteId(null)} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100">Cancelar</button>
                  <button onClick={remove} className="rounded-2xl border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-sm font-black text-rose-200">Confirmar exclusão</button>
                </div>
              </div>
            </div>
          ) : null}

          {loading ? <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">Carregando...</div> : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}
