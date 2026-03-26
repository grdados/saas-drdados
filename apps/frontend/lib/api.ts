import { clearTokens, getRefreshToken, saveTokens } from "@/lib/auth";

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

async function rawRequest(path: string, options: RequestInit = {}, token?: string): Promise<Response> {
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

  return response;
}

async function tryRefreshToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const resp = await rawRequest("/api/auth/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh })
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { access?: string };
    if (!data?.access) return null;
    saveTokens(data.access, refresh);
    return data.access;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response = await rawRequest(path, options, token);

  if (response.status === 401 && token) {
    const newAccess = await tryRefreshToken();
    if (newAccess) {
      response = await rawRequest(path, options, newAccess);
    } else {
      clearTokens();
    }
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
  year: string | number | null;
  start_date: string | null;
  end_date: string | null;
  status: "in_progress" | "finished" | "IN_PROGRESS" | "FINISHED";
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
    year?: string | number | null;
    start_date?: string | null;
    end_date?: string | null;
    cultura_id?: number | null;
    status?: "in_progress" | "finished" | "IN_PROGRESS" | "FINISHED";
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
    year: string | number | null;
    start_date: string | null;
    end_date: string | null;
    cultura_id: number | null;
    status: "in_progress" | "finished" | "IN_PROGRESS" | "FINISHED";
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
  cultura: { id: number; name: string } | null;
  cultura_id?: number | null;
  fabricante: { id: number; name: string } | null;
  fabricante_id?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function listCultivares(token: string) {
  return request<Cultivar[]>("/api/erp/estoque/cultivares/", { method: "GET" }, token);
}

export function createCultivar(
  token: string,
  payload: Partial<
    Pick<Cultivar, "name" | "description" | "cycle" | "maturity" | "region_indicated" | "brand" | "is_active"> & {
      cultura_id: number | null;
      fabricante_id: number | null;
    }
  >
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
  payload: Partial<
    Pick<Cultivar, "name" | "description" | "cycle" | "maturity" | "region_indicated" | "brand" | "is_active"> & {
      cultura_id: number | null;
      fabricante_id: number | null;
    }
  >
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

export type Categoria = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listCategorias(token: string) {
  return request<Categoria[]>("/api/erp/estoque/categorias/", { method: "GET" }, token);
}
export function createCategoria(token: string, payload: { name: string; is_active?: boolean }) {
  return request<Categoria>(
    "/api/erp/estoque/categorias/",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}
export function updateCategoria(token: string, id: number, payload: { name?: string; is_active?: boolean }) {
  return request<Categoria>(
    `/api/erp/estoque/categorias/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export type Insumo = {
  id: number;
  name: string;
  short_description: string;
  unit: string;
  categoria: { id: number; name: string } | null;
  categoria_id?: number | null;
  cultura: { id: number; name: string } | null;
  cultura_id?: number | null;
  fabricante: { id: number; name: string } | null;
  fabricante_id?: number | null;
  centro_custo: { id: number; name: string } | null;
  centro_custo_id?: number | null;
  has_seed_treatment: boolean;
  tox_class: string;
  active_ingredient: string;
  dose: string;
  density: string;
  mapa_registry: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listInsumos(token: string) {
  return request<Insumo[]>("/api/erp/estoque/insumos/", { method: "GET" }, token);
}
export function createInsumo(
  token: string,
  payload: Partial<{
    name: string;
    short_description: string;
    unit: string;
    categoria_id: number | null;
    cultura_id: number | null;
    fabricante_id: number | null;
    centro_custo_id: number | null;
    has_seed_treatment: boolean;
    tox_class: string;
    active_ingredient: string;
    dose: string;
    density: string;
    mapa_registry: string;
    is_active: boolean;
  }>
) {
  return request<Insumo>("/api/erp/estoque/insumos/", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateInsumo(
  token: string,
  id: number,
  payload: Partial<{
    name: string;
    short_description: string;
    unit: string;
    categoria_id: number | null;
    cultura_id: number | null;
    fabricante_id: number | null;
    centro_custo_id: number | null;
    has_seed_treatment: boolean;
    tox_class: string;
    active_ingredient: string;
    dose: string;
    density: string;
    mapa_registry: string;
    is_active: boolean;
  }>
) {
  return request<Insumo>(`/api/erp/estoque/insumos/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export type Peca = {
  id: number;
  name: string;
  short_description: string;
  unit: string;
  categoria: { id: number; name: string } | null;
  categoria_id?: number | null;
  cultura: { id: number; name: string } | null;
  cultura_id?: number | null;
  fabricante: { id: number; name: string } | null;
  fabricante_id?: number | null;
  centro_custo: { id: number; name: string } | null;
  centro_custo_id?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listPecas(token: string) {
  return request<Peca[]>("/api/erp/estoque/pecas/", { method: "GET" }, token);
}
export function createPeca(
  token: string,
  payload: Partial<{
    name: string;
    short_description: string;
    unit: string;
    categoria_id: number | null;
    cultura_id: number | null;
    fabricante_id: number | null;
    centro_custo_id: number | null;
    is_active: boolean;
  }>
) {
  return request<Peca>("/api/erp/estoque/pecas/", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updatePeca(
  token: string,
  id: number,
  payload: Partial<{
    name: string;
    short_description: string;
    unit: string;
    categoria_id: number | null;
    cultura_id: number | null;
    fabricante_id: number | null;
    centro_custo_id: number | null;
    is_active: boolean;
  }>
) {
  return request<Peca>(`/api/erp/estoque/pecas/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export type ProdutoItem = {
  id: number;
  name: string;
  short_description: string;
  unit: string;
  categoria: { id: number; name: string } | null;
  categoria_id?: number | null;
  cultura: { id: number; name: string } | null;
  cultura_id?: number | null;
  centro_custo: { id: number; name: string } | null;
  centro_custo_id?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listProdutosEstoque(token: string) {
  return request<ProdutoItem[]>("/api/erp/estoque/produtos/", { method: "GET" }, token);
}
export function createProdutoEstoque(
  token: string,
  payload: Partial<{
    name: string;
    short_description: string;
    unit: string;
    categoria_id: number | null;
    cultura_id: number | null;
    centro_custo_id: number | null;
    is_active: boolean;
  }>
) {
  return request<ProdutoItem>("/api/erp/estoque/produtos/", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateProdutoEstoque(
  token: string,
  id: number,
  payload: Partial<{
    name: string;
    short_description: string;
    unit: string;
    categoria_id: number | null;
    cultura_id: number | null;
    centro_custo_id: number | null;
    is_active: boolean;
  }>
) {
  return request<ProdutoItem>(
    `/api/erp/estoque/produtos/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export type ClienteGerencial = {
  id: number;
  name: string;
  doc: string;
  ie: string;
  address: string;
  cep: string;
  city: string;
  uf: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listClientesGerencial(token: string) {
  return request<ClienteGerencial[]>("/api/erp/clientes/", { method: "GET" }, token);
}
export function createClienteGerencial(
  token: string,
  payload: Partial<{
    name: string;
    doc: string;
    ie: string;
    address: string;
    cep: string;
    city: string;
    uf: string;
    is_active: boolean;
  }>
) {
  return request<ClienteGerencial>("/api/erp/clientes/", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateClienteGerencial(
  token: string,
  id: number,
  payload: Partial<{
    name: string;
    doc: string;
    ie: string;
    address: string;
    cep: string;
    city: string;
    uf: string;
    is_active: boolean;
  }>
) {
  return request<ClienteGerencial>(`/api/erp/clientes/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export type FornecedorGerencial = {
  id: number;
  name: string;
  doc: string;
  ie: string;
  address: string;
  cep: string;
  city: string;
  uf: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listFornecedoresGerencial(token: string) {
  return request<FornecedorGerencial[]>("/api/erp/fornecedores/", { method: "GET" }, token);
}
export function createFornecedorGerencial(
  token: string,
  payload: Partial<{
    name: string;
    doc: string;
    ie: string;
    address: string;
    cep: string;
    city: string;
    uf: string;
    is_active: boolean;
  }>
) {
  return request<FornecedorGerencial>(
    "/api/erp/fornecedores/",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}
export function updateFornecedorGerencial(
  token: string,
  id: number,
  payload: Partial<{
    name: string;
    doc: string;
    ie: string;
    address: string;
    cep: string;
    city: string;
    uf: string;
    is_active: boolean;
  }>
) {
  return request<FornecedorGerencial>(
    `/api/erp/fornecedores/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export type GrupoCompra = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listGruposCompra(token: string) {
  return request<GrupoCompra[]>("/api/erp/grupos-compra/", { method: "GET" }, token);
}

export type PedidoCompraItem = {
  id: number;
  produto: { id: number; name: string } | null;
  produto_id?: number | null;
  unit: string;
  quantity: string; // DRF Decimal -> string
  received_quantity?: string; // DRF Decimal -> string
  price: string; // DRF Decimal -> string
  discount: string; // DRF Decimal -> string
  total_item: string; // DRF Decimal -> string
  status?: string;
  created_at: string;
  updated_at: string;
};

export type PedidoCompra = {
  id: number;
  date: string | null;
  code: string;
  grupo: { id: number; name: string } | null;
  grupo_id?: number | null;
  produtor: { id: number; name: string } | null;
  produtor_id?: number | null;
  fornecedor: { id: number; name: string } | null;
  fornecedor_id?: number | null;
  safra: { id: number; name: string } | null;
  safra_id?: number | null;
  due_date: string | null;
  operacao: { id: number; name: string; kind: string } | null;
  operacao_id?: number | null;
  total_value: string;
  status: string;
  items: PedidoCompraItem[];
  created_at: string;
  updated_at: string;
};

export function listPedidosCompra(token: string) {
  return request<PedidoCompra[]>("/api/erp/compras/pedidos/", { method: "GET" }, token);
}

export function getPedidoCompra(token: string, id: number) {
  return request<PedidoCompra>(`/api/erp/compras/pedidos/${id}/`, { method: "GET" }, token);
}

export function createPedidoCompra(
  token: string,
  payload: Partial<{
    date: string | null;
    code: string;
    grupo_id: number | null;
    produtor_id: number | null;
    fornecedor_id: number | null;
    safra_id: number | null;
    due_date: string | null;
    operacao_id: number | null;
    status: string;
    items: Array<{
      produto_id: number | null;
      unit: string;
      quantity: string | number;
      price: string | number;
      discount: string | number;
    }>;
  }>
) {
  return request<PedidoCompra>("/api/erp/compras/pedidos/", { method: "POST", body: JSON.stringify(payload) }, token);
}

export function updatePedidoCompra(
  token: string,
  id: number,
  payload: Partial<{
    date: string | null;
    code: string;
    grupo_id: number | null;
    produtor_id: number | null;
    fornecedor_id: number | null;
    safra_id: number | null;
    due_date: string | null;
    operacao_id: number | null;
    status: string;
    items: Array<{
      produto_id: number | null;
      unit: string;
      quantity: string | number;
      price: string | number;
      discount: string | number;
    }>;
  }>
) {
  return request<PedidoCompra>(
    `/api/erp/compras/pedidos/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export function deletePedidoCompra(token: string, id: number) {
  return request<void>(`/api/erp/compras/pedidos/${id}/`, { method: "DELETE" }, token);
}

export type ContratoVendaItem = {
  id: number;
  produto: { id: number; name: string } | null;
  produto_id?: number | null;
  unit: string;
  quantity: string;
  delivered_quantity?: string;
  price: string;
  discount: string;
  total_item: string;
  status?: string;
  created_at: string;
  updated_at: string;
};

export type ContratoVenda = {
  id: number;
  date: string | null;
  code: string;
  grupo: { id: number; name: string } | null;
  grupo_id?: number | null;
  produtor: { id: number; name: string } | null;
  produtor_id?: number | null;
  cliente: { id: number; name: string } | null;
  cliente_id?: number | null;
  safra: { id: number; name: string } | null;
  safra_id?: number | null;
  due_date: string | null;
  operacao: { id: number; name: string; kind: string } | null;
  operacao_id?: number | null;
  notes: string;
  total_value: string;
  status: string;
  items: ContratoVendaItem[];
  created_at: string;
  updated_at: string;
};

export function listContratosVenda(token: string) {
  return request<ContratoVenda[]>("/api/erp/producao/contratos/", { method: "GET" }, token);
}

export function createContratoVenda(
  token: string,
  payload: Partial<{
    date: string | null;
    code: string;
    grupo_id: number | null;
    produtor_id: number | null;
    cliente_id: number | null;
    safra_id: number | null;
    due_date: string | null;
    operacao_id: number | null;
    status: string;
    notes: string;
    items: Array<{
      produto_id: number | null;
      unit: string;
      quantity: string | number;
      price: string | number;
      discount: string | number;
    }>;
  }>
) {
  return request<ContratoVenda>("/api/erp/producao/contratos/", { method: "POST", body: JSON.stringify(payload) }, token);
}

export function updateContratoVenda(
  token: string,
  id: number,
  payload: Partial<{
    date: string | null;
    code: string;
    grupo_id: number | null;
    produtor_id: number | null;
    cliente_id: number | null;
    safra_id: number | null;
    due_date: string | null;
    operacao_id: number | null;
    status: string;
    notes: string;
    items: Array<{
      produto_id: number | null;
      unit: string;
      quantity: string | number;
      price: string | number;
      discount: string | number;
    }>;
  }>
) {
  return request<ContratoVenda>(
    `/api/erp/producao/contratos/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export function deleteContratoVenda(token: string, id: number) {
  return request<void>(`/api/erp/producao/contratos/${id}/`, { method: "DELETE" }, token);
}

export type ContaReceber = {
  id: number;
  date: string | null;
  due_date: string | null;
  document_number: string;
  grupo: { id: number; name: string } | null;
  produtor: { id: number; name: string } | null;
  cliente: { id: number; name: string } | null;
  operacao: { id: number; name: string; kind: string } | null;
  contrato: { id: number; code: string } | null;
  origem: "contrato" | "nota_fiscal" | "duplicata";
  total_value: string;
  received_value: string;
  balance_value: string;
  discount_value: string;
  addition_value: string;
  receive_date: string | null;
  payment_method: "pix" | "boleto" | "transfer" | "card" | "cash" | "other";
  conta?: { id: number; name: string } | null;
  status: "open" | "overdue" | "partial" | "paid" | "canceled";
  created_at: string;
  updated_at: string;
};

export function listContasAReceber(token: string) {
  return request<ContaReceber[]>("/api/erp/financeiro/contas-a-receber/", { method: "GET" }, token);
}

export function updateContaReceberStatus(
  token: string,
  id: number,
  payload: {
    status?: "open" | "overdue" | "partial" | "paid" | "canceled";
    received_value?: number | string;
    receive_increment?: number | string;
    receive_date?: string | null;
    discount_value?: number | string;
    addition_value?: number | string;
    payment_method?: "pix" | "boleto" | "transfer" | "card" | "cash" | "other";
    conta_id?: number | null;
  }
) {
  return request<ContaReceber>(
    `/api/erp/financeiro/contas-a-receber/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    token
  );
}

export type FaturamentoCompraItem = {
  id: number;
  pedido_item_id?: number | null;
  produto: { id: number; name: string } | null;
  quantity: string;
  price: string;
  total_item: string;
  created_at: string;
  updated_at: string;
};

export type FaturamentoCompra = {
  id: number;
  date: string | null;
  invoice_number: string;
  grupo: { id: number; name: string; cpf_cnpj?: string } | null;
  grupo_id?: number | null;
  produtor: { id: number; name: string } | null;
  produtor_id?: number | null;
  pedido: { id: number; code: string } | null;
  pedido_id?: number | null;
  fornecedor: { id: number; name: string } | null;
  fornecedor_id?: number | null;
  deposito: { id: number; name: string } | null;
  deposito_id?: number | null;
  operacao: { id: number; name: string; kind: string } | null;
  operacao_id?: number | null;
  payment_method?: "pix" | "boleto" | "transfer" | "card" | "cash" | "other";
  due_date: string | null;
  status: "pending" | "overdue" | "partial" | "paid" | "canceled";
  total_value: string;
  items: FaturamentoCompraItem[];
  created_at: string;
  updated_at: string;
};

export function listFaturamentosCompra(token: string) {
  return request<FaturamentoCompra[]>("/api/erp/compras/faturamentos/", { method: "GET" }, token);
}

export function createFaturamentoCompra(
  token: string,
  payload: Partial<{
    date: string | null;
    invoice_number: string;
    grupo_id: number | null;
    produtor_id: number | null;
    pedido_id: number | null;
    fornecedor_id: number | null;
    deposito_id: number | null;
    operacao_id: number | null;
    payment_method: "pix" | "boleto" | "transfer" | "card" | "cash" | "other";
    due_date: string | null;
    items: Array<{
      pedido_item_id: number | null;
      quantity: string | number;
      price: string | number;
    }>;
  }>
) {
  return request<FaturamentoCompra>(
    "/api/erp/compras/faturamentos/",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export function updateFaturamentoCompra(
  token: string,
  id: number,
  payload: Partial<{
    date: string | null;
    invoice_number: string;
    grupo_id: number | null;
    produtor_id: number | null;
    pedido_id: number | null;
    fornecedor_id: number | null;
    deposito_id: number | null;
    operacao_id: number | null;
    payment_method: "pix" | "boleto" | "transfer" | "card" | "cash" | "other";
    due_date: string | null;
    items: Array<{
      pedido_item_id: number | null;
      quantity: string | number;
      price: string | number;
    }>;
  }>
) {
  return request<FaturamentoCompra>(
    `/api/erp/compras/faturamentos/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export function deleteFaturamentoCompra(token: string, id: number) {
  return request<void>(`/api/erp/compras/faturamentos/${id}/`, { method: "DELETE" }, token);
}

export type ContaPagar = {
  id: number;
  date: string | null;
  due_date: string | null;
  invoice_number: string;
  grupo: { id: number; name: string; cpf_cnpj?: string } | null;
  produtor: { id: number; name: string } | null;
  fornecedor: { id: number; name: string } | null;
  operacao: { id: number; name: string; kind: string } | null;
  pedido: { id: number; code: string } | null;
  faturamento: { id: number; invoice_number: string } | null;
  origem: "pedido" | "nota_fiscal" | "duplicata";
  total_value: string;
  paid_value: string;
  balance_value: string;
  discount_value: string;
  addition_value: string;
  payment_date: string | null;
  payment_method: "pix" | "boleto" | "transfer" | "card" | "cash" | "other";
  conta: { id: number; name: string } | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export function listContasAPagar(token: string) {
  return request<ContaPagar[]>("/api/erp/financeiro/contas-a-pagar/", { method: "GET" }, token);
}

export function updateContaPagarStatus(
  token: string,
  id: number,
  payload: {
    status?: "open" | "overdue" | "partial" | "paid" | "canceled";
    paid_value?: number | string;
    payment_increment?: number | string;
    payment_date?: string | null;
    discount_value?: number | string;
    addition_value?: number | string;
    payment_method?: "pix" | "boleto" | "transfer" | "card" | "cash" | "other";
    conta_id?: number | null;
  }
) {
  return request<ContaPagar>(
    `/api/erp/financeiro/contas-a-pagar/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    token
  );
}

export type Deposito = {
  id: number;
  name: string;
  tipo: "insumos" | "graos" | "combustivel";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function listDepositos(token: string) {
  return request<Deposito[]>("/api/erp/patrimonio/depositos/", { method: "GET" }, token);
}
export function createDeposito(
  token: string,
  payload: { name: string; tipo?: "insumos" | "graos" | "combustivel"; is_active?: boolean }
) {
  return request<Deposito>(
    "/api/erp/patrimonio/depositos/",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}
export function updateDeposito(
  token: string,
  id: number,
  payload: { name?: string; tipo?: "insumos" | "graos" | "combustivel"; is_active?: boolean }
) {
  return request<Deposito>(
    `/api/erp/patrimonio/depositos/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export type GrupoProdutor = {
  id: number;
  name: string;
  cpf_cnpj: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listGruposProdutores(token: string) {
  return request<GrupoProdutor[]>("/api/erp/grupos-produtores/", { method: "GET" }, token);
}
export function createGrupoProdutor(token: string, payload: { name: string; cpf_cnpj?: string; is_active?: boolean }) {
  return request<GrupoProdutor>(
    "/api/erp/grupos-produtores/",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}
export function updateGrupoProdutor(
  token: string,
  id: number,
  payload: Partial<{ name: string; cpf_cnpj: string; is_active: boolean }>
) {
  return request<GrupoProdutor>(
    `/api/erp/grupos-produtores/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export type Produtor = {
  id: number;
  name: string;
  display_name?: string;
  registration: string;
  cpf: string;
  farm: string;
  address: string;
  google_location: string;
  area_ha: string;
  matricula: string;
  city: string;
  uf: string;
  grupo: { id: number; name: string; cpf_cnpj?: string } | null;
  grupo_id?: number | null;
  propriedades?: Array<{ id: number; name: string }> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listProdutores(token: string) {
  return request<Produtor[]>("/api/erp/produtores/", { method: "GET" }, token);
}
export function createProdutor(
  token: string,
  payload: Partial<{
    name: string;
    registration: string;
    cpf: string;
    farm: string;
    address: string;
    google_location: string;
    area_ha: string | number;
    matricula: string;
    city: string;
    uf: string;
    grupo_id: number | null;
    is_active: boolean;
  }>
) {
  return request<Produtor>("/api/erp/produtores/", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateProdutor(
  token: string,
  id: number,
  payload: Partial<{
    name: string;
    registration: string;
    cpf: string;
    farm: string;
    address: string;
    google_location: string;
    area_ha: string | number;
    matricula: string;
    city: string;
    uf: string;
    grupo_id: number | null;
    is_active: boolean;
  }>
) {
  return request<Produtor>(`/api/erp/produtores/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export type Propriedade = {
  id: number;
  name: string;
  produtor: { id: number; name: string } | null;
  produtor_id?: number | null;
  produtores?: Array<{ id: number; name: string }> | null;
  produtores_ids?: number[] | null;
  area_ha: string;
  sicar: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listPropriedades(token: string) {
  return request<Propriedade[]>("/api/erp/patrimonio/propriedades/", { method: "GET" }, token);
}
export function createPropriedade(
  token: string,
  payload: Partial<{
    name: string;
    produtor_id: number | null;
    produtores_ids: number[];
    area_ha: string | number;
    sicar: string;
    is_active: boolean;
  }>
) {
  return request<Propriedade>(
    "/api/erp/patrimonio/propriedades/",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}
export function updatePropriedade(
  token: string,
  id: number,
  payload: Partial<{
    name: string;
    produtor_id: number | null;
    produtores_ids: number[];
    area_ha: string | number;
    sicar: string;
    is_active: boolean;
  }>
) {
  return request<Propriedade>(
    `/api/erp/patrimonio/propriedades/${id}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export type Talhao = {
  id: number;
  name: string;
  propriedade: { id: number; name: string; produtor?: { id: number; name: string } | null } | null;
  propriedade_id?: number | null;
  area_ha: string;
  map_location: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export function listTalhoes(token: string) {
  return request<Talhao[]>("/api/erp/patrimonio/talhoes/", { method: "GET" }, token);
}
export function createTalhao(
  token: string,
  payload: Partial<{
    name: string;
    propriedade_id: number | null;
    area_ha: string | number;
    map_location: string;
    is_active: boolean;
  }>
) {
  return request<Talhao>("/api/erp/patrimonio/talhoes/", { method: "POST", body: JSON.stringify(payload) }, token);
}
export function updateTalhao(
  token: string,
  id: number,
  payload: Partial<{
    name: string;
    propriedade_id: number | null;
    area_ha: string | number;
    map_location: string;
    is_active: boolean;
  }>
) {
  return request<Talhao>(`/api/erp/patrimonio/talhoes/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export type Operacao = {
  id: number;
  name: string;
  kind:
    | "credit"
    | "debit"
    | "transfer"
    | "remessa_deposito"
    | "a_fixar"
    | "devolucao"
    | "venda";
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
