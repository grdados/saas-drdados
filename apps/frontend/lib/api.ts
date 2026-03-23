export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type JsonValue = Record<string, unknown>;

function extractErrorMessage(payloadText: string): string {
  const trimmed = (payloadText || "").trim();
  if (!trimmed) return "Erro na requisicao.";

  try {
    const json = JSON.parse(trimmed) as unknown;
    if (typeof json === "string") return json;
    if (json && typeof json === "object") {
      const obj = json as Record<string, unknown>;
      if (typeof obj.detail === "string") return obj.detail;

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
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {})
      }
    });
  } catch (err) {
    const hint =
      "Falha de rede/CORS ao chamar a API. Confirme `NEXT_PUBLIC_API_URL` no Vercel e `CORS_ALLOWED_ORIGINS` no Render.";
    const details = err instanceof Error ? err.message : String(err);
    throw new Error(`${hint} (${details})`);
  }

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(extractErrorMessage(errorPayload));
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
  return request<{ id: number; name: string; email: string; company: JsonValue | null }>(
    "/api/accounts/me/",
    { method: "GET" },
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
