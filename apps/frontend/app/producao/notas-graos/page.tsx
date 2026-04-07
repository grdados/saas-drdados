"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  NotaFiscalGraosApi,
  Safra,
  createNotaGraos,
  isApiError,
  listNotasGraos,
  listSafras
} from "@/lib/api";
import { formatCurrencyBRL, formatDateBR } from "@/lib/locale";

function n(v: unknown) {
  const x = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

function fmtDate(v: string | null) {
  if (!v) return "-";
  const dt = new Date(`${v}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return v;
  return formatDateBR(dt);
}

function money(v: number) {
  return formatCurrencyBRL(v);
}

type SaidaModal = {
  open: boolean;
  tipo: "devolucao" | "venda";
  ref: NotaFiscalGraosApi | null;
  form: {
    date: string;
    due_date: string;
    number: string;
    quantity_kg: string;
    price: string;
    discount: string;
  };
};

const STATUS_OPTIONS = [
  { value: "", label: "Status" },
  { value: "pendente", label: "Pendente" },
  { value: "vencido", label: "Vencido" },
  { value: "recebido", label: "Recebido" },
  { value: "em_deposito", label: "Em deposito" },
  { value: "a_fixar", label: "A fixar" },
  { value: "fixado_parcial", label: "Fixado parcial" },
  { value: "fixado", label: "Fixado" }
];

const FINALIDADE_OPTIONS = [
  { value: "", label: "Finalidade" },
  { value: "remessa_deposito", label: "Remessa deposito" },
  { value: "a_fixar", label: "A fixar" },
  { value: "devolucao", label: "Devolucao" },
  { value: "venda", label: "Venda" }
];

export default function NotasGraosPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notas, setNotas] = useState<NotaFiscalGraosApi[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [q, setQ] = useState("");
  const [fSafra, setFSafra] = useState<number | "">("");
  const [fTipo, setFTipo] = useState<"" | "entrada" | "saida">("");
  const [fFinalidade, setFFinalidade] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fProdutor, setFProdutor] = useState<number | "">("");
  const [fCliente, setFCliente] = useState<number | "">("");
  const [fProduto, setFProduto] = useState<number | "">("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [saida, setSaida] = useState<SaidaModal>({
    open: false,
    tipo: "devolucao",
    ref: null,
    form: { date: "", due_date: "", number: "", quantity_kg: "", price: "0", discount: "0" }
  });

  async function reload() {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const [nf, sf] = await Promise.all([listNotasGraos(token), listSafras(token)]);
    setNotas(nf);
    setSafras(sf);
  }

  useEffect(() => {
    async function run() {
      const token = getAccessToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }
      setLoading(true);
      setError("");
      try {
        await reload();
      } catch (err) {
        if (isApiError(err) && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Falha ao carregar notas de graos.");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  const produtores = useMemo(() => {
    const map = new Map<number, string>();
    for (const nf of notas) {
      if (nf.produtor?.id) map.set(nf.produtor.id, nf.produtor.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [notas]);

  const clientes = useMemo(() => {
    const map = new Map<number, string>();
    for (const nf of notas) {
      if (nf.cliente?.id) map.set(nf.cliente.id, nf.cliente.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [notas]);

  const produtos = useMemo(() => {
    const map = new Map<number, string>();
    for (const nf of notas) {
      if (nf.produto?.id) map.set(nf.produto.id, nf.produto.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [notas]);

  const saidasByEntrada = useMemo(() => {
    const map = new Map<number, NotaFiscalGraosApi[]>();
    for (const nf of notas) {
      if (nf.tipo !== "saida") continue;
      const refId = nf.nota_entrada_ref?.id ?? nf.nota_entrada_ref_id ?? null;
      if (!refId) continue;
      const arr = map.get(refId) ?? [];
      arr.push(nf);
      map.set(refId, arr);
    }
    return map;
  }, [notas]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return notas.filter((nf) => {
      const safraId = nf.safra?.id ?? nf.safra_id ?? null;
      const produtorId = nf.produtor?.id ?? nf.produtor_id ?? null;
      const clienteId = nf.cliente?.id ?? nf.cliente_id ?? null;
      const produtoId = nf.produto?.id ?? nf.produto_id ?? null;
      if (fSafra !== "" && safraId !== Number(fSafra)) return false;
      if (fProdutor !== "" && produtorId !== Number(fProdutor)) return false;
      if (fCliente !== "" && clienteId !== Number(fCliente)) return false;
      if (fProduto !== "" && produtoId !== Number(fProduto)) return false;
      if (fTipo && nf.tipo !== fTipo) return false;
      if (fFinalidade && nf.finalidade !== fFinalidade) return false;
      if (fStatus && nf.status !== fStatus) return false;
      if (fDateFrom && (nf.date || "") < fDateFrom) return false;
      if (fDateTo && (nf.date || "") > fDateTo) return false;
      if (!needle) return true;
      const blob =
        `${nf.number} ${nf.romaneio?.code || ""} ${nf.safra?.name || ""} ${nf.produtor?.name || ""} ${nf.cliente?.name || ""} ${nf.produto?.name || ""} ${nf.finalidade} ${nf.status}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [
    notas,
    q,
    fSafra,
    fProdutor,
    fCliente,
    fProduto,
    fTipo,
    fFinalidade,
    fStatus,
    fDateFrom,
    fDateTo
  ]);

  const cards = useMemo(() => {
    const entradas = filtered.filter((x) => x.tipo === "entrada");
    const saidas = filtered.filter((x) => x.tipo === "saida");
    return {
      entradas: entradas.length,
      saidas: saidas.length,
      volumeEntrada: entradas.reduce((a, x) => a + n(x.quantity_kg), 0),
      volumeSaida: saidas.reduce((a, x) => a + n(x.quantity_kg), 0),
      vendas: saidas.filter((x) => x.finalidade === "venda").reduce((a, x) => a + n(x.total_value), 0)
    };
  }, [filtered]);

  function openSaida(tipo: "devolucao" | "venda", ref: NotaFiscalGraosApi) {
    const today = new Date().toISOString().slice(0, 10);
    setError("");
    setSuccess("");
    setSaida({
      open: true,
      tipo,
      ref,
      form: {
        date: today,
        due_date: today,
        number: "",
        quantity_kg: "",
        price: n(ref.price) > 0 ? String(n(ref.price)) : "0",
        discount: "0"
      }
    });
  }

  async function saveSaida() {
    if (!saida.ref) return;
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const qty = Math.max(n(saida.form.quantity_kg), 0);
    if (!saida.form.date || !saida.form.number.trim()) {
      setError("Preencha Data e Nota Fiscal.");
      return;
    }
    if (qty <= 0) {
      setError("Quantidade deve ser maior que zero.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await createNotaGraos(token, {
        tipo: "saida",
        finalidade: saida.tipo,
        status: "pendente",
        date: saida.form.date,
        due_date: saida.tipo === "venda" ? saida.form.due_date || null : null,
        number: saida.form.number.trim().toUpperCase(),
        nota_entrada_ref_id: saida.ref.id,
        romaneio_id: saida.ref.romaneio?.id ?? saida.ref.romaneio_id ?? null,
        safra_id: saida.ref.safra?.id ?? saida.ref.safra_id ?? null,
        produtor_id: saida.ref.produtor?.id ?? saida.ref.produtor_id ?? null,
        cliente_id: saida.ref.cliente?.id ?? saida.ref.cliente_id ?? null,
        produto_id: saida.ref.produto?.id ?? saida.ref.produto_id ?? null,
        deposito_id: saida.ref.deposito?.id ?? saida.ref.deposito_id ?? null,
        operacao_id: saida.ref.operacao?.id ?? saida.ref.operacao_id ?? null,
        quantity_kg: qty,
        price: Math.max(n(saida.form.price), 0),
        discount: Math.max(n(saida.form.discount), 0)
      });
      await reload();
      setSaida((p) => ({ ...p, open: false, ref: null }));
      setSuccess(
        saida.tipo === "venda"
          ? "Saida de venda registrada. Contas a receber e fluxo de caixa foram atualizados."
          : "Saida de devolucao registrada com sucesso."
      );
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao criar NF de saida.");
    } finally {
      setSaving(false);
    }
  }

  function clearFilters() {
    setQ("");
    setFSafra("");
    setFProdutor("");
    setFCliente("");
    setFProduto("");
    setFTipo("");
    setFFinalidade("");
    setFStatus("");
    setFDateFrom("");
    setFDateTo("");
  }

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-5">
          <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Producao</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Notas de Graos</h1>
              <p className="mt-1 text-sm text-zinc-300">Historico completo de entradas e saidas, com devolucao e venda.</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-zinc-900/55 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Relatorios</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <button className="min-h-[34px] rounded-2xl border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-zinc-100">
                  Resumo
                </button>
                <button className="min-h-[34px] rounded-2xl border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-zinc-100">
                  Analitico
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-3.5">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-7">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar nota, romaneio, produtor, cliente, produto..."
                className="xl:col-span-2 rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-500"
              />
              <select
                value={fSafra}
                onChange={(e) => setFSafra(e.target.value === "" ? "" : Number(e.target.value))}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"
              >
                <option value="">Safra</option>
                {safras.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={fProdutor}
                onChange={(e) => setFProdutor(e.target.value === "" ? "" : Number(e.target.value))}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"
              >
                <option value="">Produtor</option>
                {produtores.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
              <select
                value={fCliente}
                onChange={(e) => setFCliente(e.target.value === "" ? "" : Number(e.target.value))}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"
              >
                <option value="">Cliente</option>
                {clientes.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
              <select
                value={fProduto}
                onChange={(e) => setFProduto(e.target.value === "" ? "" : Number(e.target.value))}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"
              >
                <option value="">Produto</option>
                {produtos.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2.5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-6">
              <select
                value={fTipo}
                onChange={(e) => setFTipo((e.target.value as "" | "entrada" | "saida") || "")}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"
              >
                <option value="">Tipo</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saida</option>
              </select>
              <select
                value={fFinalidade}
                onChange={(e) => setFFinalidade(e.target.value)}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"
              >
                {FINALIDADE_OPTIONS.map((it) => (
                  <option key={it.value || "all"} value={it.value}>
                    {it.label}
                  </option>
                ))}
              </select>
              <select
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value)}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100"
              >
                {STATUS_OPTIONS.map((it) => (
                  <option key={it.value || "all"} value={it.value}>
                    {it.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={fDateFrom}
                onChange={(e) => setFDateFrom(e.target.value)}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100 [color-scheme:dark]"
              />
              <input
                type="date"
                value={fDateTo}
                onChange={(e) => setFDateTo(e.target.value)}
                className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[13px] text-zinc-100 [color-scheme:dark]"
              />
              <button
                onClick={clearFilters}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-medium text-zinc-200"
              >
                Limpar
              </button>
            </div>
          </section>

          <section className="grid gap-2.5 md:grid-cols-5">
            <div className="rounded-3xl border border-white/15 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Entradas</p>
              <p className="mt-1 text-2xl font-black text-white">{cards.entradas}</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Saidas</p>
              <p className="mt-1 text-2xl font-black text-white">{cards.saidas}</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Volume entrada (KG)</p>
              <p className="mt-1 text-2xl font-black text-white">
                {cards.volumeEntrada.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Volume saida (KG)</p>
              <p className="mt-1 text-2xl font-black text-white">
                {cards.volumeSaida.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Vendas</p>
              <p className="mt-1 text-2xl font-black text-emerald-200">{money(cards.vendas)}</p>
            </div>
          </section>

          {error ? (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              {success}
            </div>
          ) : null}

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Historico de notas</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
            </div>
            <div className="mt-3 overflow-x-auto">
              <div className="hidden grid-cols-[74px_74px_110px_102px_92px_92px_1fr_1fr_130px_100px_120px_220px] gap-2 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 xl:grid">
                <div>Data</div>
                <div>Tipo</div>
                <div>Finalidade</div>
                <div>Status</div>
                <div>Nota</div>
                <div>Romaneio</div>
                <div>Produtor</div>
                <div>Cliente</div>
                <div>Produto</div>
                <div>Qtd KG</div>
                <div>Valor</div>
                <div className="text-right">Acoes</div>
              </div>
              <div className="mt-2 space-y-2">
                {filtered.map((nf) => {
                  const isEntrada = nf.tipo === "entrada";
                  const consumos = saidasByEntrada.get(nf.id) ?? [];
                  const used = consumos.reduce((acc, x) => acc + n(x.quantity_kg), 0);
                  const saldo = Math.max(n(nf.quantity_kg) - used, 0);
                  return (
                    <div key={nf.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2.5">
                      <div className="grid grid-cols-1 gap-2 xl:grid-cols-[74px_74px_110px_102px_92px_92px_1fr_1fr_130px_100px_120px_220px] xl:items-center xl:gap-2">
                        <div className="text-xs text-zinc-100">{fmtDate(nf.date)}</div>
                        <div className="text-xs text-zinc-100">{isEntrada ? "Entrada" : "Saida"}</div>
                        <div className="text-xs text-zinc-100">{nf.finalidade}</div>
                        <div className="text-xs text-zinc-100">{nf.status}</div>
                        <div className="truncate text-xs text-zinc-100">{nf.number || "-"}</div>
                        <div className="truncate text-xs text-zinc-100">{nf.romaneio?.code || "-"}</div>
                        <div className="truncate text-xs text-zinc-100">{nf.produtor?.name || "-"}</div>
                        <div className="truncate text-xs text-zinc-100">{nf.cliente?.name || "-"}</div>
                        <div className="truncate text-xs text-zinc-100">{nf.produto?.name || "-"}</div>
                        <div className="text-xs text-zinc-100">
                          {n(nf.quantity_kg).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-zinc-100">{money(n(nf.total_value))}</div>
                        <div className="flex justify-end gap-2">
                          {isEntrada ? (
                            <>
                              <button
                                onClick={() => openSaida("devolucao", nf)}
                                disabled={saldo <= 0}
                                className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200 disabled:opacity-40"
                              >
                                Devolver
                              </button>
                              <button
                                onClick={() => openSaida("venda", nf)}
                                disabled={saldo <= 0}
                                className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-40"
                              >
                                Vender
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-zinc-500">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {saida.open && saida.ref ? (
            <div className="fixed inset-0 z-[80] grid place-items-center px-4">
              <button
                className="absolute inset-0 bg-zinc-950/75"
                onClick={() => setSaida((p) => ({ ...p, open: false, ref: null }))}
              />
              <div className="relative w-full max-w-3xl rounded-3xl border border-white/15 bg-zinc-900/95 p-5 shadow-2xl">
                <p className="text-lg font-black text-white">{saida.tipo === "devolucao" ? "Nova devolucao" : "Nova venda"}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  NF entrada {saida.ref.number} - Romaneio {saida.ref.romaneio?.code || "-"}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Data</label>
                    <input
                      type="date"
                      value={saida.form.date}
                      onChange={(e) => setSaida((p) => ({ ...p, form: { ...p.form, date: e.target.value } }))}
                      className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark]"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Nota Fiscal</label>
                    <input
                      value={saida.form.number}
                      onChange={(e) =>
                        setSaida((p) => ({ ...p, form: { ...p.form, number: e.target.value.toUpperCase() } }))
                      }
                      className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Quantidade KG</label>
                    <input
                      value={saida.form.quantity_kg}
                      onChange={(e) => setSaida((p) => ({ ...p, form: { ...p.form, quantity_kg: e.target.value } }))}
                      className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-right text-sm text-zinc-100"
                    />
                  </div>
                  {saida.tipo === "venda" ? (
                    <>
                      <div className="grid gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Vencimento</label>
                        <input
                          type="date"
                          value={saida.form.due_date}
                          onChange={(e) => setSaida((p) => ({ ...p, form: { ...p.form, due_date: e.target.value } }))}
                          className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark]"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Preco</label>
                        <input
                          value={saida.form.price}
                          onChange={(e) => setSaida((p) => ({ ...p, form: { ...p.form, price: e.target.value } }))}
                          className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-right text-sm text-zinc-100"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Desconto</label>
                        <input
                          value={saida.form.discount}
                          onChange={(e) => setSaida((p) => ({ ...p, form: { ...p.form, discount: e.target.value } }))}
                          className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-right text-sm text-zinc-100"
                        />
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setSaida((p) => ({ ...p, open: false, ref: null }))}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-zinc-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveSaida}
                    disabled={saving}
                    className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-100 disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Salvar saida"}
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
