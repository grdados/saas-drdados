"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthLayout } from "@/components/AuthLayout";
import { login } from "@/lib/api";
import { saveTokens } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login({ username, password });
      saveTokens(result.access, result.refresh);
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nao foi possivel entrar. Verifique e-mail e senha.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Entrar no GR Dados" subtitle="Acesse seu CRM.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          type="email"
          required
          placeholder="E-mail"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-accent-200 caret-accent-400 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          placeholder="Senha"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-accent-200 caret-accent-400 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none"
        />

        {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-accent-500 px-4 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="pt-2 text-sm text-zinc-400">
          Ainda nao tem conta?{" "}
          <Link className="font-bold text-accent-300" href="/register">
            Criar conta
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
