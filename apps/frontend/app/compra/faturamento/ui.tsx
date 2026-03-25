"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  createFaturamentoCompra,
  FaturamentoCompra,
  isApiError,
  listFaturamentosCompra,
  listFornecedoresGerencial,
  listGruposProdutores,
  listInsumos,
  listOperacoes,
  listPedidosCompra,
  listProdutores,
  listSafras,
  Operacao,
  PedidoCompra,
  Produtor,
  Safra
} from "@/lib/api";
import { toUpperText } from "@/lib/text";

function toApiDecimal(v: unknown) {
  const raw = String(v ?? "").trim();
  if (!raw) return "0";
  const s = raw.replace(/\s+/g, "");
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) return s.replace(/\./g, "").replace(",", ".");
  if (hasComma) return s.replace(",", ".");
  return s;
}

function parseNumber(v: unknown) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysBetween(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.max(0, Math.round((db - da) / ms));
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function SimpleLineChart({ points }: { points: Array<{ label: string; value: number }> }) {
  const w = 720;
  const h = 170;
  const pad = 12;
  const max = Math.max(1, ...points.map((p) => p.value));

  const poly = points
    .map((p, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
      const y = pad + (1 - p.value / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
        <defs>
          <linearGradient id="fillA" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(223,152,48,0.22)" />
            <stop offset="1" stopColor="rgba(223,152,48,0)" />
          </linearGradient>
        </defs>
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <line key={t} x1="0" x2={w} y1={h * t} y2={h * t} stroke="rgba(255,255,255,0.06)" />
        ))}
        <polyline points={poly} fill="none" stroke="rgba(223,152,48,0.95)" strokeWidth="3" />
        <polygon points={`${poly} ${w - pad},${h - pad} ${pad},${h - pad}`} fill="url(#fillA)" />
      </svg>
    </div>
  );
}

