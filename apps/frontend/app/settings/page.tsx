"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/AdminShell";
import { getAccessToken } from "@/lib/auth";
import { getMe, isApiError } from "@/lib/api";

export default function SettingsPage() {
  const [me, setMe] = useState<{ name: string; email: string; company?: string; avatarUrl?: string }>({
    name: "Usuario",
    email: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    getMe(token)
      .then((u) => {
        const url = ((u as unknown as { profile?: { avatar_url?: string } }).profile?.avatar_url as string) ?? "";
        setMe({ name: u.name, email: u.email, company: (u.company?.name as string) ?? "", avatarUrl: url });
      })
      .catch((err) => {
        if (isApiError(err) && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Falha ao carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell user={me}>
      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Advanced</p>
          <h1 className="mt-1 text-3xl font-black text-white">Configurações</h1>
          <p className="mt-2 text-sm text-zinc-300">Configurações do painel (em breve).</p>
        </div>

        {loading ? <p className="text-sm font-semibold text-zinc-300">Carregando...</p> : null}
        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <p className="text-sm font-black text-white">Tema</p>
            <p className="mt-2 text-sm text-zinc-300">Padrão GR Dados (dark).</p>
            <p className="mt-1 text-xs text-zinc-500">No próximo passo, adicionamos seleção de tema e preferências.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <p className="text-sm font-black text-white">Notificações</p>
            <p className="mt-2 text-sm text-zinc-300">Configuração de alertas (em breve).</p>
            <p className="mt-1 text-xs text-zinc-500">Vamos ligar com WhatsApp e e-mail quando o billing entrar.</p>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

