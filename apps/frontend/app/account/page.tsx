"use client";

import { FormEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/AdminShell";
import { getAccessToken } from "@/lib/auth";
import { getMe, isApiError, updateMe } from "@/lib/api";

export default function AccountPage() {
  const [me, setMe] = useState<{ name: string; email: string; company?: string; avatarUrl?: string }>({
    name: "Usuario",
    email: ""
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "ok" | "err"; msg?: string }>({ type: "idle" });
  const [loading, setLoading] = useState(true);

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
        setAvatarUrl(url);
      })
      .catch((err) => {
        if (isApiError(err) && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        setStatus({ type: "err", msg: err instanceof Error ? err.message : "Falha ao carregar." });
      })
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    setStatus({ type: "idle" });
    try {
      await updateMe(token, { avatar_url: avatarUrl });
      setMe((old) => ({ ...old, avatarUrl }));
      setStatus({ type: "ok", msg: "Avatar atualizado." });
    } catch (err) {
      setStatus({ type: "err", msg: err instanceof Error ? err.message : "Falha ao salvar." });
    }
  }

  return (
    <AdminShell user={me}>
      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Advanced</p>
          <h1 className="mt-1 text-3xl font-black text-white">Minha conta</h1>
          <p className="mt-2 text-sm text-zinc-300">Atualize sua foto e dados basicos.</p>
        </div>

        {loading ? <p className="text-sm font-semibold text-zinc-300">Carregando...</p> : null}

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_240px] md:items-start">
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Avatar URL</span>
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-500/50 focus:outline-none"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400">
                  Salvar
                </button>
                {status.type === "ok" ? (
                  <p className="text-sm font-semibold text-emerald-200">{status.msg}</p>
                ) : null}
                {status.type === "err" ? (
                  <p className="text-sm font-semibold text-red-300">{status.msg}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Preview</p>
              <div className="mt-3 grid place-items-center">
                <div className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
                  {me.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={me.avatarUrl} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-2xl font-black text-accent-200">{(me.name || "U").slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </section>
    </AdminShell>
  );
}

