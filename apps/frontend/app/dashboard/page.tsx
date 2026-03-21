"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppNav } from "@/components/AppNav";
import { getAccessToken } from "@/lib/auth";
import { getMe, listLeads, listTasks } from "@/lib/api";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [leadCount, setLeadCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    Promise.all([getMe(token), listLeads(token), listTasks(token)])
      .then(([me, leads, tasks]) => {
        setName(me.name);
        setCompany((me.company?.name as string) ?? "");
        setLeadCount(leads.length);
        setTaskCount(tasks.length);
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
                <p className="text-sm text-slate-500">Ações rápidas</p>
                <div className="mt-4 flex gap-3">
                  <Link href="/leads" className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-bold text-white">
                    Novo lead
                  </Link>
                  <Link href="/tasks" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">
                    Nova tarefa
                  </Link>
                </div>
              </article>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
