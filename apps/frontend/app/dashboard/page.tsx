"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppNav } from "@/components/AppNav";
import { getAccessToken } from "@/lib/auth";
import { createSubscription, getMe, getMySubscription, isApiError, listLeads, listTasks } from "@/lib/api";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [leadCount, setLeadCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [licenseStatus, setLicenseStatus] = useState("trialing");
  const [subscriptionInfo, setSubscriptionInfo] = useState("");
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const [accessMessage, setAccessMessage] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    getMe(token)
      .then(async (me) => {
        setName(me.name);
        setCompany((me.company?.name as string) ?? "");
        setLicenseStatus((me.company?.license_status as string) ?? "trialing");

        const subscription = await getMySubscription(token).catch(() => null);
        if (subscription) {
          const sub = subscription as { status?: string; value?: number; module_code?: string };
          setSubscriptionInfo(
            `Assinatura: ${sub.status ?? "trialing"}${sub.module_code ? ` (${sub.module_code})` : ""} - R$ ${
              sub.value ?? "-"
            }`
          );
        }

        // Leads/tarefas sao opcionais; 403 aqui significa modulo/licenca bloqueado e nao deve deslogar o usuario.
        const [leadsRes, tasksRes] = await Promise.allSettled([listLeads(token), listTasks(token)]);
        if (leadsRes.status === "fulfilled") setLeadCount((leadsRes.value as unknown[]).length);
        if (tasksRes.status === "fulfilled") setTaskCount((tasksRes.value as unknown[]).length);

        const denied = [leadsRes, tasksRes].some(
          (r) => r.status === "rejected" && isApiError(r.reason) && r.reason.status === 403
        );
        if (denied) {
          setAccessMessage("Licenca/modulo nao liberado ainda. Ative a licenca para acessar o CRM completo.");
        }
      })
      .catch((err) => {
        if (isApiError(err) && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        const msg = err instanceof Error ? err.message : "Falha ao carregar dados.";
        setAccessMessage(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <AppNav />
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-black text-white">Painel GR Dados</h1>
        {loading ? <p className="mt-4 text-zinc-400">Carregando dados...</p> : null}

        {!loading ? (
          <>
            <p className="mt-2 text-zinc-300">
              Bem-vindo, <strong>{name}</strong> {company ? `(${company})` : ""}.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="text-sm text-zinc-400">Leads cadastrados</p>
                <p className="mt-2 text-4xl font-black text-accent-300">{leadCount}</p>
              </article>
              <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="text-sm text-zinc-400">Tarefas abertas</p>
                <p className="mt-2 text-4xl font-black text-accent-300">{taskCount}</p>
              </article>
              <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="text-sm text-zinc-400">Ações rápidas e licença</p>
                <p className="mt-2 text-sm text-zinc-300">Status da licença: <strong className="text-accent-300">{licenseStatus}</strong></p>
                {subscriptionInfo ? <p className="mt-1 text-xs text-zinc-400">{subscriptionInfo}</p> : null}
                {accessMessage ? <p className="mt-2 text-xs font-semibold text-amber-200">{accessMessage}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/leads" className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-black text-zinc-950 hover:bg-accent-400">
                    Novo lead
                  </Link>
                  <Link href="/tasks" className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-800">
                    Nova tarefa
                  </Link>
                  <button
                    onClick={async () => {
                      const token = getAccessToken();
                      if (!token) return;
                      setBillingLoading(true);
                      setBillingMessage("");
                      try {
                        await createSubscription(token, {
                          value: 99.9,
                          cycle: "MONTHLY",
                          billing_type: "BOLETO",
                          description: "Licença GR Dados CRM - Plano Base"
                        });
                        setBillingMessage("Assinatura criada no Asaas com sucesso.");
                      } catch {
                        setBillingMessage("Falha ao criar assinatura. Verifique credenciais Asaas.");
                      } finally {
                        setBillingLoading(false);
                      }
                    }}
                    className="rounded-lg border border-accent-500/40 bg-zinc-950 px-4 py-2 text-sm font-black text-accent-300 hover:bg-zinc-800"
                  >
                    {billingLoading ? "Criando..." : "Ativar licença"}
                  </button>
                </div>
                {billingMessage ? <p className="mt-3 text-xs font-semibold text-zinc-300">{billingMessage}</p> : null}
              </article>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
