"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  ClienteGerencial,
  Cultura,
  NotaFiscalGraosApi,
  ProdutoItem,
  Produtor,
  Safra,
  createNotaGraos,
  isApiError,
  listClientesGerencial,
  listCulturas,
  listNotasGraos,
  listProdutosEstoque,
  listProdutores,
  listRomaneiosGraos,
  listSafras
} from "@/lib/api";
import {
  ContraNotaEntrada,
  Empreendimento,
  Romaneio,
  loadContraNotasEntrada,
  loadEmpreendimentos,
  loadRomaneios
} from "@/lib/producaoLocal";

function n(v: unknown) {
  const x = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

function kg(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function culturaMeta(name: string) {
  const normalized = (name || "").toLowerCase();
  if (normalized.includes("milho")) return { icon: "\u{1F33D}", tone: "border-amber-400/30 bg-amber-500/10 text-amber-100" };
  if (normalized.includes("soja")) return { icon: "🌱", tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" };
  if (normalized.includes("trigo")) return { icon: "\u{1F33E}", tone: "border-yellow-300/30 bg-yellow-500/10 text-yellow-100" };
  if (normalized.includes("amendo")) return { icon: "\u{1F95C}", tone: "border-orange-400/30 bg-orange-500/10 text-orange-100" };
  if (normalized.includes("aveia")) return { icon: "\u{1F33E}", tone: "border-violet-400/30 bg-violet-500/10 text-violet-100" };
  return { icon: "\u{1F33F}", tone: "border-sky-400/30 bg-sky-500/10 text-sky-100" };
}

function CulturaBadge({ name }: { name: string }) {
  const meta = culturaMeta(name);
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className={`grid h-5 w-5 place-items-center rounded-lg border text-[12px] leading-none ${meta.tone}`}>
        {meta.icon}
      </span>
      <span className="truncate text-xs text-zinc-100">{name}</span>
    </div>
  );
}

function productMeta(name: string, cultura?: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("soja")) return { icon: "🌱", tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" };
  if (normalized.includes("milho")) return { icon: "🌽", tone: "border-amber-400/30 bg-amber-500/10 text-amber-100" };
  if (normalized.includes("trigo")) return { icon: "🌾", tone: "border-yellow-300/30 bg-yellow-500/10 text-yellow-100" };
  if (normalized.includes("amendo")) return { icon: "🥜", tone: "border-orange-400/30 bg-orange-500/10 text-orange-100" };
  if (normalized.includes("aveia")) return { icon: "🌾", tone: "border-violet-400/30 bg-violet-500/10 text-violet-100" };
  if (normalized.includes("feij")) return { abbr: "FJ", tone: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100" };
  if (normalized.includes("brachi")) return { abbr: "BR", tone: "border-lime-400/30 bg-lime-500/10 text-lime-100" };
  if (normalized.includes("sem produto") && (cultura || "").toLowerCase().includes("milho")) {
    return { icon: "🌽", tone: "border-amber-400/30 bg-amber-500/10 text-amber-100" };
  }
  return { abbr: name.slice(0, 2).toUpperCase() || "PR", tone: "border-sky-400/30 bg-sky-500/10 text-sky-100" };
}

function productMetaV2(name: string, cultura?: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("soja")) return { icon: "🌱", tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" };
  if (normalized.includes("milho")) return { icon: "\u{1F33D}", tone: "border-amber-400/30 bg-amber-500/10 text-amber-100" };
  if (normalized.includes("trigo")) return { icon: "\u{1F33E}", tone: "border-yellow-300/30 bg-yellow-500/10 text-yellow-100" };
  if (normalized.includes("amendo")) return { icon: "\u{1F95C}", tone: "border-orange-400/30 bg-orange-500/10 text-orange-100" };
  if (normalized.includes("aveia")) return { icon: "\u{1F33E}", tone: "border-violet-400/30 bg-violet-500/10 text-violet-100" };
  if (normalized.includes("feij")) return { abbr: "FJ", tone: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100" };
  if (normalized.includes("brachi")) return { abbr: "BR", tone: "border-lime-400/30 bg-lime-500/10 text-lime-100" };
  if (normalized.includes("sem produto") && (cultura || "").toLowerCase().includes("milho")) {
    return { icon: "\u{1F33D}", tone: "border-amber-400/30 bg-amber-500/10 text-amber-100" };
  }
  return { abbr: name.slice(0, 2).toUpperCase() || "PR", tone: "border-sky-400/30 bg-sky-500/10 text-sky-100" };
}

function ProductIcon({ name, cultura }: { name: string; cultura?: string }) {
  const meta = productMetaV2(name, cultura);
  return (
    <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${"icon" in meta ? "text-[20px] leading-none" : "text-[12px] font-black tracking-[0.08em]"} ${meta.tone}`}>
      {"icon" in meta ? meta.icon : meta.abbr}
    </div>
  );
}

function statusFromRomaneio(r: Romaneio, contra: ContraNotaEntrada | undefined): "ok" | "pending" {
  if (contra) return "ok";
  if (r.status === "ok" || r.status === "pending") return r.status;
  return "pending";
}

type EstoqueRow = {
  safra: string;
  cultura: string;
  produto: string;
  produtor: string;
  cliente: string;
  deposito: string;
  quantidade: number;
  totalLoads: number;
  pendingLoads: number;
  romaneioCodes: string[];
  nfpRefs: string[];
  notaFiscalRefs: string[];
};

type ProductSummary = {
  produto: string;
  cultura?: string;
  totalKg: number;
  safraCount: number;
  produtorCount: number;
  clienteCount: number;
};

type SafraSummary = {
  safra: string;
  totalKg: number;
  produtos: Array<{ produto: string; quantidade: number }>;
};

type ProducerSummary = {
  produtor: string;
  totalKg: number;
  linhas: Array<{ safra: string; produto: string; cliente: string; quantidade: number }>;
};

type ClientSummary = {
  cliente: string;
  totalKg: number;
  linhas: Array<{ safra: string; produto: string; produtor: string; quantidade: number }>;
};

type MatrixRow = {
  rowKey: string;
  produtor: string;
  safra: string;
  byCliente: Map<string, number>;
  totalKg: number;
};

type EntradaOperacional = {
  entrada: NotaFiscalGraosApi;
  saldoDisponivelKg: number;
  saldoVendaKg: number;
  devolvidoKg: number;
  vendidoKg: number;
  bloqueiaVendaDireta: boolean;
};

function sortByQtyDesc<T extends { quantidade: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => b.quantidade - a.quantidade);
}

export default function EstoqueProdutosPage() {
  const [unitView, setUnitView] = useState<"KG" | "SC">("SC");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opError, setOpError] = useState("");
  const [savingSaida, setSavingSaida] = useState(false);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [clientes, setClientes] = useState<ClienteGerencial[]>([]);
  const [filterSafraId, setFilterSafraId] = useState<number | "">("");
  const [filterCulturaId, setFilterCulturaId] = useState<number | "">("");
  const [filterProdutoId, setFilterProdutoId] = useState<number | "">("");
  const [filterProdutorId, setFilterProdutorId] = useState<number | "">("");
  const [filterClienteId, setFilterClienteId] = useState<number | "">("");
  const [q, setQ] = useState("");
  const [romaneios, setRomaneios] = useState<Romaneio[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [contraNotas, setContraNotas] = useState<ContraNotaEntrada[]>([]);
  const [romaneiosApi, setRomaneiosApi] = useState<Awaited<ReturnType<typeof listRomaneiosGraos>>>([]);
  const [notasGraos, setNotasGraos] = useState<NotaFiscalGraosApi[]>([]);
  const [modalSaidaOpen, setModalSaidaOpen] = useState(false);
  const [modalSaidaType, setModalSaidaType] = useState<"devolucao" | "venda">("devolucao");
  const [modalEntradaRef, setModalEntradaRef] = useState<EntradaOperacional | null>(null);
  const [saidaForm, setSaidaForm] = useState({
    date: "",
    due_date: "",
    number: "",
    quantity_kg: "",
    price: "",
    discount: "0"
  });

  const formatQtd = (valorKg: number) => {
    const valor = unitView === "SC" ? valorKg / 60 : valorKg;
    return kg(valor);
  };

  useEffect(() => {
    async function run() {
      const token = getAccessToken();
      setLoading(true);
      setError("");
      try {
        if (token) {
          const [sf, ct, pd, pr, cl, romApi, nfApi] = await Promise.all([
            listSafras(token),
            listCulturas(token),
            listProdutosEstoque(token),
            listProdutores(token),
            listClientesGerencial(token),
            listRomaneiosGraos(token),
            listNotasGraos(token)
          ]);
          setSafras(sf);
          setCulturas(ct);
          setProdutos(pd);
          setProdutores(pr);
          setClientes(cl);
          setRomaneiosApi(romApi);
          setNotasGraos(nfApi);
          setFilterSafraId("");
        }
        setRomaneios(loadRomaneios());
        setEmpreendimentos(loadEmpreendimentos());
        setContraNotas(loadContraNotasEntrada());
      } catch (err) {
        if (isApiError(err) && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Falha ao carregar estoque de produtos.");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  const empreendimentoById = useMemo(() => {
    const map = new Map<string, Empreendimento>();
    for (const e of empreendimentos) map.set(e.id, e);
    return map;
  }, [empreendimentos]);

  const produtoById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of produtos) map.set(p.id, p.name);
    return map;
  }, [produtos]);

  const safraById = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of safras) map.set(s.id, s.name);
    return map;
  }, [safras]);

  const safraCulturaById = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const s of safras) map.set(s.id, s.cultura?.id ?? null);
    return map;
  }, [safras]);

  const culturaById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of culturas) map.set(c.id, c.name);
    return map;
  }, [culturas]);

  const produtorById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of produtores) map.set(p.id, p.name);
    return map;
  }, [produtores]);

  const clienteById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of clientes) map.set(c.id, c.name);
    return map;
  }, [clientes]);

  const contraNotaByRomaneioId = useMemo(() => {
    const map = new Map<string, ContraNotaEntrada>();
    for (const cn of contraNotas) map.set(cn.romaneio_id, cn);
    return map;
  }, [contraNotas]);

  const rows = useMemo(() => {
    const grouped = new Map<string, EstoqueRow>();
    for (const r of romaneios) {
      if (!r.empreendimento_id) continue;
      if (!r.deposito) continue;

      const contra = contraNotaByRomaneioId.get(r.id);
      const hasEntradaFiscal =
        (contra && (contra.operacao === "remessa_deposito" || contra.operacao === "a_fixar")) ||
        (!contra && r.status === "ok");
      if (!hasEntradaFiscal) continue;

      const emp = empreendimentoById.get(r.empreendimento_id);
      const sId = r.safra_id ?? emp?.safra_id ?? null;
      const cId = sId ? (safraCulturaById.get(sId) ?? null) : null;
      const inferredProdutoId =
        cId
          ? (() => {
              const options = produtos.filter((p) => p.cultura_id === cId && p.is_active);
              return options.length === 1 ? options[0].id : null;
            })()
          : null;
      const pId = r.produto_id ?? emp?.produto_id ?? inferredProdutoId ?? null;
      const produtorId = r.produtor_id ?? null;
      const clienteId = r.cliente_id ?? null;

      if (filterSafraId !== "" && sId !== Number(filterSafraId)) continue;
      if (filterCulturaId !== "" && cId !== Number(filterCulturaId)) continue;
      if (filterProdutoId !== "" && pId !== Number(filterProdutoId)) continue;
      if (filterProdutorId !== "" && produtorId !== Number(filterProdutorId)) continue;
      if (filterClienteId !== "" && clienteId !== Number(filterClienteId)) continue;

      const produtoNome = pId ? produtoById.get(pId) ?? `PRODUTO #${pId}` : "SEM PRODUTO";
      const safraNome = sId ? safraById.get(sId) ?? `SAFRA #${sId}` : "SEM SAFRA";
      const culturaNome = cId ? culturaById.get(cId) ?? `CULTURA #${cId}` : "SEM CULTURA";
      const produtorNome = produtorId ? produtorById.get(produtorId) ?? `PRODUTOR #${produtorId}` : "SEM PRODUTOR";
      const clienteNome = clienteId ? clienteById.get(clienteId) ?? `CLIENTE #${clienteId}` : "SEM CLIENTE";

      const key = `${sId ?? "x"}::${cId ?? "x"}::${pId ?? "x"}::${produtorId ?? "x"}::${clienteId ?? "x"}::${r.deposito.toUpperCase()}`;
      const current = grouped.get(key) ?? {
        safra: safraNome,
        cultura: culturaNome,
        produto: produtoNome,
        produtor: produtorNome,
        cliente: clienteNome,
        deposito: r.deposito.toUpperCase(),
        quantidade: 0,
        totalLoads: 0,
        pendingLoads: 0,
        romaneioCodes: [],
        nfpRefs: [],
        notaFiscalRefs: []
      };
      current.quantidade += Math.max(n(r.net_weight), 0);
      current.totalLoads += 1;
      if (statusFromRomaneio(r, contra) === "pending") current.pendingLoads += 1;
      if (r.code && !current.romaneioCodes.includes(r.code)) current.romaneioCodes.push(r.code);
      if (r.nfp && !current.nfpRefs.includes(r.nfp)) current.nfpRefs.push(r.nfp);
      if (contra?.nota_fiscal && !current.notaFiscalRefs.includes(contra.nota_fiscal)) {
        current.notaFiscalRefs.push(contra.nota_fiscal);
      }
      grouped.set(key, current);
    }

    const needle = q.trim().toLowerCase();
    return [...grouped.values()]
      .filter(
        (r) =>
          !needle ||
          `${r.safra} ${r.cultura} ${r.produto} ${r.produtor} ${r.cliente} ${r.deposito}`
            .toLowerCase()
            .includes(needle)
      )
      .sort((a, b) => a.produto.localeCompare(b.produto, "pt-BR"));
  }, [
    romaneios,
    contraNotaByRomaneioId,
    empreendimentoById,
    safraCulturaById,
    produtoById,
    produtos,
    safraById,
    culturaById,
    produtorById,
    clienteById,
    filterSafraId,
    filterCulturaId,
    filterProdutoId,
    filterProdutorId,
    filterClienteId,
    q
  ]);

  const matrixClients = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.cliente);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rows]);

  const matrixRows = useMemo<MatrixRow[]>(() => {
    const map = new Map<string, MatrixRow>();
    for (const r of rows) {
      const key = `${r.produtor}::${r.safra}`;
      const current = map.get(key) ?? {
        rowKey: key,
        produtor: r.produtor,
        safra: r.safra,
        byCliente: new Map<string, number>(),
        totalKg: 0
      };
      current.byCliente.set(r.cliente, (current.byCliente.get(r.cliente) ?? 0) + r.quantidade);
      current.totalKg += r.quantidade;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.totalKg - a.totalKg);
  }, [rows]);

  const productColumns = useMemo(() => {
    const preferred = ["MILHO", "SOJA", "TRIGO", "AMENDOIM", "AVEIA", "FEIJAO", "BRACHIARIA"];
    const normalize = (v: string) =>
      v
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();
    const set = new Set<string>();
    for (const r of rows) set.add(r.produto);
    const arr = [...set];
    arr.sort((a, b) => {
      const na = normalize(a);
      const nb = normalize(b);
      const ia = preferred.findIndex((p) => na.includes(p));
      const ib = preferred.findIndex((p) => nb.includes(p));
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        if (ia !== ib) return ia - ib;
      }
      return a.localeCompare(b, "pt-BR");
    });
    return arr;
  }, [rows]);

  const producerPivotRows = useMemo(() => {
    const map = new Map<string, { produtor: string; byProduct: Map<string, number>; totalKg: number }>();
    for (const r of rows) {
      const current = map.get(r.produtor) ?? { produtor: r.produtor, byProduct: new Map<string, number>(), totalKg: 0 };
      current.byProduct.set(r.produto, (current.byProduct.get(r.produto) ?? 0) + r.quantidade);
      current.totalKg += r.quantidade;
      map.set(r.produtor, current);
    }
    return [...map.values()].sort((a, b) => b.totalKg - a.totalKg);
  }, [rows]);

  const safraPivotRows = useMemo(() => {
    const map = new Map<string, { safra: string; byProduct: Map<string, number>; totalKg: number }>();
    for (const r of rows) {
      const current = map.get(r.safra) ?? { safra: r.safra, byProduct: new Map<string, number>(), totalKg: 0 };
      current.byProduct.set(r.produto, (current.byProduct.get(r.produto) ?? 0) + r.quantidade);
      current.totalKg += r.quantidade;
      map.set(r.safra, current);
    }
    return [...map.values()].sort((a, b) => b.totalKg - a.totalKg);
  }, [rows]);

  const productSummary = useMemo<ProductSummary[]>(() => {
    const map = new Map<string, { cultura?: string; totalKg: number; safras: Set<string>; produtores: Set<string>; clientes: Set<string> }>();
    for (const r of rows) {
      if (r.quantidade <= 0) continue;
      const current = map.get(r.produto) ?? {
        cultura: r.cultura,
        totalKg: 0,
        safras: new Set<string>(),
        produtores: new Set<string>(),
        clientes: new Set<string>()
      };
      current.totalKg += r.quantidade;
      current.safras.add(r.safra);
      current.produtores.add(r.produtor);
      current.clientes.add(r.cliente);
      map.set(r.produto, current);
    }
    return [...map.entries()]
      .map(([produto, v]) => ({
        produto,
        cultura: v.cultura,
        totalKg: v.totalKg,
        safraCount: v.safras.size,
        produtorCount: v.produtores.size,
        clienteCount: v.clientes.size
      }))
      .sort((a, b) => b.totalKg - a.totalKg);
  }, [rows]);

  const safraSummary = useMemo<SafraSummary[]>(() => {
    const map = new Map<string, Map<string, number>>();
    for (const r of rows) {
      const products = map.get(r.safra) ?? new Map<string, number>();
      products.set(r.produto, (products.get(r.produto) ?? 0) + r.quantidade);
      map.set(r.safra, products);
    }
    return [...map.entries()]
      .map(([safra, products]) => {
        const produtos = sortByQtyDesc(
          [...products.entries()].map(([produto, quantidade]) => ({ produto, quantidade }))
        );
        return {
          safra,
          totalKg: produtos.reduce((acc, p) => acc + p.quantidade, 0),
          produtos
        };
      })
      .sort((a, b) => b.totalKg - a.totalKg);
  }, [rows]);

  const producerSummary = useMemo<ProducerSummary[]>(() => {
    const map = new Map<string, Map<string, { safra: string; produto: string; cliente: string; quantidade: number }>>();
    for (const r of rows) {
      const byLine = map.get(r.produtor) ?? new Map<string, { safra: string; produto: string; cliente: string; quantidade: number }>();
      const lineKey = `${r.safra}::${r.produto}::${r.cliente}`;
      const current = byLine.get(lineKey) ?? { safra: r.safra, produto: r.produto, cliente: r.cliente, quantidade: 0 };
      current.quantidade += r.quantidade;
      byLine.set(lineKey, current);
      map.set(r.produtor, byLine);
    }
    return [...map.entries()]
      .map(([produtor, byLine]) => {
        const linhas = sortByQtyDesc([...byLine.values()]);
        return {
          produtor,
          totalKg: linhas.reduce((acc, l) => acc + l.quantidade, 0),
          linhas
        };
      })
      .sort((a, b) => b.totalKg - a.totalKg);
  }, [rows]);

  const clientSummary = useMemo<ClientSummary[]>(() => {
    const map = new Map<string, Map<string, { safra: string; produto: string; produtor: string; quantidade: number }>>();
    for (const r of rows) {
      const byLine = map.get(r.cliente) ?? new Map<string, { safra: string; produto: string; produtor: string; quantidade: number }>();
      const lineKey = `${r.safra}::${r.produto}::${r.produtor}`;
      const current = byLine.get(lineKey) ?? { safra: r.safra, produto: r.produto, produtor: r.produtor, quantidade: 0 };
      current.quantidade += r.quantidade;
      byLine.set(lineKey, current);
      map.set(r.cliente, byLine);
    }
    return [...map.entries()]
      .map(([cliente, byLine]) => {
        const linhas = sortByQtyDesc([...byLine.values()]);
        return {
          cliente,
          totalKg: linhas.reduce((acc, l) => acc + l.quantidade, 0),
          linhas
        };
      })
      .sort((a, b) => b.totalKg - a.totalKg);
  }, [rows]);

  const romaneioApiById = useMemo(() => {
    const map = new Map<number, (typeof romaneiosApi)[number]>();
    for (const r of romaneiosApi) map.set(r.id, r);
    return map;
  }, [romaneiosApi]);

  const entradasOperacionais = useMemo<EntradaOperacional[]>(() => {
    const saidasByEntrada = new Map<number, NotaFiscalGraosApi[]>();
    for (const nf of notasGraos) {
      if (nf.tipo !== "saida") continue;
      if ((nf.status || "").toLowerCase() === "canceled") continue;
      const refId = nf.nota_entrada_ref?.id ?? nf.nota_entrada_ref_id ?? null;
      if (!refId) continue;
      const bucket = saidasByEntrada.get(refId) ?? [];
      bucket.push(nf);
      saidasByEntrada.set(refId, bucket);
    }

    const textNeedle = q.trim().toLowerCase();
    const out: EntradaOperacional[] = [];
    for (const nf of notasGraos) {
      if (nf.tipo !== "entrada") continue;
      if ((nf.status || "").toLowerCase() === "canceled") continue;
      if (!["remessa_deposito", "a_fixar"].includes((nf.finalidade || "").toLowerCase())) continue;

      const romId = nf.romaneio?.id ?? nf.romaneio_id ?? null;
      const rom = romId ? romaneioApiById.get(romId) : undefined;
      if (rom?.contrato?.id || rom?.contrato_id) continue;

      const safraId = nf.safra?.id ?? nf.safra_id ?? null;
      const produtorId = nf.produtor?.id ?? nf.produtor_id ?? null;
      const clienteId = nf.cliente?.id ?? nf.cliente_id ?? null;
      const produtoId = nf.produto?.id ?? nf.produto_id ?? null;
      const culturaId = safraId ? (safraCulturaById.get(safraId) ?? null) : null;

      if (filterSafraId !== "" && safraId !== Number(filterSafraId)) continue;
      if (filterCulturaId !== "" && culturaId !== Number(filterCulturaId)) continue;
      if (filterProdutoId !== "" && produtoId !== Number(filterProdutoId)) continue;
      if (filterProdutorId !== "" && produtorId !== Number(filterProdutorId)) continue;
      if (filterClienteId !== "" && clienteId !== Number(filterClienteId)) continue;

      const searchBlob = `${nf.number} ${nf.romaneio?.code || ""} ${nf.safra?.name || ""} ${nf.produtor?.name || ""} ${nf.cliente?.name || ""} ${nf.produto?.name || ""}`.toLowerCase();
      if (textNeedle && !searchBlob.includes(textNeedle)) continue;

      const saidas = saidasByEntrada.get(nf.id) ?? [];
      const consumedKg = saidas.reduce((acc, s) => acc + Math.max(n(s.quantity_kg), 0), 0);
      const devolvidoKg = saidas
        .filter((s) => (s.finalidade || "").toLowerCase() === "devolucao")
        .reduce((acc, s) => acc + Math.max(n(s.quantity_kg), 0), 0);
      const vendidoKg = saidas
        .filter((s) => (s.finalidade || "").toLowerCase() === "venda")
        .reduce((acc, s) => acc + Math.max(n(s.quantity_kg), 0), 0);
      const saldoDisponivelKg = Math.max(n(nf.quantity_kg) - consumedKg, 0);
      const isAFixar = (nf.finalidade || "").toLowerCase() === "a_fixar";
      const saldoVendaKg = isAFixar ? saldoDisponivelKg : Math.max(devolvidoKg - vendidoKg, 0);
      out.push({
        entrada: nf,
        saldoDisponivelKg,
        saldoVendaKg,
        devolvidoKg,
        vendidoKg,
        bloqueiaVendaDireta: !isAFixar && saldoVendaKg <= 0
      });
    }
    return out.sort((a, b) => (b.entrada.date || "").localeCompare(a.entrada.date || ""));
  }, [
    notasGraos,
    romaneioApiById,
    safraCulturaById,
    filterSafraId,
    filterCulturaId,
    filterProdutoId,
    filterProdutorId,
    filterClienteId,
    q
  ]);

  function openSaidaModal(tipo: "devolucao" | "venda", entry: EntradaOperacional) {
    const now = new Date().toISOString().slice(0, 10);
    setOpError("");
    setModalSaidaType(tipo);
    setModalEntradaRef(entry);
    setSaidaForm({
      date: now,
      due_date: now,
      number: "",
      quantity_kg: "",
      price: n(entry.entrada.price) > 0 ? String(n(entry.entrada.price)) : "0",
      discount: "0"
    });
    setModalSaidaOpen(true);
  }

  async function salvarSaida() {
    if (!modalEntradaRef) return;
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const quantidadeKg = Math.max(n(saidaForm.quantity_kg), 0);
    const maxPermitida = modalSaidaType === "venda" ? modalEntradaRef.saldoVendaKg : modalEntradaRef.saldoDisponivelKg;
    if (!saidaForm.date || !saidaForm.number.trim()) {
      setOpError("Preencha Data e Nota Fiscal.");
      return;
    }
    if (quantidadeKg <= 0) {
      setOpError("Informe uma quantidade maior que zero.");
      return;
    }
    if (quantidadeKg - maxPermitida > 0.0001) {
      setOpError(
        `Quantidade acima do saldo disponível (${kg(maxPermitida)} KG).`
      );
      return;
    }
    try {
      setSavingSaida(true);
      setOpError("");
      await createNotaGraos(token, {
        tipo: "saida",
        finalidade: modalSaidaType,
        status: "pendente",
        date: saidaForm.date,
        due_date: modalSaidaType === "venda" ? saidaForm.due_date || null : null,
        number: saidaForm.number.trim().toUpperCase(),
        nota_entrada_ref_id: modalEntradaRef.entrada.id,
        romaneio_id: modalEntradaRef.entrada.romaneio?.id ?? modalEntradaRef.entrada.romaneio_id ?? null,
        safra_id: modalEntradaRef.entrada.safra?.id ?? modalEntradaRef.entrada.safra_id ?? null,
        produtor_id: modalEntradaRef.entrada.produtor?.id ?? modalEntradaRef.entrada.produtor_id ?? null,
        cliente_id: modalEntradaRef.entrada.cliente?.id ?? modalEntradaRef.entrada.cliente_id ?? null,
        produto_id: modalEntradaRef.entrada.produto?.id ?? modalEntradaRef.entrada.produto_id ?? null,
        deposito_id: modalEntradaRef.entrada.deposito?.id ?? modalEntradaRef.entrada.deposito_id ?? null,
        operacao_id: modalEntradaRef.entrada.operacao?.id ?? modalEntradaRef.entrada.operacao_id ?? null,
        quantity_kg: quantidadeKg,
        price: Math.max(n(saidaForm.price), 0),
        discount: Math.max(n(saidaForm.discount), 0)
      });
      const [nfApi, romApi] = await Promise.all([listNotasGraos(token), listRomaneiosGraos(token)]);
      setNotasGraos(nfApi);
      setRomaneiosApi(romApi);
      setModalSaidaOpen(false);
      setModalEntradaRef(null);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setOpError(err instanceof Error ? err.message : "Falha ao salvar nota de saída.");
    } finally {
      setSavingSaida(false);
    }
  }

  return (
    <AuthedAdminShell hideHeader>
      {() => (
        <div className="space-y-5">
          <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Estoque</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Estoque de produtos</h1>
              <p className="mt-1 text-sm text-zinc-300">Entradas fiscais por romaneio com contra-nota de remessa para depósito ou a fixar.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Unidade</p>
              <select
                value={unitView}
                onChange={(e) => setUnitView(e.target.value === "KG" ? "KG" : "SC")}
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[12px] font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
              >
                <option value="SC" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Sacas (SC)</option>
                <option value="KG" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Quilos (KG)</option>
              </select>
            </div>
            <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por safra, cultura, produto, produtor, cliente ou deposito..."
                  className="min-w-[260px] flex-1 rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-500/50"
                />
                <select
                  value={filterSafraId}
                  onChange={(e) => setFilterSafraId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="min-w-[210px] rounded-2xl border border-accent-500/40 bg-accent-500/15 px-3 py-2 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-400"
                >
                  <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Todas as safras</option>
                  {safras.map((s) => (
                    <option key={s.id} value={s.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterCulturaId}
                  onChange={(e) => setFilterCulturaId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="min-w-[170px] rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100 outline-none focus:border-accent-500/50"
                >
                  <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Todas culturas</option>
                  {culturas.map((c) => (
                    <option key={c.id} value={c.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterProdutoId}
                  onChange={(e) => setFilterProdutoId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="min-w-[180px] rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100 outline-none focus:border-accent-500/50"
                >
                  <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Todos produtos</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterProdutorId}
                  onChange={(e) => setFilterProdutorId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="min-w-[180px] rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100 outline-none focus:border-accent-500/50"
                >
                  <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Todos produtores</option>
                  {produtores.map((p) => (
                    <option key={p.id} value={p.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterClienteId}
                  onChange={(e) => setFilterClienteId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="min-w-[180px] rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-100 outline-none focus:border-accent-500/50"
                >
                  <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Todos clientes</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={unitView}
                  onChange={(e) => setUnitView(e.target.value === "SC" ? "SC" : "KG")}
                  className="min-w-[110px] rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-[11px] font-semibold text-zinc-100 outline-none focus:border-accent-500/50"
                >
                  <option value="KG" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>KG</option>
                  <option value="SC" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>SC</option>
                </select>
              </div>
              {error ? <p className="mt-2 text-xs text-amber-300">{error}</p> : null}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Resumo geral por produto</p>
              <p className="text-xs font-semibold text-zinc-400">{productSummary.length} produto(s)</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rounded-2xl border border-white/10 bg-zinc-950/30 p-3 xl:col-span-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Produtor</p>
                <select
                  value={filterProdutorId}
                  onChange={(e) => setFilterProdutorId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#00507a] px-2.5 py-2 text-[12px] font-semibold text-white outline-none focus:border-accent-400"
                >
                  <option value="" style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>Todos</option>
                  {produtores.map((p) => (
                    <option key={p.id} value={p.id} style={{ backgroundColor: "#e5e7eb", color: "#111827" }}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </article>

              {productSummary.map((p) => (
                <article key={p.produto} className="overflow-hidden rounded-2xl border border-white/15 bg-zinc-900/60">
                  <div className="flex items-center justify-between gap-2 px-3 py-3">
                    <ProductIcon name={p.produto} cultura={p.cultura} />
                    <div className="min-w-0 text-right">
                      <p className="truncate text-[14px] font-black leading-none text-zinc-100">{formatQtd(p.totalKg)}</p>
                      <p className="mt-1 text-[11px] text-zinc-400">{unitView}</p>
                    </div>
                  </div>
                  <div className="bg-[#00507a] px-3 py-1.5 text-center">
                    <p className="truncate text-[12px] font-black uppercase tracking-[0.12em] text-white">{p.produto}</p>
                  </div>
                </article>
              ))}
            </div>
            {!loading && productSummary.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">
                Nenhum produto com estoque para venda no filtro atual.
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Matriz de estoque por produtor/fazenda</p>
              <p className="text-xs font-semibold text-zinc-400">{matrixRows.length} linha(s)</p>
            </div>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
              <table className="min-w-[920px] w-full border-collapse text-xs text-zinc-100">
                <thead className="bg-zinc-950/45">
                  <tr className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                    <th className="whitespace-nowrap px-3 py-2 text-left">Produtor/Fazenda</th>
                    <th className="whitespace-nowrap px-3 py-2 text-left">Safra</th>
                    {matrixClients.map((c) => (
                      <th key={`head-${c}`} className="whitespace-nowrap px-2 py-2 text-center">{c}</th>
                    ))}
                    <th className="whitespace-nowrap px-3 py-2 text-right">Total ({unitView})</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((r) => (
                    <tr key={r.rowKey} className="border-t border-white/10">
                      <td className="whitespace-nowrap px-3 py-2.5">{r.produtor}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{r.safra}</td>
                      {matrixClients.map((c) => {
                        const raw = r.byCliente.get(c) ?? 0;
                        const hasValue = raw > 0;
                        return (
                          <td
                            key={`${r.rowKey}-${c}`}
                            className={`whitespace-nowrap px-2 py-2.5 text-center font-semibold ${
                              hasValue ? "bg-amber-300/75 text-zinc-900" : "text-zinc-500"
                            }`}
                          >
                            {hasValue ? formatQtd(raw) : "-"}
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-black text-zinc-100">
                        {formatQtd(r.totalKg)}
                      </td>
                    </tr>
                  ))}
                  {!loading && matrixRows.length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(3, matrixClients.length + 3)} className="px-3 py-4 text-sm text-zinc-400">
                        Sem dados para montar a matriz no filtro atual.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-white">Estoque por produtor</p>
                <p className="text-xs font-semibold text-zinc-400">{producerPivotRows.length} produtor(es)</p>
              </div>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-[560px] w-full border-collapse text-xs text-zinc-100">
                  <thead className="bg-zinc-950/45">
                    <tr className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                      <th className="whitespace-nowrap px-3 py-2 text-left">Produtor</th>
                      {productColumns.map((p) => (
                        <th key={`pp-h-${p}`} className="whitespace-nowrap px-2 py-2 text-center">{p}</th>
                      ))}
                      <th className="whitespace-nowrap px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {producerPivotRows.map((row) => (
                      <tr key={`pp-${row.produtor}`} className="border-t border-white/10">
                        <td className="whitespace-nowrap px-3 py-2.5">{row.produtor}</td>
                        {productColumns.map((p) => {
                          const v = row.byProduct.get(p) ?? 0;
                          const hasValue = v > 0;
                          return (
                            <td key={`pp-${row.produtor}-${p}`} className={`whitespace-nowrap px-2 py-2.5 text-center font-semibold ${hasValue ? "bg-amber-300/75 text-zinc-900" : "text-zinc-500"}`}>
                              {hasValue ? formatQtd(v) : "0"}
                            </td>
                          );
                        })}
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-black text-zinc-100">{formatQtd(row.totalKg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-white">Estoque por safra</p>
                <p className="text-xs font-semibold text-zinc-400">{safraPivotRows.length} safra(s)</p>
              </div>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-[560px] w-full border-collapse text-xs text-zinc-100">
                  <thead className="bg-zinc-950/45">
                    <tr className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                      <th className="whitespace-nowrap px-3 py-2 text-left">Safra</th>
                      {productColumns.map((p) => (
                        <th key={`sp-h-${p}`} className="whitespace-nowrap px-2 py-2 text-center">{p}</th>
                      ))}
                      <th className="whitespace-nowrap px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safraPivotRows.map((row) => (
                      <tr key={`sp-${row.safra}`} className="border-t border-white/10">
                        <td className="whitespace-nowrap px-3 py-2.5">{row.safra}</td>
                        {productColumns.map((p) => {
                          const v = row.byProduct.get(p) ?? 0;
                          const hasValue = v > 0;
                          return (
                            <td key={`sp-${row.safra}-${p}`} className={`whitespace-nowrap px-2 py-2.5 text-center font-semibold ${hasValue ? "bg-amber-300/75 text-zinc-900" : "text-zinc-500"}`}>
                              {hasValue ? formatQtd(v) : "0"}
                            </td>
                          );
                        })}
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-black text-zinc-100">{formatQtd(row.totalKg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Operações de saída (devolução e venda)</p>
              <p className="text-xs font-semibold text-zinc-400">{entradasOperacionais.length} entrada(s)</p>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Remessa p/ depósito: precisa devolução para liberar venda. A fixar: venda direta liberada.
            </p>
            <div className="mt-3 overflow-x-auto">
              <div className="hidden grid-cols-[78px_82px_90px_110px_1fr_120px_120px_120px_220px] gap-2 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 xl:grid">
                <div>Data</div>
                <div>Entrada</div>
                <div>Romaneio</div>
                <div>Finalidade</div>
                <div>Produto</div>
                <div>Saldo (KG)</div>
                <div>Livre venda</div>
                <div>Cliente</div>
                <div className="text-right">Ações</div>
              </div>
              <div className="mt-2 space-y-2">
                {entradasOperacionais.map((op) => {
                  const e = op.entrada;
                  const isAFixar = (e.finalidade || "").toLowerCase() === "a_fixar";
                  return (
                    <div key={e.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-2.5">
                      <div className="grid grid-cols-1 gap-2 xl:grid-cols-[78px_82px_90px_110px_1fr_120px_120px_120px_220px] xl:items-center xl:gap-2">
                        <div className="text-xs text-zinc-100">{e.date ? new Date(`${e.date}T00:00:00`).toLocaleDateString("pt-BR") : "-"}</div>
                        <div className="truncate text-xs text-zinc-100">{e.number || "-"}</div>
                        <div className="truncate text-xs text-zinc-100">{e.romaneio?.code || "-"}</div>
                        <div className="text-xs text-zinc-100">{isAFixar ? "A fixar" : "Depósito"}</div>
                        <div className="truncate text-xs text-zinc-100">{e.produto?.name || "-"}</div>
                        <div className="text-xs font-semibold text-zinc-100">{kg(op.saldoDisponivelKg)}</div>
                        <div className="text-xs font-semibold text-emerald-200">{kg(op.saldoVendaKg)}</div>
                        <div className="truncate text-xs text-zinc-100">{e.cliente?.name || "-"}</div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openSaidaModal("devolucao", op)}
                            disabled={op.saldoDisponivelKg <= 0}
                            className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Gerar nota de devolução"
                          >
                            Devolver
                          </button>
                          <button
                            onClick={() => openSaidaModal("venda", op)}
                            disabled={op.saldoVendaKg <= 0 || op.bloqueiaVendaDireta}
                            className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            title={op.bloqueiaVendaDireta ? "Faça a devolução primeiro para liberar venda." : "Gerar nota de venda"}
                          >
                            Vender
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!loading && entradasOperacionais.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">
                    Sem entradas fiscais elegíveis no filtro atual.
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Lista de estoque</p>
              <p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${rows.length} item(ns)`}</p>
            </div>
            <div className="mt-3 hidden grid-cols-[1fr_0.6fr_1.2fr_0.85fr_0.85fr_0.8fr_0.85fr_0.7fr_0.8fr] gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 xl:grid">
              <div>Safra</div>
              <div>Cultura</div>
              <div>Produtor</div>
              <div>Cliente</div>
              <div>Deposito</div>
              <div>{`Quantidade (${unitView})`}</div>
              <div>Romaneio</div>
              <div>NFP</div>
              <div>Nota fiscal</div>
            </div>
            <div className="mt-3 space-y-2">
              {rows.map((r, idx) => (
                <div key={`${r.safra}-${r.cultura}-${r.produto}-${r.produtor}-${r.cliente}-${r.deposito}-${idx}`} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3">
                  <div className="grid grid-cols-1 gap-2 xl:grid-cols-[1fr_0.6fr_1.2fr_0.85fr_0.85fr_0.8fr_0.85fr_0.7fr_0.8fr] xl:items-center xl:gap-3">
                    <div className="truncate text-xs text-zinc-100">{r.safra}</div>
                    <CulturaBadge name={r.cultura} />
                    <div className="truncate text-xs text-zinc-100">{r.produtor}</div>
                    <div className="truncate text-xs text-zinc-100">{r.cliente}</div>
                    <div className="truncate text-xs text-zinc-100">{r.deposito}</div>
                    <div className="truncate text-xs font-semibold text-zinc-100">{formatQtd(r.quantidade)}</div>
                    <div className="truncate text-xs text-zinc-100">{r.romaneioCodes.join(", ") || "-"}</div>
                    <div className="truncate text-xs text-zinc-100">{r.nfpRefs.join(", ") || "-"}</div>
                    <div className="truncate text-xs text-zinc-100">{r.notaFiscalRefs.join(", ") || "-"}</div>
                  </div>
                </div>
              ))}
              {!loading && rows.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-300">
                  Sem movimentações de romaneio com contra-nota (remessa para depósito/a fixar) para os filtros selecionados.
                </div>
              ) : null}
            </div>
          </section>

          {modalSaidaOpen && modalEntradaRef ? (
            <div className="fixed inset-0 z-[80] grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/75" onClick={() => setModalSaidaOpen(false)} aria-label="Fechar modal de saída" />
              <div className="relative w-full max-w-3xl rounded-3xl border border-white/15 bg-zinc-900/95 p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-white">
                      {modalSaidaType === "devolucao" ? "Nova devolução de depósito" : "Nova venda de grãos"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Entrada {modalEntradaRef.entrada.number} • Romaneio {modalEntradaRef.entrada.romaneio?.code || "-"} • Produto {modalEntradaRef.entrada.produto?.name || "-"}
                    </p>
                  </div>
                  <button onClick={() => setModalSaidaOpen(false)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200">
                    Fechar
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-zinc-950/35 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Saldo da entrada</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">{kg(modalEntradaRef.saldoDisponivelKg)} KG</p>
                  </div>
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">Saldo livre para venda</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-100">{kg(modalEntradaRef.saldoVendaKg)} KG</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/35 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Movimentado</p>
                    <p className="mt-1 text-sm text-zinc-100">Dev.: {kg(modalEntradaRef.devolvidoKg)} • Vend.: {kg(modalEntradaRef.vendidoKg)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Data</label>
                    <input type="date" value={saidaForm.date} onChange={(e) => setSaidaForm((p) => ({ ...p, date: e.target.value }))} className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark]" />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Nota Fiscal</label>
                    <input value={saidaForm.number} onChange={(e) => setSaidaForm((p) => ({ ...p, number: e.target.value.toUpperCase() }))} className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100" />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Quantidade (KG)</label>
                    <input value={saidaForm.quantity_kg} onChange={(e) => setSaidaForm((p) => ({ ...p, quantity_kg: e.target.value }))} className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-right text-sm text-zinc-100" />
                  </div>
                  {modalSaidaType === "venda" ? (
                    <>
                      <div className="grid gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Vencimento</label>
                        <input type="date" value={saidaForm.due_date} onChange={(e) => setSaidaForm((p) => ({ ...p, due_date: e.target.value }))} className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark]" />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Preço</label>
                        <input value={saidaForm.price} onChange={(e) => setSaidaForm((p) => ({ ...p, price: e.target.value }))} className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-right text-sm text-zinc-100" />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Desconto</label>
                        <input value={saidaForm.discount} onChange={(e) => setSaidaForm((p) => ({ ...p, discount: e.target.value }))} className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-right text-sm text-zinc-100" />
                      </div>
                    </>
                  ) : null}
                </div>

                {opError ? <p className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{opError}</p> : null}

                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setModalSaidaOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-zinc-200">
                    Cancelar
                  </button>
                  <button
                    onClick={salvarSaida}
                    disabled={savingSaida}
                    className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingSaida ? "Salvando..." : "Confirmar saída"}
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
