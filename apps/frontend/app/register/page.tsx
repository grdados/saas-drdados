"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company_name: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      router.push("/login");
    } catch {
      setError("Não foi possível criar a conta. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-black text-brand-900">Criar conta GRDados</h1>
        <p className="mt-2 text-sm text-slate-500">Comece seu CRM agora.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <input
            required
            placeholder="Seu nome"
            value={form.name}
            onChange={(e) => setForm((old) => ({ ...old, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            required
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm((old) => ({ ...old, email: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            required
            placeholder="Empresa"
            value={form.company_name}
            onChange={(e) => setForm((old) => ({ ...old, company_name: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            required
            type="password"
            placeholder="Senha (mínimo 8 caracteres)"
            value={form.password}
            onChange={(e) => setForm((old) => ({ ...old, password: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
          />
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-brand-800 px-4 py-3 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Já possui conta?{" "}
          <Link className="font-bold text-brand-700" href="/login">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
