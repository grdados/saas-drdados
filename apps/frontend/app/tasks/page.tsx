"use client";

import { FormEvent, useEffect, useState } from "react";

import { AppNav } from "@/components/AppNav";
import { getAccessToken } from "@/lib/auth";
import { createTask, listTasks } from "@/lib/api";

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
    loadData(token).catch(() => {
      window.location.href = "/login";
    });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    await createTask(token, form);
    setForm({ title: "", description: "" });
    await loadData(token);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav />
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-black text-brand-900">Tarefas</h1>

        <form className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3" onSubmit={onSubmit}>
          <input
            required
            placeholder="Título da tarefa"
            value={form.title}
            onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm((old) => ({ ...old, description: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-bold text-white">Adicionar tarefa</button>
        </form>

        <div className="mt-6 grid gap-3">
          {loading ? <p className="text-slate-500">Carregando...</p> : null}
          {!loading && items.length === 0 ? <p className="text-slate-500">Nenhuma tarefa cadastrada.</p> : null}
          {items.map((task) => (
            <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-brand-900">{task.title}</h2>
                <span className="rounded-md bg-brand-100 px-3 py-1 text-xs font-bold uppercase text-brand-800">
                  {task.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{task.description || "Sem descrição."}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
