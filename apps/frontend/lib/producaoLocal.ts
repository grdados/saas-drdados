"use client";

export type UnidadeProducao = "KG" | "SC";

export type EmpreendimentoItem = {
  id: string;
  talhao_id: number | null;
  produto_id: number | null;
  cultivar_id: number | null;
  unit: UnidadeProducao;
  area_ha: number;
  produtividade: number;
  plant_date: string;
  close_date: string;
  production_sc: number;
  production_kg: number;
};

export type Empreendimento = {
  id: string;
  created_at: string;
  updated_at: string;
  date: string;
  code: string;
  safra_id: number | null;
  propriedade_id: number | null;
  produto_id: number | null;
  centro_custo_id: number | null;
  unit: UnidadeProducao;
  sale_price: number;
  billing_value: number;
  status: "in_progress" | "closed";
  notes: string;
  items: EmpreendimentoItem[];
};

export type Romaneio = {
  id: string;
  created_at: string;
  updated_at: string;
  date: string;
  code: string;
  nfp: string;
  operacao_id: number | null;
  safra_id: number | null;
  produtor_id: number | null;
  contrato_id: number | null;
  empreendimento_id: string | null;
  propriedade_id: number | null;
  talhao_id: number | null;
  cliente_id: number | null;
  transportador_id: number | null;
  deposito: string;
  plate: string;
  driver: string;
  driver_cpf: string;
  weight: number;
  tare: number;
  gross_weight: number;
  humidity: number;
  impurity: number;
  ardido: number;
  others: number;
  net_weight: number;
};

const EMPREENDIMENTOS_KEY = "grdados.producao.empreendimentos.v1";
const ROMANEIOS_KEY = "grdados.producao.romaneios.v1";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // noop
  }
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function loadEmpreendimentos() {
  return safeRead<Empreendimento[]>(EMPREENDIMENTOS_KEY, []);
}

export function saveEmpreendimentos(rows: Empreendimento[]) {
  safeWrite(EMPREENDIMENTOS_KEY, rows);
}

export function loadRomaneios() {
  return safeRead<Romaneio[]>(ROMANEIOS_KEY, []);
}

export function saveRomaneios(rows: Romaneio[]) {
  safeWrite(ROMANEIOS_KEY, rows);
}

export function calcItemProduction(unit: UnidadeProducao, areaHa: number, produtividade: number) {
  const area = Number.isFinite(areaHa) ? areaHa : 0;
  const prod = Number.isFinite(produtividade) ? produtividade : 0;
  const base = Math.max(area * prod, 0);
  if (unit === "KG") {
    return { production_kg: base, production_sc: base / 60 };
  }
  return { production_sc: base, production_kg: base * 60 };
}

export function calcRomaneioNetWeight(weight: number, tare: number, humidity: number, impurity: number, ardido: number, others: number) {
  const gross = Math.max((Number.isFinite(weight) ? weight : 0) - (Number.isFinite(tare) ? tare : 0), 0);
  const disc =
    Math.max(Number.isFinite(humidity) ? humidity : 0, 0) +
    Math.max(Number.isFinite(impurity) ? impurity : 0, 0) +
    Math.max(Number.isFinite(ardido) ? ardido : 0, 0) +
    Math.max(Number.isFinite(others) ? others : 0, 0);
  return Math.max(gross - disc, 0);
}

