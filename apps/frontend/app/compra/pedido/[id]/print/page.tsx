"use client";

import { useEffect, useMemo, useState } from "react";

import { useParams } from "next/navigation";

import { getPedidoCompra, isApiError, PedidoCompra } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

function money(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function asNumber(v: unknown) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function prettyDate(s: string | null | undefined) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("pt-BR");
  } catch {
    return s;
  }
}

export default function PedidoCompraPrintPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<PedidoCompra | null>(null);
  const [error, setError] = useState("");

  const total = useMemo(() => {
    if (!pedido) return 0;
    return asNumber(pedido.total_value);
  }, [pedido]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    if (!Number.isFinite(id) || id <= 0) {
      setError("Pedido inválido.");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getPedidoCompra(token, id);
        setPedido(data);
        // pequena espera para garantir layout antes do print em alguns browsers
        setTimeout(() => {
          try {
            window.print();
          } catch {
            // noop
          }
        }, 300);
      } catch (err) {
        if (isApiError(err) && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Falha ao carregar pedido.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <p className="text-sm font-black">Relatório do Pedido</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-black text-white hover:bg-zinc-800"
            >
              Imprimir / PDF
            </button>
            <button
              onClick={() => window.close()}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-900 hover:bg-zinc-50"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        {loading ? <p className="text-sm text-zinc-600">Carregando...</p> : null}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
            {error}
          </div>
        ) : null}

        {pedido ? (
          <div className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">GR Dados</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">Pedido de Compra</h1>
                <p className="mt-1 text-sm text-zinc-600">
                  Pedido: <span className="font-black text-zinc-900">{pedido.code || `#${pedido.id}`}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Total</p>
                <p className="mt-1 text-2xl font-black">{money(total)}</p>
              </div>
            </header>

            <section className="grid gap-3 rounded-3xl border border-zinc-200 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Data</p>
                <p className="mt-1 text-sm font-semibold">{prettyDate(pedido.date)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Vencimento</p>
                <p className="mt-1 text-sm font-semibold">{prettyDate(pedido.due_date)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Fornecedor</p>
                <p className="mt-1 text-sm font-semibold">{pedido.fornecedor?.name ?? "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Produtor</p>
                <p className="mt-1 text-sm font-semibold">{pedido.produtor?.name ?? "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Grupo</p>
                <p className="mt-1 text-sm font-semibold">{pedido.grupo?.name ?? "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Safra</p>
                <p className="mt-1 text-sm font-semibold">{pedido.safra?.name ?? "-"}</p>
              </div>
              <div className="lg:col-span-2">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Operação</p>
                <p className="mt-1 text-sm font-semibold">{pedido.operacao?.name ?? "-"}</p>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black">Itens</p>
                <p className="text-xs font-semibold text-zinc-500">{(pedido.items || []).length} item(ns)</p>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
                <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-600">
                  <div className="col-span-5">Produto</div>
                  <div className="col-span-2">Un</div>
                  <div className="col-span-2 text-right">Qtd</div>
                  <div className="col-span-1 text-right">Desc.</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                <div className="divide-y divide-zinc-200">
                  {(pedido.items || []).map((it) => {
                    const qty = asNumber(it.quantity);
                    const price = asNumber(it.price);
                    const discount = asNumber(it.discount);
                    const t = Math.max(0, qty * price - discount);
                    return (
                      <div key={it.id} className="grid grid-cols-12 gap-2 px-3 py-2">
                        <div className="col-span-5">
                          <p className="text-sm font-semibold">{it.produto?.name ?? "-"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-semibold">{it.unit || "-"}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm font-semibold">{qty.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}</p>
                        </div>
                        <div className="col-span-1 text-right">
                          <p className="text-sm font-semibold">{money(discount)}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm font-black">{money(t)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <footer className="pt-2 text-xs text-zinc-500">
              Gerado em {new Date().toLocaleString("pt-BR")}
            </footer>
          </div>
        ) : null}
      </main>
    </div>
  );
}

