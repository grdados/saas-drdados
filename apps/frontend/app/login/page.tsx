"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { saveTokens } from "@/lib/auth";
import { login } from "@/lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login({ username, password });
      saveTokens(result.access, result.refresh);
      router.push("/dashboard");
    } catch {
      setError("Não foi possível entrar. Verifique e-mail e senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-black text-brand-900">Entrar no GRDados</h1>
        <p className="mt-2 text-sm text-slate-500">Acesse seu CRM.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="email"
            required
            placeholder="E-mail"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            placeholder="Senha"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
          />
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-brand-800 px-4 py-3 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Ainda não tem conta?{" "}
          <Link className="font-bold text-brand-700" href="/register">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
