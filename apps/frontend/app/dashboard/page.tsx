"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppNav } from "@/components/AppNav";
import { getAccessToken } from "@/lib/auth";
import { createSubscription, getMe, getMySubscription, listLeads, listTasks } from "@/lib/api";

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

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    Promise.all([getMe(token), listLeads(token), listTasks(token), getMySubscription(token).catch(() => null)])
      .then(([me, leads, tasks, subscription]) => {
        setName(me.name);
        setCompany((me.company?.name as string) ?? "");
        setLicenseStatus((me.company?.license_status as string) ?? "trialing");
        setLeadCount(leads.length);
        setTaskCount(tasks.length);
        if (subscription) {
          const sub = subscription as { status?: string; value?: number };
          setSubscriptionInfo(`Assinatura: ${sub.status ?? "trialing"} - R$ ${sub.value ?? "-"}`);
        }
      })
      .catch(() => {
        window.location.href = "/login";
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav />
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-black text-brand-900">Painel GRDados</h1>
        {loading ? <p className="mt-4 text-slate-500">Carregando dados...</p> : null}

        {!loading ? (
          <>
            <p className="mt-2 text-slate-600">
              Bem-vindo, <strong>{name}</strong> {company ? `(${company})` : ""}.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">Leads cadastrados</p>
                <p className="mt-2 text-4xl font-black text-brand-800">{leadCount}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">Tarefas abertas</p>
                <p className="mt-2 text-4xl font-black text-brand-800">{taskCount}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">Ações rápidas e licença</p>
                <p className="mt-2 text-sm text-slate-600">Status da licença: <strong>{licenseStatus}</strong></p>
                {subscriptionInfo ? <p className="mt-1 text-xs text-slate-500">{subscriptionInfo}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/leads" className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-bold text-white">
                    Novo lead
                  </Link>
                  <Link href="/tasks" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">
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
                          description: "Licença GRDados CRM - Plano Base"
                        });
                        setBillingMessage("Assinatura criada no Asaas com sucesso.");
                      } catch {
                        setBillingMessage("Falha ao criar assinatura. Verifique credenciais Asaas.");
                      } finally {
                        setBillingLoading(false);
                      }
                    }}
                    className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-bold text-brand-800"
                  >
                    {billingLoading ? "Criando..." : "Ativar licença"}
                  </button>
                </div>
                {billingMessage ? <p className="mt-3 text-xs font-semibold text-slate-600">{billingMessage}</p> : null}
              </article>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