function BarList({ title, items }: { title: string; items: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
      <p className="text-sm font-black text-white">{title}</p>
      <div className="mt-4 space-y-2">
        {items.slice(0, 8).map((it) => (
          <div key={it.label} className="rounded-2xl border border-white/10 bg-zinc-950/35 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-zinc-100">{it.label}</p>
              <p className="text-sm font-black text-zinc-100">{money(it.value)}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-accent-500/80" style={{ width: `${Math.round((it.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
        {items.length === 0 ? <p className="text-sm text-zinc-400">Sem dados.</p> : null}
      </div>
    </section>
  );
}

export default function FaturamentoCompraPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [safras, setSafras] = useState<Safra[]>([]);
  const [safraId, setSafraId] = useState<number | "">("");

  const [fats, setFats] = useState<FaturamentoCompra[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [grupos, setGrupos] = useState<Array<{ id: number; name: string }>>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [fornecedores, setFornecedores] = useState<Array<{ id: number; name: string }>>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [insumos, setInsumos] = useState<Array<{ id: number; name: string; categoria?: { id: number; name: string } | null }>>([]);

  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formNF, setFormNF] = useState("");
  const [formGrupoId, setFormGrupoId] = useState<number | "">("");
  const [formProdutorId, setFormProdutorId] = useState<number | "">("");
  const [formPedidoId, setFormPedidoId] = useState<number | "">("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formFornecedorId, setFormFornecedorId] = useState<number | "">("");
  const [formOperacaoId, setFormOperacaoId] = useState<number | "">("");
  const [rows, setRows] = useState<Array<{ pedido_item_id: number | null; quantity: string; price: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const pedidosDaSafra = useMemo(() => {
    if (safraId === "") return pedidos;
    const sid = Number(safraId);
    return pedidos.filter((p) => p.safra?.id === sid);
  }, [pedidos, safraId]);

  const fatsDaSafra = useMemo(() => {
    if (safraId === "") return fats;
    const sid = Number(safraId);
    const pedidoById = new Map(pedidos.map((p) => [p.id, p]));
    return fats.filter((f) => {
      const pid = f.pedido?.id ?? null;
      if (!pid) return false;
      const p = pedidoById.get(pid);
      return p?.safra?.id === sid;
    });
  }, [fats, pedidos, safraId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return fatsDaSafra;
    return fatsDaSafra.filter((f) => {
      return (
        (f.invoice_number || "").toLowerCase().includes(needle) ||
        (f.fornecedor?.name ?? "").toLowerCase().includes(needle) ||
        (f.produtor?.name ?? "").toLowerCase().includes(needle) ||
        (f.pedido?.code ?? "").toLowerCase().includes(needle)
      );
    });
  }, [fatsDaSafra, q]);

  const produtoresDoGrupo = useMemo(() => {
    if (formGrupoId === "") return produtores;
    const gid = Number(formGrupoId);
    return produtores.filter((p) => (p.grupo?.id ?? null) === gid);
  }, [produtores, formGrupoId]);

  const pedidosDoProdutor = useMemo(() => {
    if (formProdutorId === "") return pedidosDaSafra;
    const pid = Number(formProdutorId);
    return pedidosDaSafra.filter((p) => (p.produtor?.id ?? null) === pid);
  }, [pedidosDaSafra, formProdutorId]);

  const pedidoSelecionado = useMemo(() => {
    if (formPedidoId === "") return null;
    const id = Number(formPedidoId);
    return pedidos.find((p) => p.id === id) ?? null;
  }, [pedidos, formPedidoId]);

  const itensPendentes = useMemo(() => {
    const p = pedidoSelecionado;
    if (!p) return [];
    return (p.items || [])
      .map((it) => {
        const qty = parseNumber(it.quantity);
        const rec = parseNumber(it.received_quantity ?? "0");
        const remaining = Math.max(0, qty - rec);
        return { ...it, remaining };
      })
      .filter((it) => it.remaining > 0);
  }, [pedidoSelecionado]);

  const operacoesDespesa = useMemo(() => {
    return [...operacoes].filter((o) => o.kind === "debit").sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [operacoes]);

  const total = useMemo(() => rows.reduce((acc, r) => acc + Math.max(0, parseNumber(r.quantity) * parseNumber(r.price)), 0), [rows]);

  const cards = useMemo(() => {
    const totalFat = fatsDaSafra.reduce((acc, f) => acc + parseNumber(f.total_value), 0);
    const notas = fatsDaSafra.length;
    const ticket = notas ? totalFat / notas : 0;
    const pedidosUnicos = new Set(fatsDaSafra.map((f) => f.pedido?.id).filter(Boolean) as number[]);
    return [
      { label: "Total faturado", value: money(totalFat), note: `${notas} NF(s)` },
      { label: "Ticket médio", value: money(ticket), note: "Por nota" },
      { label: "Pedidos", value: String(pedidosUnicos.size), note: "Com faturamento" }
    ];
  }, [fatsDaSafra]);

  const temporalPoints = useMemo(() => {
    const s = safras.find((x) => x.id === (safraId === "" ? -1 : Number(safraId))) ?? null;
    const start = s?.start_date ? new Date(s.start_date) : null;
    const end = s?.end_date ? new Date(s.end_date) : null;

    const map = new Map<string, number>();
    for (const f of fatsDaSafra) {
      const d = f.date ? new Date(f.date) : null;
      if (!d) continue;
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + parseNumber(f.total_value));
    }

    if (!start || !end) {
      const keys = [...map.keys()].sort();
      return keys.slice(-14).map((k) => ({ label: k.slice(5), value: map.get(k) ?? 0 }));
    }

    const len = daysBetween(start, end);
    const step = Math.max(1, Math.ceil((len + 1) / 20));
    const pts: Array<{ label: string; value: number }> = [];
    for (let i = 0; i <= len; i += step) {
      const d = addDays(start, i);
      const key = d.toISOString().slice(0, 10);
      pts.push({ label: key.slice(5), value: map.get(key) ?? 0 });
    }
    return pts;
  }, [fatsDaSafra, safras, safraId]);

  const byFornecedor = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fatsDaSafra) m.set(f.fornecedor?.name ?? "SEM FORNECEDOR", (m.get(f.fornecedor?.name ?? "SEM FORNECEDOR") ?? 0) + parseNumber(f.total_value));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [fatsDaSafra]);

  const byProdutor = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fatsDaSafra) m.set(f.produtor?.name ?? "SEM PRODUTOR", (m.get(f.produtor?.name ?? "SEM PRODUTOR") ?? 0) + parseNumber(f.total_value));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [fatsDaSafra]);

  const byCategoria = useMemo(() => {
    const catByInsumoId = new Map<number, string>();
    for (const i of insumos) catByInsumoId.set(i.id, i.categoria?.name ?? "SEM CATEGORIA");
    const m = new Map<string, number>();
    for (const f of fatsDaSafra) {
      for (const it of f.items || []) {
        const pid = it.produto?.id ?? null;
        const cat = pid ? catByInsumoId.get(pid) ?? "SEM CATEGORIA" : "SEM CATEGORIA";
        m.set(cat, (m.get(cat) ?? 0) + parseNumber(it.total_item));
      }
    }
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [fatsDaSafra, insumos]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const [sf, fat, ped, grp, pro, forn, ope, ins] = await Promise.all([
        listSafras(token),
        listFaturamentosCompra(token),
        listPedidosCompra(token),
        listGruposProdutores(token),
        listProdutores(token),
        listFornecedoresGerencial(token),
        listOperacoes(token),
        listInsumos(token)
      ]);
      setSafras(sf);
      setFats(fat);
      setPedidos(ped);
      setGrupos(grp);
      setProdutores(pro);
      setFornecedores(forn);
      setOperacoes(ope);
      setInsumos(ins as unknown as typeof insumos);
      if (sf.length && safraId === "") setSafraId(sf[0].id);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao carregar faturamento.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPickPedido(nextId: number | "") {
    setFormPedidoId(nextId);
    const p = nextId === "" ? null : pedidos.find((x) => x.id === nextId) ?? null;
    if (!p) return;
    setFormDueDate(p.due_date ?? "");
    setFormFornecedorId(p.fornecedor?.id ?? "");
    setFormOperacaoId(p.operacao?.id ?? "");
    setFormGrupoId(p.grupo?.id ?? "");
    setFormProdutorId(p.produtor?.id ?? "");
    setRows([{ pedido_item_id: null, quantity: "0", price: "0" }]);
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        date: formDate || null,
        invoice_number: formNF.trim(),
        grupo_id: formGrupoId === "" ? null : Number(formGrupoId),
        produtor_id: formProdutorId === "" ? null : Number(formProdutorId),
        pedido_id: formPedidoId === "" ? null : Number(formPedidoId),
        fornecedor_id: formFornecedorId === "" ? null : Number(formFornecedorId),
        operacao_id: formOperacaoId === "" ? null : Number(formOperacaoId),
        due_date: formDueDate || null,
        items: rows.map((r) => ({ pedido_item_id: r.pedido_item_id, quantity: toApiDecimal(r.quantity), price: toApiDecimal(r.price) }))
      };
      const res = await createFaturamentoCompra(token, payload);
      setFats((prev) => [res, ...prev]);
      setOpen(false);
      await refresh();
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setSaveMessage(err instanceof Error ? err.message : "Falha ao salvar faturamento.");
    } finally {
      setSaving(false);
    }
  }

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Compra</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Faturamento</h1>
              <p className="mt-1 text-sm text-zinc-300">Nota fiscal de recebimento + geração automática em Contas a Pagar.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select value={safraId} onChange={(e) => setSafraId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full max-w-[320px] rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                <option value="" style={optionStyle}>
                  Selecione a safra
                </option>
                {safras.map((s) => (
                  <option key={s.id} value={s.id} style={optionStyle}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button onClick={() => { setOpen(true); setRows([{ pedido_item_id: null, quantity: "0", price: "0" }]); }} className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400">
                Novo faturamento
              </button>
            </div>
          </div>

          {error ? <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}

          <section className="grid gap-4 lg:grid-cols-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">{c.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{c.value}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-300">{c.note}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">Faturamento no período</p>
                <p className="mt-1 text-xs text-zinc-400">Linha temporal baseada na safra selecionada (início/fim).</p>
              </div>
              <div className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${fatsDaSafra.length} NF(s)`}</div>
            </div>
            <div className="mt-4">
              <SimpleLineChart points={temporalPoints} />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <BarList title="Por categoria" items={byCategoria} />
            <BarList title="Por fornecedor" items={byFornecedor} />
            <BarList title="Por produtor" items={byProdutor} />
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por NF, fornecedor, produtor ou pedido..." className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
            </div>
            <div className="mt-3 space-y-2">
              {filtered.map((f) => (
                <div key={f.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-4 py-3 hover:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{f.invoice_number || `#${f.id}`}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-400">
                        {f.fornecedor?.name ?? "-"} · {f.produtor?.name ?? "-"} · {f.date || "-"} · Pedido {f.pedido?.code ?? "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-zinc-100">{money(parseNumber(f.total_value))}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{f.due_date ? `Venc: ${f.due_date}` : ""}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && filtered.length === 0 ? <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">Nenhum faturamento encontrado.</div> : null}
            </div>
          </section>

          {open ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Fechar" />
              <div className="relative w-full max-w-[1100px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/85 shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <p className="text-sm font-black text-white">Novo faturamento</p>
                    <p className="mt-1 text-xs text-zinc-400">Formulario Pai e Itens (Filho).</p>
                  </div>
                  <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10" aria-label="Fechar modal" title="Fechar">
                    ×
                  </button>
                </div>
                <div className="max-h-[78vh] overflow-auto p-5">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data</label>
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50" />
                    </div>
                    <div className="grid gap-2 lg:col-span-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Nota fiscal</label>
                      <input value={formNF} onChange={(e) => setFormNF(toUpperText(e.target.value))} placeholder="Ex: 000123" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50" />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Grupo</label>
                      <select value={formGrupoId} onChange={(e) => { const next = e.target.value === "" ? "" : Number(e.target.value); setFormGrupoId(next); setFormProdutorId(""); setFormPedidoId(""); }} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {grupos.map((g) => (<option key={g.id} value={g.id} style={optionStyle}>{g.name}</option>))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produtor</label>
                      <select value={formProdutorId} onChange={(e) => { const next = e.target.value === "" ? "" : Number(e.target.value); setFormProdutorId(next); setFormPedidoId(""); }} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {produtoresDoGrupo.map((p) => (<option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Pedido</label>
                      <select value={formPedidoId} onChange={(e) => onPickPedido(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {pedidosDoProdutor.map((p) => (<option key={p.id} value={p.id} style={optionStyle}>{p.code || `#${p.id}`}</option>))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Vencimento</label>
                      <input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50" />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Fornecedor</label>
                      <select value={formFornecedorId} onChange={(e) => setFormFornecedorId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {fornecedores.map((f) => (<option key={f.id} value={f.id} style={optionStyle}>{f.name}</option>))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Operacao</label>
                      <select value={formOperacaoId} onChange={(e) => setFormOperacaoId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                        <option value="" style={optionStyle}>Selecione</option>
                        {operacoesDespesa.map((o) => (<option key={o.id} value={o.id} style={optionStyle}>{o.name}</option>))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-white">Itens</p>
                      <button onClick={() => setRows((prev) => [...prev, { pedido_item_id: null, quantity: "0", price: "0" }])} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-3 py-2 text-sm font-black text-emerald-100 hover:bg-emerald-500/20">
                        Adicionar
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {rows.map((r, idx) => {
                        const pi = itensPendentes.find((x) => x.id === r.pedido_item_id) ?? null;
                        const remaining = pi?.remaining ?? 0;
                        const defaultPrice = pi ? String(pi.price ?? "0") : "0";
                        return (
                          <div key={idx} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-zinc-950/35 p-3 lg:grid-cols-[1fr_130px_140px_50px]">
                            <select value={r.pedido_item_id ?? ""} onChange={(e) => { const next = e.target.value === "" ? null : Number(e.target.value); if (next) { const found = itensPendentes.find((x) => x.id === next); setRows((prev) => prev.map((row, i) => i === idx ? { ...row, pedido_item_id: next, price: String(found?.price ?? defaultPrice) } : row)); } else { setRows((prev) => prev.map((row, i) => i === idx ? { ...row, pedido_item_id: null } : row)); } }} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50">
                              <option value="" style={optionStyle}>Produto pendente...</option>
                              {itensPendentes.map((it) => (<option key={it.id} value={it.id} style={optionStyle}>{it.produto?.name ?? "PRODUTO"} · Saldo {it.remaining}</option>))}
                            </select>
                            <div className="grid gap-1">
                              <input value={r.quantity} onChange={(e) => { const next = e.target.value; const n = parseNumber(next); if (remaining > 0 && n > remaining) { setRows((prev) => prev.map((row, i) => i === idx ? { ...row, quantity: String(remaining) } : row)); return; } setRows((prev) => prev.map((row, i) => i === idx ? { ...row, quantity: next } : row)); }} inputMode="decimal" placeholder="Qtd" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50" />
                              <p className="text-[11px] font-semibold text-zinc-400">Saldo: <span className="text-zinc-200">{remaining}</span></p>
                            </div>
                            <input value={r.price} onChange={(e) => setRows((prev) => prev.map((row, i) => i === idx ? { ...row, price: e.target.value } : row))} inputMode="decimal" placeholder="Preco (5 casas)" className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50" />
                            <button onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))} className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-sm font-black text-rose-200 hover:bg-rose-500/15" aria-label="Remover" title="Remover">×</button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Total</p>
                        <p className="mt-1 text-lg font-black text-white">{money(total)}</p>
                      </div>
                    </div>
                  </div>

                  {saveMessage ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-semibold text-zinc-200">{saveMessage}</div> : null}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button disabled={saving || formNF.trim().length < 1 || formPedidoId === ""} onClick={onSave} className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60">
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                    <button disabled={saving} onClick={() => setOpen(false)} className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
                      Cancelar
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

