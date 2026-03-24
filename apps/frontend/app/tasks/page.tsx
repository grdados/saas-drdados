"use client";

import { FormEvent, useEffect, useState } from "react";

import { AppNav } from "@/components/AppNav";
import { getAccessToken } from "@/lib/auth";
import { createTask, isApiError, listTasks } from "@/lib/api";

type Task = {
  id: number;
  title: string;
  description: string;
  status: string;
};

export default function TasksPage() {
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

    await createTask(token, form);
    setForm({ title: "", description: "" });
    await loadData(token);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <AppNav />
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-black text-white">Tarefas</h1>
        {accessMessage ? (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200">
            {accessMessage}
          </p>
        ) : null}

        <form className="mt-6 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-3" onSubmit={onSubmit}>
          <input
            required
            placeholder="Título da tarefa"
            value={form.title}
            onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))}
            disabled={!!accessMessage}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none disabled:opacity-60"
          />
          <input
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm((old) => ({ ...old, description: e.target.value }))}
            disabled={!!accessMessage}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none disabled:opacity-60"
          />
          <button
            disabled={!!accessMessage}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:opacity-60"
          >
            Adicionar tarefa
          </button>
        </form>

        <div className="mt-6 grid gap-3">
          {loading ? <p className="text-zinc-400">Carregando...</p> : null}
          {!loading && items.length === 0 ? <p className="text-zinc-400">Nenhuma tarefa cadastrada.</p> : null}
          {items.map((task) => (
            <article key={task.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">{task.title}</h2>
                <span className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-black uppercase text-accent-300">
                  {task.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-300">{task.description || "Sem descrição."}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
