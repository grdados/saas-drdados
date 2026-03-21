export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type JsonValue = Record<string, unknown>;

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(errorPayload || "Erro na requisição.");
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
