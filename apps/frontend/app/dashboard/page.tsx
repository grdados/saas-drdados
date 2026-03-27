"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/AdminShell";
import { KeyMetrics, RevenueAndSales, TransactionHistory } from "@/components/DashboardWidgets";
import { getAccessToken } from "@/lib/auth";
import { createSubscription, getMe, getMySubscription, isApiError, listLeads, listTasks } from "@/lib/api";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
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
        setEmail(me.email);
        setCompany((me.company?.name as string) ?? "");
        setAvatarUrl(((me as unknown as { profile?: { avatar_url?: string } }).profile?.avatar_url as string) ?? "");
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
    <AdminShell user={{ name: name || "Usuario", email: email || "", company, avatarUrl }}>
      <div className="space-y-4 lg:space-y-6">
        {loading ? <p className="text-sm font-semibold text-zinc-300">Carregando dados...</p> : null}

        {!loading ? (
          <div className="space-y-4 lg:space-y-6">
            <KeyMetrics />

            <div className="grid gap-4 lg:gap-6 xl:grid-cols-[1fr_320px] 2xl:grid-cols-[1fr_360px]">
              <div className="space-y-4 lg:space-y-6">
                <RevenueAndSales />
                <TransactionHistory />
              </div>

              <section className="h-fit rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl sm:p-5">
                <p className="text-sm font-black text-white">Licenca e acesso</p>
                <p className="mt-2 text-sm text-zinc-300">
                  Status: <strong className="text-accent-300">{licenseStatus}</strong>
                </p>
                {subscriptionInfo ? <p className="mt-1 text-xs text-zinc-400">{subscriptionInfo}</p> : null}
                {accessMessage ? <p className="mt-2 text-xs font-semibold text-amber-200">{accessMessage}</p> : null}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3 sm:p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Leads</p>
                    <p className="mt-2 text-2xl font-black text-accent-200 sm:text-3xl">{leadCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3 sm:p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Tarefas</p>
                    <p className="mt-2 text-2xl font-black text-accent-200 sm:text-3xl">{taskCount}</p>
                  </div>
                </div>

                <button
                  disabled={billingLoading}
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
                        description: "Licenca GR Dados CRM - Plano Base"
                      });
                      setBillingMessage("Assinatura criada no Asaas com sucesso.");
                    } catch {
                      setBillingMessage("Falha ao criar assinatura. Verifique credenciais Asaas.");
                    } finally {
                      setBillingLoading(false);
                    }
                  }}
                  className="mt-4 w-full rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:opacity-60 sm:py-3"
                >
                  {billingLoading ? "Criando..." : "Ativar licenca"}
                </button>
                {billingMessage ? <p className="mt-3 text-xs font-semibold text-zinc-300">{billingMessage}</p> : null}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
