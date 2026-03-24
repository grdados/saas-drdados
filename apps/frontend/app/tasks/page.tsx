"use client";

import { FormEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/AdminShell";
import { getAccessToken } from "@/lib/auth";
import { createTask, getMe, isApiError, listTasks } from "@/lib/api";

type Task = {
  id: number;
  title: string;
  description: string;
  status: string;
};

export default function TasksPage() {
  const [me, setMe] = useState<{ name: string; email: string; company?: string }>({ name: "Usuario", email: "" });
  const [items, setItems] = useState<Task[]>([]);
  const [form, setForm] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [accessMessage, setAccessMessage] = useState("");

  async function loadData(token: string) {
    const data = (await listTasks(token)) as unknown as Task[];
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
        setMe({ name: u.name, email: u.email, company: (u.company?.name as string) ?? "" });
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

    await createTask(token, form);
    setForm({ title: "", description: "" });
    await loadData(token);
  }

  return (
    <AdminShell user={me}>
      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">CRM</p>
          <h1 className="mt-1 text-3xl font-black text-white">Tarefas</h1>
        </div>

        {accessMessage ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200">
            {accessMessage}
          </p>
        ) : null}

        <form
          className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl md:grid-cols-3"
          onSubmit={onSubmit}
        >
          <input
            required
            placeholder="Titulo da tarefa"
            value={form.title}
            onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))}
            disabled={!!accessMessage}
            className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500/50 focus:outline-none disabled:opacity-60"
          />
          <input
            placeholder="Descricao"
            value={form.description}
            onChange={(e) => setForm((old) => ({ ...old, description: e.target.value }))}
            disabled={!!accessMessage}
            className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500/50 focus:outline-none disabled:opacity-60"
          />
          <button
            disabled={!!accessMessage}
            className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:opacity-60"
          >
            Adicionar tarefa
          </button>
        </form>

        <div className="grid gap-3">
          {loading ? <p className="text-zinc-400">Carregando...</p> : null}
          {!loading && items.length === 0 ? <p className="text-zinc-400">Nenhuma tarefa cadastrada.</p> : null}
          {items.map((task) => (
            <article key={task.id} className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-white">{task.title}</h2>
                <span className="rounded-md border border-white/10 bg-zinc-950/50 px-3 py-1 text-xs font-black uppercase text-accent-300">
                  {task.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-300">{task.description || "Sem descricao."}</p>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

