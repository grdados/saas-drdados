"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  createPedidoCompra,
  FornecedorGerencial,
  GrupoProdutor,
  Insumo,
  isApiError,
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
  Safra,
  updatePedidoCompra
} from "@/lib/api";
import { toUpperText } from "@/lib/text";

function toApiDecimal(v: unknown) {
  // DRF DecimalField aceita "5.50" mas nÃ£o "5,50". TambÃ©m lidamos com "1.234,56".
  const raw = String(v ?? "").trim();
  if (!raw) return "0";
  const s = raw.replace(/\s+/g, "");
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // assume "." como milhar e "," como decimal
    return s.replace(/\./g, "").replace(",", ".");
  }
  if (hasComma) return s.replace(",", ".");
  return s;
}

export default function PedidoCompraPage() {
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [error, setError] = useState("");

  const [grupos, setGrupos] = useState<GrupoProdutor[]>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorGerencial[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);

  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => pedidos.find((p) => p.id === editingId) ?? null, [pedidos, editingId]);

  const [formDate, setFormDate] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formGrupoId, setFormGrupoId] = useState<number | "">("");
  const [formProdutorId, setFormProdutorId] = useState<number | "">("");
  const [formFornecedorId, setFormFornecedorId] = useState<number | "">("");
  const [formSafraId, setFormSafraId] = useState<number | "">("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formOperacaoId, setFormOperacaoId] = useState<number | "">("");
  const [formStatus, setFormStatus] = useState("pending");
  const [rows, setRows] = useState<
    Array<{ produto_id: number | null; unit: string; quantity: string; price: string; discount: string }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return pedidos;
    return pedidos.filter((p) => {
      return (
        (p.code || "").toLowerCase().includes(needle) ||
        (p.fornecedor?.name ?? "").toLowerCase().includes(needle) ||
        (p.produtor?.name ?? "").toLowerCase().includes(needle)
      );
    });
  }, [pedidos, q]);

  const total = useMemo(() => {
    return rows.reduce((acc, r) => {
      const qty = parseFloat((r.quantity || "0").replace(",", "."));
      const price = parseFloat((r.price || "0").replace(",", "."));
      const discount = parseFloat((r.discount || "0").replace(",", "."));
      const t = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(price) ? price : 0) - (Number.isFinite(discount) ? discount : 0);
      return acc + (t > 0 ? t : 0);
    }, 0);
  }, [rows]);

  const produtoresFiltrados = useMemo(() => {
    if (formGrupoId === "") return produtores;
    const gid = Number(formGrupoId);
    return produtores.filter((p) => (p.grupo?.id ?? null) === gid);
  }, [produtores, formGrupoId]);

  const operacoesDespesa = useMemo(() => {
    return [...operacoes].filter((o) => o.kind === "debit").sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [operacoes]);

  async function refresh() {
    const token = getAccessToken();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const [ped, grp, pro, forn, saf, ope, ins] = await Promise.all([
        listPedidosCompra(token),
        listGruposProdutores(token),
        listProdutores(token),
        listFornecedoresGerencial(token),
        listSafras(token),
        listOperacoes(token),
        listInsumos(token)
      ]);
      setPedidos(ped);
      setGrupos(grp);
      setProdutores(pro);
      setFornecedores(forn);
      setSafras(saf);
      setOperacoes(ope);
      setInsumos(ins);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setError((msg || "").trim() || "Falha ao carregar pedidos.");
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
    setFormDate("");
    setFormCode("");
    setFormGrupoId("");
    setFormProdutorId("");
    setFormFornecedorId("");
    setFormSafraId("");
    setFormDueDate("");
    setFormOperacaoId("");
    setFormStatus("pending");
    setRows([{ produto_id: null, unit: "", quantity: "0", price: "0", discount: "0" }]);
    setSaveMessage("");
    setOpen(true);
  }

  function openEdit(id: number) {
    const p = pedidos.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setFormDate(p.date ?? "");
    setFormCode(p.code ?? "");
    setFormGrupoId(p.grupo?.id ?? "");
    setFormProdutorId(p.produtor?.id ?? "");
    setFormFornecedorId(p.fornecedor?.id ?? "");
    setFormSafraId(p.safra?.id ?? "");
    setFormDueDate(p.due_date ?? "");
    setFormOperacaoId(p.operacao?.id ?? "");
    setFormStatus(p.status ?? "pending");
    setRows(
      (p.items || []).map((it) => ({
        produto_id: it.produto?.id ?? null,
        unit: it.unit ?? "",
        quantity: String(it.quantity ?? "0"),
        price: String(it.price ?? "0"),
        discount: String(it.discount ?? "0")
      }))
    );
    if ((p.items || []).length === 0) setRows([{ produto_id: null, unit: "", quantity: "0", price: "0", discount: "0" }]);
    setSaveMessage("");
    setOpen(true);
  }

  function patchRow(i: number, patch: Partial<(typeof rows)[number]>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function onSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        date: formDate || null,
        code: formCode.trim(),
        grupo_id: formGrupoId === "" ? null : Number(formGrupoId),
        produtor_id: formProdutorId === "" ? null : Number(formProdutorId),
        fornecedor_id: formFornecedorId === "" ? null : Number(formFornecedorId),
        safra_id: formSafraId === "" ? null : Number(formSafraId),
        due_date: formDueDate || null,
        operacao_id: formOperacaoId === "" ? null : Number(formOperacaoId),
        status: formStatus,
        items: rows.map((r) => ({
          produto_id: r.produto_id,
          unit: r.unit,
          quantity: toApiDecimal(r.quantity),
          price: toApiDecimal(r.price),
          discount: toApiDecimal(r.discount)
        }))
      };

      if (!editingId) {
        const created = await createPedidoCompra(token, payload);
        setPedidos((prev) => [...prev, created]);
      } else {
        const updated = await updatePedidoCompra(token, editingId, payload);
        setPedidos((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      }
      setOpen(false);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setSaveMessage((msg || "").trim() || "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-5">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Compra</p>
          <h1 className="text-2xl font-black tracking-tight text-white">Pedido</h1>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por pedido, fornecedor ou produtor..."
              className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
            />
            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400"
            >
              Novo pedido
            </button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div>
          ) : null}

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Lista</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${filtered.length} item(ns)`}</p>
            </div>
            <div className="mt-3 space-y-2">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/35 px-4 py-3 hover:bg-white/5"
                >
                  <button onClick={() => openEdit(p.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-black text-white">{p.code || `#${p.id}`}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-400">
                      {p.fornecedor?.name ?? "-"} Â· {p.produtor?.name ?? "-"} Â· {p.date || "-"}
                    </p>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-black text-zinc-100">
                        R$ {Number(p.total_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">{p.status}</p>
                    </div>
                    <button
                      onClick={() => window.open(`/compra/pedido/${p.id}/print`, "_blank", "noopener,noreferrer")}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white hover:bg-white/10"
                      title="Imprimir / PDF"
                    >
                      Imprimir
                    </button>
                  </div>
                </div>
              ))}
              {!loading && filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">Nenhum pedido encontrado.</div>
              ) : null}
            </div>
          </section>

          {/* Modal */}
          {open ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Fechar" />
              <div className="relative w-full max-w-[1100px] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/85 shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <p className="text-sm font-black text-white">{editing ? "Editar pedido" : "Novo pedido"}</p>
                    <p className="mt-1 text-xs text-zinc-400">Formulario Pai e Itens (Filho).</p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                    aria-label="Fechar modal"
                    title="Fechar"
                  >
                    âœ•
                  </button>
                </div>
                <div className="max-h-[78vh] overflow-auto p-5">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data</label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      />
                    </div>
                    <div className="grid gap-2 lg:col-span-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Pedido</label>
                      <input
                        value={formCode}
                        onChange={(e) => setFormCode(toUpperText(e.target.value))}
                        placeholder="Ex: PC-2026-001"
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Grupo</label>
                      <select
                        value={formGrupoId}
                        onChange={(e) => {
                          const next = e.target.value === "" ? "" : Number(e.target.value);
                          setFormGrupoId(next);
                          setFormProdutorId("");
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="" style={optionStyle}>
                          Selecione
                        </option>
                        {grupos.map((g) => (
                          <option key={g.id} value={g.id} style={optionStyle}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produtor</label>
                      <select
                        value={formProdutorId}
                        onChange={(e) => setFormProdutorId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="" style={optionStyle}>
                          Selecione
                        </option>
                        {produtoresFiltrados.map((p) => (
                          <option key={p.id} value={p.id} style={optionStyle}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Fornecedor</label>
                      <select
                        value={formFornecedorId}
                        onChange={(e) => setFormFornecedorId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="" style={optionStyle}>
                          Selecione
                        </option>
                        {fornecedores.map((f) => (
                          <option key={f.id} value={f.id} style={optionStyle}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Safra</label>
                      <select
                        value={formSafraId}
                        onChange={(e) => setFormSafraId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="" style={optionStyle}>
                          Selecione
                        </option>
                        {safras.map((s) => (
                          <option key={s.id} value={s.id} style={optionStyle}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Vencimento</label>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Operacao</label>
                      <select
                        value={formOperacaoId}
                        onChange={(e) => setFormOperacaoId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="" style={optionStyle}>
                          Selecione
                        </option>
                        {operacoesDespesa.map((o) => (
                          <option key={o.id} value={o.id} style={optionStyle}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                      >
                        <option value="pending" style={optionStyle}>
                          Pendente
                        </option>
                        <option value="draft" style={optionStyle}>
                          Rascunho
                        </option>
                        <option value="open" style={optionStyle}>
                          Em aberto
                        </option>
                        <option value="confirmed" style={optionStyle}>
                          Confirmado
                        </option>
                        <option value="canceled" style={optionStyle}>
                          Cancelado
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-white">Itens</p>
                      <button
                        onClick={() =>
                          setRows((prev) => [...prev, { produto_id: null, unit: "", quantity: "0", price: "0", discount: "0" }])
                        }
                        className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-3 py-2 text-sm font-black text-emerald-100 hover:bg-emerald-500/20"
                      >
                        Adicionar
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {rows.map((r, idx) => (
                        <div key={idx} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-zinc-950/35 p-3 lg:grid-cols-[1fr_90px_110px_110px_110px_50px]">
                          <select
                            value={r.produto_id ?? ""}
                            onChange={(e) => patchRow(idx, { produto_id: e.target.value === "" ? null : Number(e.target.value) })}
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                          >
                            <option value="" style={optionStyle}>
                              Produto (Insumo)
                            </option>
                            {insumos.map((p) => (
                              <option key={p.id} value={p.id} style={optionStyle}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <input
                            value={r.unit}
                            onChange={(e) => patchRow(idx, { unit: toUpperText(e.target.value) })}
                            placeholder="UN"
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                          />
                          <input
                            value={r.quantity}
                            onChange={(e) => patchRow(idx, { quantity: e.target.value })}
                            inputMode="decimal"
                            placeholder="Qtd"
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                          />
                          <input
                            value={r.price}
                            onChange={(e) => patchRow(idx, { price: e.target.value })}
                            inputMode="decimal"
                            placeholder="Preco"
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                          />
                          <input
                            value={r.discount}
                            onChange={(e) => patchRow(idx, { discount: e.target.value })}
                            inputMode="decimal"
                            placeholder="Desc."
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                          />
                          <button
                            onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                            className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-sm font-black text-rose-200 hover:bg-rose-500/15"
                            aria-label="Remover"
                            title="Remover"
                          >
                            âœ•
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Total</p>
                        <p className="mt-1 text-lg font-black text-white">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>

                  {saveMessage ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-semibold text-zinc-200">{saveMessage}</div>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      disabled={saving || formCode.trim().length < 2}
                      onClick={onSave}
                      className="inline-flex items-center justify-center rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
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
