export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type JsonValue = Record<string, unknown>;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && (err as ApiError).name === "ApiError" && typeof (err as ApiError).status === "number";
}

function extractErrorMessage(payloadText: string): string {
  const trimmed = (payloadText || "").trim();
  if (!trimmed) return "Erro na requisicao.";

  try {
    const json = JSON.parse(trimmed) as unknown;
    if (typeof json === "string") return json;
    if (json && typeof json === "object") {
      const obj = json as Record<string, unknown>;
      const detail = typeof obj.detail === "string" ? obj.detail : "";
      const errorId = typeof obj.error_id === "string" ? obj.error_id : "";
      if (detail) return errorId ? `${detail} (error_id: ${errorId})` : detail;

      const firstKey = Object.keys(obj)[0];
      const firstVal = firstKey ? obj[firstKey] : undefined;
      if (typeof firstVal === "string") return firstVal;
      if (Array.isArray(firstVal) && typeof firstVal[0] === "string") return firstVal[0];
    }
  } catch {
    // ignore JSON parse failures
  }

  return trimmed;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {})
      }
    });
  } catch (err) {
    const hint =
      "Falha de rede/CORS ao chamar a API. Confirme `NEXT_PUBLIC_API_URL` no Vercel e `CORS_ALLOWED_ORIGINS` no Render.";
    const details = err instanceof Error ? err.message : String(err);
    throw new ApiError(`${hint} (${details})`, 0);
  }

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new ApiError(extractErrorMessage(errorPayload), response.status);
  }

  return (await response.json()) as T;
}

