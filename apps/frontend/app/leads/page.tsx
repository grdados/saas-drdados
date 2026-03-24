"use client";

import { FormEvent, useEffect, useState } from "react";

import { AppNav } from "@/components/AppNav";
import { getAccessToken } from "@/lib/auth";
import { createLead, isApiError, listLeads } from "@/lib/api";

type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  stage: string;
};

export default function LeadsPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [accessMessage, setAccessMessage] = useState("");

  async function loadData(token: string) {
    const data = (await listLeads(token)) as unknown as Lead[];
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    loadData(token).catch((err) => {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setAccessMessage(err instanceof Error ? err.message : "Sem acesso ao modulo CRM.");
      setLoading(false);
    });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    if (accessMessage) return;

    await createLead(token, form);
    setForm({ name: "", email: "", phone: "" });
    await loadData(token);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <AppNav />
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-black text-white">Leads</h1>
        {accessMessage ? (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200">
            {accessMessage}
          </p>
        ) : null}

        <form
          className="mt-6 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-4"
          onSubmit={onSubmit}
        >
          <input
            required
            placeholder="Nome do lead"
            value={form.name}
            onChange={(e) => setForm((old) => ({ ...old, name: e.target.value }))}
            disabled={!!accessMessage}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none disabled:opacity-60"
          />
          <input
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm((old) => ({ ...old, email: e.target.value }))}
            disabled={!!accessMessage}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none disabled:opacity-60"
          />
          <input
            placeholder="Telefone"
            value={form.phone}
            onChange={(e) => setForm((old) => ({ ...old, phone: e.target.value }))}
            disabled={!!accessMessage}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none disabled:opacity-60"
          />
          <button
            disabled={!!accessMessage}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:opacity-60"
          >
            Adicionar lead
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-200">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Etapa</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-zinc-400">
                    Carregando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-zinc-400">
                    Nenhum lead cadastrado.
                  </td>
                </tr>
              ) : (
                items.map((lead) => (
                  <tr key={lead.id} className="border-t border-zinc-800">
                    <td className="px-4 py-3 font-semibold">{lead.name}</td>
                    <td className="px-4 py-3 text-zinc-300">{lead.email || "-"}</td>
                    <td className="px-4 py-3 text-zinc-300">{lead.phone || "-"}</td>
                    <td className="px-4 py-3 capitalize text-accent-300">{lead.stage}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
