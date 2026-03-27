"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { AuthLayout } from "@/components/AuthLayout";
import { useLocale } from "@/components/LocaleProvider";
import { login } from "@/lib/api";
import { saveTokens } from "@/lib/auth";

export default function LoginPage() {
  const { messages } = useLocale();
  const copy = messages.auth.login;
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
      window.location.href = "/dashboard";
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.fallbackError;
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle} hideHeading>
      <form className="space-y-4" onSubmit={onSubmit}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          type="email"
          required
          placeholder={copy.email}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-accent-200 caret-accent-400 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          placeholder={copy.password}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-accent-200 caret-accent-400 placeholder:text-zinc-500 focus:border-accent-500 focus:outline-none"
        />

        {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-accent-500 px-4 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {loading ? copy.loading : copy.submit}
        </button>

        <p className="pt-2 text-sm text-zinc-400">
          {copy.noAccount}{" "}
          <Link className="font-bold text-accent-300" href="/register">
            {copy.createAccount}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
