"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthedAdminShell } from "@/components/AuthedAdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  ClienteGerencial,
  ContratoVenda,
  Operacao,
  Produtor,
  Propriedade,
  Safra,
  Talhao,
  isApiError,
  listClientesGerencial,
  listContratosVenda,
  listOperacoes,
  listProdutores,
  listPropriedades,
  listSafras,
  listTalhoes
} from "@/lib/api";
import { formatDateBR } from "@/lib/locale";
import {
  Empreendimento,
  Romaneio,
  calcRomaneioNetWeight,
  loadEmpreendimentos,
  loadRomaneios,
  saveRomaneios,
  uid
} from "@/lib/producaoLocal";

function n(v: unknown) {
  const x = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}
function d(value: string) {
  if (!value) return "-";
  const dt = new Date(`${value}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? value : formatDateBR(dt);
}

type FormState = {
  date: string;
  code: string;
  nfp: string;
  operacao_id: string;
  safra_id: string;
  produtor_id: string;
  contrato_id: string;
  empreendimento_id: string;
  propriedade_id: string;
  talhao_id: string;
  cliente_id: string;
  plate: string;
  driver: string;
  weight: string;
  tare: string;
  gross_weight: string;
  humidity: string;
  impurity: string;
  ardido: string;
  others: string;
};

const EMPTY_FORM: FormState = {
  date: "",
  code: "",
  nfp: "",
  operacao_id: "",
  safra_id: "",
  produtor_id: "",
  contrato_id: "",
  empreendimento_id: "",
  propriedade_id: "",
  talhao_id: "",
  cliente_id: "",
  plate: "",
  driver: "",
  weight: "0",
  tare: "0",
  gross_weight: "0",
  humidity: "0",
  impurity: "0",
  ardido: "0",
  others: "0"
};

export default function RomaneioPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [rows, setRows] = useState<Romaneio[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);

  const [safras, setSafras] = useState<Safra[]>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [contratos, setContratos] = useState<ContratoVenda[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [clientes, setClientes] = useState<ClienteGerencial[]>([]);

  useEffect(() => {
    setRows(loadRomaneios());
    setEmpreendimentos(loadEmpreendimentos());
    void loadRefs();
  }, []);

  async function loadRefs() {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [a, b, c, d, e, f, g] = await Promise.all([
        listSafras(token),
        listProdutores(token),
        listContratosVenda(token),
        listOperacoes(token),
        listPropriedades(token),
        listTalhoes(token),
        listClientesGerencial(token)
      ]);
      setSafras(a);
      setProdutores(b);
      setContratos(c);
      setOperacoes(d);
      setPropriedades(e);
      setTalhoes(f);
      setClientes(g);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Falha ao carregar referências.");
    } finally {
      setLoading(false);
    }
  }

  const card = useMemo(() => {
    const totalNet = rows.reduce((acc, r) => acc + n(r.net_weight), 0);
    const avgNet = rows.length ? totalNet / rows.length : 0;
    return { totalNet, avgNet };
  }, [rows]);

  const netWeight = useMemo(
    () => calcRomaneioNetWeight(n(form.gross_weight), n(form.tare), n(form.humidity), n(form.impurity), n(form.ardido), n(form.others)),
    [form]
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function removeItem(id: string) {
    if (!window.confirm("Excluir romaneio?")) return;
    const next = rows.filter((x) => x.id !== id);
    setRows(next);
    saveRomaneios(next);
  }

  function save() {
    if (!form.code.trim()) {
      setError("Informe o número do romaneio.");
      return;
    }
    if (!window.confirm("Confirmar registro do romaneio?")) return;

    setSaving(true);
    setError("");
    try {
      const now = new Date().toISOString();
      const entity: Romaneio = {
        id: uid("rom"),
        created_at: now,
        updated_at: now,
        date: form.date,
        code: form.code.trim().toUpperCase(),
        nfp: form.nfp.trim().toUpperCase(),
        operacao_id: form.operacao_id ? Number(form.operacao_id) : null,
        safra_id: form.safra_id ? Number(form.safra_id) : null,
        produtor_id: form.produtor_id ? Number(form.produtor_id) : null,
        contrato_id: form.contrato_id ? Number(form.contrato_id) : null,
        empreendimento_id: form.empreendimento_id || null,
        propriedade_id: form.propriedade_id ? Number(form.propriedade_id) : null,
        talhao_id: form.talhao_id ? Number(form.talhao_id) : null,
        cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
        plate: form.plate.trim().toUpperCase(),
        driver: form.driver.trim(),
        weight: n(form.weight),
        tare: n(form.tare),
        gross_weight: n(form.gross_weight),
        humidity: n(form.humidity),
        impurity: n(form.impurity),
        ardido: n(form.ardido),
        others: n(form.others),
        net_weight: netWeight
      };
      const next = [entity, ...rows];
      setRows(next);
      saveRomaneios(next);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const optionStyle = { backgroundColor: "#e5e7eb", color: "#111827" } as const;

  return (
    <AuthedAdminShell>
      {() => (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Produção</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Romaneio</h1>
            <p className="mt-1 text-sm text-zinc-300">Registro de produção por propriedade e talhão para cálculo e realização.</p>
          </div>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/55 p-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button onClick={openCreate} className="rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400">Novo romaneio</button>
            </div>
            {error ? <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">{error}</div> : null}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/15 bg-white/5 p-4"><p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Registros</p><p className="mt-2 text-2xl font-black text-white">{rows.length}</p></div>
            <div className="rounded-3xl border border-sky-400/30 bg-sky-500/10 p-4"><p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Peso líquido total</p><p className="mt-2 text-2xl font-black text-white">{card.totalNet.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG</p></div>
            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-4"><p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Média por romaneio</p><p className="mt-2 text-2xl font-black text-white">{card.avgNet.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KG</p></div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-black text-white">Lista</p><p className="text-xs font-semibold text-zinc-400">{loading ? "Carregando..." : `${rows.length} item(ns)`}</p></div>
            <div className="mt-3 overflow-x-auto">
              <div className="hidden min-w-[1440px] grid-cols-[110px_120px_120px_140px_140px_160px_140px_120px_120px_170px] gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 xl:grid">
                <div>Data</div><div>Romaneio</div><div>NFP</div><div>Produtor</div><div>Contrato</div><div>Empreendimento</div><div>Talhão</div><div>Peso Bruto</div><div>Peso Líquido</div><div className="text-right">Ações</div>
              </div>
              <div className="mt-3 space-y-2 xl:min-w-[1440px]">
                {rows.map((r) => {
                  const produtor = produtores.find((p) => p.id === r.produtor_id)?.name ?? "-";
                  const contrato = contratos.find((c) => c.id === r.contrato_id)?.code ?? "-";
                  const emp = empreendimentos.find((e) => e.id === r.empreendimento_id)?.code ?? "-";
                  const talhao = talhoes.find((t) => t.id === r.talhao_id)?.name ?? "-";
                  return <div key={r.id} className="rounded-2xl border border-white/10 bg-zinc-950/35 px-3 py-3"><div className="grid grid-cols-1 gap-2 xl:grid-cols-[110px_120px_120px_140px_140px_160px_140px_120px_120px_170px] xl:items-center xl:gap-3"><div className="text-sm text-zinc-100">{d(r.date)}</div><div className="text-sm font-black text-zinc-100">{r.code}</div><div className="text-sm text-zinc-100">{r.nfp || "-"}</div><div className="truncate text-sm text-zinc-100">{produtor}</div><div className="truncate text-sm text-zinc-100">{contrato}</div><div className="truncate text-sm text-zinc-100">{emp}</div><div className="truncate text-sm text-zinc-100">{talhao}</div><div className="text-sm text-zinc-100">{r.gross_weight.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div><div className="text-sm font-black text-zinc-100">{r.net_weight.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div><div className="text-right"><button onClick={() => removeItem(r.id)} className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-2 text-rose-200 hover:bg-rose-500/20" title="Excluir" aria-label="Excluir"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg></button></div></div></div>;
                })}
              </div>
            </div>
          </section>

          {open ? (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <button className="absolute inset-0 bg-zinc-950/60" onClick={() => setOpen(false)} aria-label="Fechar" />
              <div className="relative w-full max-w-[1380px] max-h-[92vh] overflow-auto rounded-3xl border border-white/15 bg-zinc-900/95 p-5 space-y-4">
                <p className="text-sm font-black text-white">Novo romaneio</p>
                <div className="grid gap-3 lg:grid-cols-5">
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Data</label><input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 [color-scheme:dark]" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Romaneio</label><input value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase())} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">NFP</label><input value={form.nfp} onChange={(e) => setField("nfp", e.target.value.toUpperCase())} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Operação</label><select value={form.operacao_id} onChange={(e) => setField("operacao_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{operacoes.map((o) => <option key={o.id} value={o.id} style={optionStyle}>{o.name}</option>)}</select></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Safra</label><select value={form.safra_id} onChange={(e) => setField("safra_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{safras.map((s) => <option key={s.id} value={s.id} style={optionStyle}>{s.name}</option>)}</select></div>
                </div>

                <div className="grid gap-3 lg:grid-cols-6">
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Produtor</label><select value={form.produtor_id} onChange={(e) => setField("produtor_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{produtores.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}</select></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Contrato</label><select value={form.contrato_id} onChange={(e) => setField("contrato_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{contratos.map((c) => <option key={c.id} value={c.id} style={optionStyle}>{c.code}</option>)}</select></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Empreendimento</label><select value={form.empreendimento_id} onChange={(e) => setField("empreendimento_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{empreendimentos.map((e) => <option key={e.id} value={e.id} style={optionStyle}>{e.code}</option>)}</select></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Propriedade</label><select value={form.propriedade_id} onChange={(e) => setField("propriedade_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{propriedades.map((p) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}</select></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Talhão</label><select value={form.talhao_id} onChange={(e) => setField("talhao_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{talhoes.filter((t) => !form.propriedade_id || t.propriedade?.id === Number(form.propriedade_id)).map((t) => <option key={t.id} value={t.id} style={optionStyle}>{t.name}</option>)}</select></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Cliente</label><select value={form.cliente_id} onChange={(e) => setField("cliente_id", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100"><option value="" style={optionStyle}>Selecione</option>{clientes.map((c) => <option key={c.id} value={c.id} style={optionStyle}>{c.name}</option>)}</select></div>
                </div>

                <div className="grid gap-3 lg:grid-cols-6">
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Placa</label><input value={form.plate} onChange={(e) => setField("plate", e.target.value.toUpperCase())} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Motorista</label><input value={form.driver} onChange={(e) => setField("driver", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Peso</label><input value={form.weight} onChange={(e) => setField("weight", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Tara</label><input value={form.tare} onChange={(e) => setField("tare", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Peso Bruto</label><input value={form.gross_weight} onChange={(e) => setField("gross_weight", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Peso Líquido</label><input readOnly value={netWeight.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} className="rounded-2xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-right text-sm font-black text-zinc-100" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Umidade %</label><input value={form.humidity} onChange={(e) => setField("humidity", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Impureza %</label><input value={form.impurity} onChange={(e) => setField("impurity", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Ardido %</label><input value={form.ardido} onChange={(e) => setField("ardido", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                  <div className="grid gap-2"><label className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Outros %</label><input value={form.others} onChange={(e) => setField("others", e.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-right text-sm text-zinc-100" /></div>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-200">Cancelar</button>
                  <button onClick={save} disabled={saving} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-2.5 text-sm font-black text-emerald-100">{saving ? "Salvando..." : "Salvar"}</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AuthedAdminShell>
  );
}
