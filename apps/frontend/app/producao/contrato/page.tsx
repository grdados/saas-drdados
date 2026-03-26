"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  ClienteGerencial, ContratoVenda, GrupoProdutor, Operacao, ProdutoItem, Produtor, Safra,
  createContratoVenda, deleteContratoVenda, isApiError, listClientesGerencial, listContratosVenda,
  listGruposProdutores, listOperacoes, listProdutosEstoque, listProdutores, listSafras, updateContratoVenda
} from "@/lib/api";
import { toUpperText } from "@/lib/text";

function toApiDecimal(v: unknown) { return String(v ?? "0").replace(/\./g, "").replace(",", "."); }
function asNum(v: unknown) { const n = Number(String(v ?? "0").replace(",", ".")); return Number.isFinite(n) ? n : 0; }

export default function ContratoVendaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itens, setItens] = useState<ContratoVenda[]>([]);
  const [grupos, setGrupos] = useState<GrupoProdutor[]>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [clientes, setClientes] = useState<ClienteGerencial[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContratoVenda | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: "", code: "", grupo_id: "", produtor_id: "", cliente_id: "", safra_id: "",
    due_date: "", operacao_id: "", status: "pending", notes: "",
    rows: [{ produto_id: "", unit: "KG", quantity: "0", price: "0", discount: "0" }]
  });

  const filtered = useMemo(() => itens.filter((x) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (x.code || "").toLowerCase().includes(needle) || (x.cliente?.name ?? "").toLowerCase().includes(needle) || (x.produtor?.name ?? "").toLowerCase().includes(needle);
  }), [itens, q]);
  const total = useMemo(() => form.rows.reduce((acc, r) => Math.max(0, acc + (asNum(r.quantity) * asNum(r.price) - asNum(r.discount))), 0), [form.rows]);

  useEffect(() => { void refresh(); }, []);
  async function refresh() {
    const token = getAccessToken(); if (!token) return;
    setLoading(true); setError("");
    try {
      const [a, b, c, d, e, f, g] = await Promise.all([
        listContratosVenda(token), listGruposProdutores(token), listProdutores(token),
        listClientesGerencial(token), listSafras(token), listOperacoes(token), listProdutosEstoque(token)
      ]);
      setItens(a); setGrupos(b); setProdutores(c); setClientes(d); setSafras(e); setOperacoes(f); setProdutos(g);
    } catch (err) {
      if (isApiError(err) && err.status === 401) { window.location.href = "/login"; return; }
      setError(err instanceof Error ? err.message : "Falha ao carregar contratos.");
    } finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ date: "", code: "", grupo_id: "", produtor_id: "", cliente_id: "", safra_id: "", due_date: "", operacao_id: "", status: "pending", notes: "", rows: [{ produto_id: "", unit: "KG", quantity: "0", price: "0", discount: "0" }] });
    setOpen(true);
  }
  function openEdit(x: ContratoVenda) {
    setEditing(x);
    setForm({
      date: x.date ?? "", code: x.code ?? "", grupo_id: String(x.grupo?.id ?? ""), produtor_id: String(x.produtor?.id ?? ""), cliente_id: String(x.cliente?.id ?? ""), safra_id: String(x.safra?.id ?? ""), due_date: x.due_date ?? "", operacao_id: String(x.operacao?.id ?? ""), status: x.status ?? "pending", notes: x.notes ?? "",
      rows: (x.items || []).map((r) => ({ produto_id: String(r.produto?.id ?? ""), unit: r.unit || "KG", quantity: String(r.quantity ?? "0"), price: String(r.price ?? "0"), discount: String(r.discount ?? "0") }))
    });
    setOpen(true);
  }

  async function save() {
    const token = getAccessToken(); if (!token) return;
    if (!window.confirm(editing ? "Confirmar edição do contrato?" : "Confirmar novo contrato?")) return;
    setSaving(true);
    try {
      const payload = {
        date: form.date || null, code: form.code.trim(),
        grupo_id: form.grupo_id ? Number(form.grupo_id) : null,
        produtor_id: form.produtor_id ? Number(form.produtor_id) : null,
        cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
        safra_id: form.safra_id ? Number(form.safra_id) : null,
        due_date: form.due_date || null, operacao_id: form.operacao_id ? Number(form.operacao_id) : null,
        status: form.status, notes: form.notes,
        items: form.rows.map((r) => ({ produto_id: r.produto_id ? Number(r.produto_id) : null, unit: r.unit, quantity: toApiDecimal(r.quantity), price: toApiDecimal(r.price), discount: toApiDecimal(r.discount) }))
      };
      if (editing) await updateContratoVenda(token, editing.id, payload); else await createContratoVenda(token, payload);
      setOpen(false); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao salvar contrato."); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    const token = getAccessToken(); if (!token) return;
    if (!window.confirm("Excluir este contrato?")) return;
    try { await deleteContratoVenda(token, id); await refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Falha ao excluir contrato."); }
  }

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Produção</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Contrato</h1>
            <p className="mt-1 text-sm text-zinc-300">Contrato de venda (pai/filho) com geração automática em Contas a Receber.</p>
          </div>
          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-4">
            <div className="flex gap-2 justify-end"><button onClick={openCreate} className="rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400">Novo contrato</button></div>
          </section>
          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-4">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por contrato, cliente ou produtor..." className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none" />
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-black text-white">Lista</p><p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p></div>
            <div className="mt-3 space-y-2">
              {filtered.map((x) => (
                <div key={x.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3 grid gap-2 lg:grid-cols-[120px_140px_1fr_1fr_130px_150px_180px]">
                  <div className="text-sm font-black text-zinc-100">{x.status?.toUpperCase()}</div>
                  <div className="text-sm text-zinc-100">{x.code || `#${x.id}`}</div>
                  <div className="text-sm text-zinc-100">{x.cliente?.name ?? "-"}</div>
                  <div className="text-sm text-zinc-100">{x.produtor?.name ?? "-"}</div>
                  <div className="text-sm text-zinc-100">{x.due_date ?? "-"}</div>
                  <div className="text-sm font-black text-zinc-100">R$ {asNum(x.total_value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-right"><button onClick={() => openEdit(x)} className="mr-1 rounded-xl border border-sky-400/25 bg-sky-500/15 px-3 py-1.5 text-[11px] font-black text-sky-100">Editar</button><button onClick={() => void remove(x.id)} className="rounded-xl border border-rose-400/25 bg-rose-500/15 px-3 py-1.5 text-[11px] font-black text-rose-100">Excluir</button></div>
                </div>
              ))}
            </div>
          </section>

          {open ? <div className="fixed inset-0 z-50 grid place-items-center px-4">
            <button className="absolute inset-0 bg-zinc-950/60" onClick={() => setOpen(false)} aria-label="Fechar" />
            <div className="relative w-full max-w-[1200px] rounded-3xl border border-white/15 bg-zinc-900/95 p-5 space-y-3">
              <p className="text-sm font-black text-white">{editing ? "Editar contrato" : "Novo contrato"}</p>
              <div className="grid gap-2 lg:grid-cols-3">
                <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" />
                <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: toUpperText(e.target.value) }))} placeholder="Contrato" className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" />
                <select value={form.grupo_id} onChange={(e) => setForm((p) => ({ ...p, grupo_id: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="">Grupo</option>{grupos.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                <select value={form.produtor_id} onChange={(e) => setForm((p) => ({ ...p, produtor_id: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="">Produtor</option>{produtores.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                <select value={form.cliente_id} onChange={(e) => setForm((p) => ({ ...p, cliente_id: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="">Cliente</option>{clientes.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                <select value={form.safra_id} onChange={(e) => setForm((p) => ({ ...p, safra_id: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="">Safra</option>{safras.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                <input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" />
                <select value={form.operacao_id} onChange={(e) => setForm((p) => ({ ...p, operacao_id: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="">Operação</option>{operacoes.filter((o) => o.kind === "credit").map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="pending">Pendente</option><option value="partial">Parcial</option><option value="delivered">Entregue</option><option value="canceled">Cancelado</option></select>
              </div>
              <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Observação" rows={2} className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" />
              <div className="space-y-2">
                {form.rows.map((r, idx) => {
                  const rowTotal = Math.max(0, asNum(r.quantity) * asNum(r.price) - asNum(r.discount));
                  return <div key={idx} className="grid gap-2 lg:grid-cols-[1.3fr_0.5fr_0.7fr_0.7fr_0.7fr_0.8fr_auto]">
                    <select value={r.produto_id} onChange={(e) => setForm((p) => ({ ...p, rows: p.rows.map((x, i) => i === idx ? { ...x, produto_id: e.target.value } : x) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="">Produto</option>{produtos.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                    <input value={r.unit} onChange={(e) => setForm((p) => ({ ...p, rows: p.rows.map((x, i) => i === idx ? { ...x, unit: e.target.value } : x) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" />
                    <input value={r.quantity} onChange={(e) => setForm((p) => ({ ...p, rows: p.rows.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 text-right" />
                    <input value={r.price} onChange={(e) => setForm((p) => ({ ...p, rows: p.rows.map((x, i) => i === idx ? { ...x, price: e.target.value } : x) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 text-right" />
                    <input value={r.discount} onChange={(e) => setForm((p) => ({ ...p, rows: p.rows.map((x, i) => i === idx ? { ...x, discount: e.target.value } : x) }))} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 text-right" />
                    <input readOnly value={rowTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="rounded-2xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 text-right" />
                    <button type="button" onClick={() => setForm((p) => ({ ...p, rows: p.rows.filter((_, i) => i !== idx) }))} className="rounded-2xl border border-rose-400/25 bg-rose-500/15 px-3 py-2.5 text-sm font-black text-rose-100">x</button>
                  </div>;
                })}
              </div>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setForm((p) => ({ ...p, rows: [...p.rows, { produto_id: "", unit: "KG", quantity: "0", price: "0", discount: "0" }] }))} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-100">Adicionar item</button>
                <p className="text-sm font-black text-white">Valor total: R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Cancelar</button><button onClick={() => void save()} disabled={saving} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100">{saving ? "Salvando..." : "Salvar"}</button></div>
            </div>
          </div> : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}
