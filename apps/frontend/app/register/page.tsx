"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthLayout } from "@/components/AuthLayout";
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel criar a conta.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Criar conta GR Dados" subtitle="Comece seu CRM agora.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <input
          required
          placeholder="Seu nome"
          value={form.name}
          onChange={(e) => setForm((old) => ({ ...old, name: e.target.value }))}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-accent-200 caret-accent-400 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none"
        />
        <input
          required
          type="email"
          placeholder="E-mail"
          value={form.email}
          onChange={(e) => setForm((old) => ({ ...old, email: e.target.value }))}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-accent-200 caret-accent-400 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none"
        />
        <input
          required
          placeholder="Empresa"
          value={form.company_name}
          onChange={(e) => setForm((old) => ({ ...old, company_name: e.target.value }))}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-accent-200 caret-accent-400 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none"
        />
        <input
          required
          type="password"
          placeholder="Senha (minimo 8 caracteres)"
          value={form.password}
          onChange={(e) => setForm((old) => ({ ...old, password: e.target.value }))}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-accent-200 caret-accent-400 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none"
        />

        {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-accent-500 px-4 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <p className="pt-2 text-sm text-zinc-400">
          Ja possui conta?{" "}
          <Link className="font-bold text-accent-300" href="/login">
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
