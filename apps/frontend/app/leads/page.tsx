"use client";

import { FormEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/AdminShell";
import { getAccessToken } from "@/lib/auth";
import { createLead, getMe, isApiError, listLeads } from "@/lib/api";
import { maskPhoneBR } from "@/lib/masks";

type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  stage: string;
};

export default function LeadsPage() {
  const [me, setMe] = useState<{ name: string; email: string; company?: string }>({ name: "Usuario", email: "" });
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

    getMe(token)
      .then((u) => {
        setMe({
          name: u.name,
          email: u.email,
          company: (u.company?.name as string) ?? ""
        });
        return loadData(token);
      })
      .catch((err) => {
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
    <AdminShell user={me}>
      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">CRM</p>
          <h1 className="mt-1 text-3xl font-black text-white">Leads</h1>
        </div>
        {accessMessage ? (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200">
            {accessMessage}
          </p>
        ) : null}

        <form
          className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl md:grid-cols-4"
          onSubmit={onSubmit}
        >
          <input
            required
            placeholder="Nome do lead"
            value={form.name}
            onChange={(e) => setForm((old) => ({ ...old, name: e.target.value }))}
            disabled={!!accessMessage}
            className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500/50 focus:outline-none disabled:opacity-60"
          />
          <input
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm((old) => ({ ...old, email: e.target.value }))}
            disabled={!!accessMessage}
            className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500/50 focus:outline-none disabled:opacity-60"
          />
          <input
            placeholder="Telefone"
            value={form.phone}
            onChange={(e) => setForm((old) => ({ ...old, phone: maskPhoneBR(e.target.value) }))}
            inputMode="tel"
            disabled={!!accessMessage}
            className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500/50 focus:outline-none disabled:opacity-60"
          />
          <button
            disabled={!!accessMessage}
            className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:opacity-60"
          >
            Adicionar lead
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/60 text-zinc-200">
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
                  <tr key={lead.id} className="border-t border-white/10">
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
    </AdminShell>
  );
}