export function login(payload: { username: string; password: string }) {
  return request<{ access: string; refresh: string }>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function register(payload: { name: string; email: string; password: string; company_name: string }) {
  return request<{ detail: string }>("/api/accounts/register/", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getMe(token: string) {
  return request<{ id: number; name: string; email: string; company: JsonValue | null; profile?: JsonValue }>(
    "/api/accounts/me/",
    { method: "GET" },
    token
  );
}

export function updateMe(token: string, payload: { avatar_url?: string }) {
  return request<JsonValue>(
    "/api/accounts/me/",
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    token
  );
}

export function listLeads(token: string) {
  return request<Array<JsonValue>>("/api/crm/leads/", { method: "GET" }, token);
}

export function createLead(
  token: string,
  payload: { name: string; email?: string; phone?: string; stage?: string; notes?: string }
) {
  return request<JsonValue>(
    "/api/crm/leads/",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    token
  );
}

export function listTasks(token: string) {
  return request<Array<JsonValue>>("/api/crm/tasks/", { method: "GET" }, token);
}

export function createTask(token: string, payload: { title: string; description?: string; status?: string }) {
  return request<JsonValue>(
    "/api/crm/tasks/",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    token
  );
}

export function getMySubscription(token: string) {
  return request<JsonValue>("/api/billing/subscriptions/me/", { method: "GET" }, token);
}

export function createSubscription(
  token: string,
  payload: { value: number; billing_type?: string; cycle?: string; description?: string }
) {
  return request<JsonValue>(
    "/api/billing/subscriptions/create/",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    token
  );
}

export function submitProjectIntake(payload: Record<string, unknown>) {
  return request<{
    id: number;
    score: number;
    temperature: string;
    lead_created: boolean;
    lead_id: number | null;
    whatsapp_message: string;
  }>("/api/public/project-intake/", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// ERP - Cadastros (base)
export type Cultura = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function listCulturas(token: string) {
  return request<Cultura[]>("/api/erp/culturas/", { method: "GET" }, token);
}

export function createCultura(token: string, payload: { name: string; is_active?: boolean }) {
  return request<Cultura>(
    "/api/erp/culturas/",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    token
  );
}

export function updateCultura(token: string, id: number, payload: { name?: string; is_active?: boolean }) {
  return request<Cultura>(
    `/api/erp/culturas/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    token
  );
}

export type Safra = {
  id: number;
  name: string;
  year: number | null;
  start_date: string | null;
  end_date: string | null;
  status: "in_progress" | "finished";
  cultura: { id: number; name: string } | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function listSafras(token: string) {
  return request<Safra[]>("/api/erp/safras/", { method: "GET" }, token);
}

export function createSafra(
  token: string,
  payload: {
    name: string;
    year?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    cultura_id?: number | null;
    status?: "in_progress" | "finished";
    is_active?: boolean;
  }
) {
  return request<Safra>(
    "/api/erp/safras/",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    token
  );
}

export function updateSafra(
  token: string,
  id: number,
  payload: Partial<{
    name: string;
    year: number | null;
    start_date: string | null;
    end_date: string | null;
    cultura_id: number | null;
    status: "in_progress" | "finished";
    is_active: boolean;
  }>
) {
  return request<Safra>(
    `/api/erp/safras/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    token
  );
}

export type Cultivar = {
  id: number;
  name: string;
  description: string;
  cycle: string;
  maturity: string;
  region_indicated: string;
  brand: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function listCultivares(token: string) {
  return request<Cultivar[]>("/api/erp/estoque/cultivares/", { method: "GET" }, token);
}

export function createCultivar(
  token: string,
  payload: Partial<Pick<Cultivar, "name" | "description" | "cycle" | "maturity" | "region_indicated" | "brand" | "is_active">>
) {
  return request<Cultivar>(
    "/api/erp/estoque/cultivares/",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    token
  );
}

export function updateCultivar(
  token: string,
  id: number,
  payload: Partial<Pick<Cultivar, "name" | "description" | "cycle" | "maturity" | "region_indicated" | "brand" | "is_active">>
) {
  return request<Cultivar>(
    `/api/erp/estoque/cultivares/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    token
  );
}

export type CentroCusto = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function listCentrosCusto(token: string) {
  return request<CentroCusto[]>("/api/erp/centros-custo/", { method: "GET" }, token);
}
export function createCentroCusto(token: string, payload: { name: string; is_active?: boolean }) {
  return request<CentroCusto>(
    "/api/erp/centros-custo/",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}
export function updateCentroCusto(token: string, id: number, payload: { name?: string; is_active?: boolean }) {
  return request<CentroCusto>(
    `/api/erp/centros-custo/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export type Fabricante = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listFabricantes(token: string) {
  return request<Fabricante[]>("/api/erp/estoque/fabricantes/", { method: "GET" }, token);
}
export function createFabricante(token: string, payload: { name: string; is_active?: boolean }) {
  return request<Fabricante>(
    "/api/erp/estoque/fabricantes/",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}
export function updateFabricante(token: string, id: number, payload: { name?: string; is_active?: boolean }) {
  return request<Fabricante>(
    `/api/erp/estoque/fabricantes/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export type Banco = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listBancos(token: string) {
  return request<Banco[]>("/api/erp/financeiro/bancos/", { method: "GET" }, token);
}
export function createBanco(token: string, payload: { name: string; is_active?: boolean }) {
  return request<Banco>("/api/erp/financeiro/bancos/", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateBanco(token: string, id: number, payload: { name?: string; is_active?: boolean }) {
  return request<Banco>(`/api/erp/financeiro/bancos/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export type Caixa = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listCaixas(token: string) {
  return request<Caixa[]>("/api/erp/financeiro/caixas/", { method: "GET" }, token);
}
export function createCaixa(token: string, payload: { name: string; is_active?: boolean }) {
  return request<Caixa>("/api/erp/financeiro/caixas/", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateCaixa(token: string, id: number, payload: { name?: string; is_active?: boolean }) {
  return request<Caixa>(`/api/erp/financeiro/caixas/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export type Moeda = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listMoedas(token: string) {
  return request<Moeda[]>("/api/erp/financeiro/moedas/", { method: "GET" }, token);
}
export function createMoeda(token: string, payload: { name: string; is_active?: boolean }) {
  return request<Moeda>("/api/erp/financeiro/moedas/", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateMoeda(token: string, id: number, payload: { name?: string; is_active?: boolean }) {
  return request<Moeda>(`/api/erp/financeiro/moedas/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export type Produtor = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listProdutores(token: string) {
  return request<Produtor[]>("/api/erp/produtores/", { method: "GET" }, token);
}

export type Operacao = {
  id: number;
  name: string;
  kind: "credit" | "debit" | "transfer";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listOperacoes(token: string) {
  return request<Operacao[]>("/api/erp/operacoes/", { method: "GET" }, token);
}
export function createOperacao(
  token: string,
  payload: { name: string; kind: Operacao["kind"]; is_active?: boolean }
) {
  return request<Operacao>("/api/erp/operacoes/", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateOperacao(
  token: string,
  id: number,
  payload: Partial<{ name: string; kind: Operacao["kind"]; is_active: boolean }>
) {
  return request<Operacao>(`/api/erp/operacoes/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export type CondicaoFinanceira = {
  id: number;
  name: string;
  dias: number;
  parcelas: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listCondicoesFinanceiras(token: string) {
  return request<CondicaoFinanceira[]>("/api/erp/financeiro/condicoes/", { method: "GET" }, token);
}
export function createCondicaoFinanceira(
  token: string,
  payload: { name: string; dias: number; parcelas: number; is_active?: boolean }
) {
  return request<CondicaoFinanceira>(
    "/api/erp/financeiro/condicoes/",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}
export function updateCondicaoFinanceira(
  token: string,
  id: number,
  payload: Partial<{ name: string; dias: number; parcelas: number; is_active: boolean }>
) {
  return request<CondicaoFinanceira>(
    `/api/erp/financeiro/condicoes/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export type ContaFinanceira = {
  id: number;
  name: string;
  agencia: string;
  banco: { id: number; name: string } | null;
  banco_id?: number | null;
  produtor: { id: number; name: string } | null;
  produtor_id?: number | null;
  saldo_inicial: string;
  limite: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listContas(token: string) {
  return request<ContaFinanceira[]>("/api/erp/financeiro/contas/", { method: "GET" }, token);
}
export function createConta(
  token: string,
  payload: {
    name: string;
    agencia?: string;
    banco_id?: number | null;
    produtor_id?: number | null;
    saldo_inicial?: string | number;
    limite?: string | number;
    is_active?: boolean;
  }
) {
  return request<ContaFinanceira>(
    "/api/erp/financeiro/contas/",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}
export function updateConta(
  token: string,
  id: number,
  payload: Partial<{
    name: string;
    agencia: string;
    banco_id: number | null;
    produtor_id: number | null;
    saldo_inicial: string | number;
    limite: string | number;
    is_active: boolean;
  }>
) {
  return request<ContaFinanceira>(
    `/api/erp/financeiro/contas/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}
