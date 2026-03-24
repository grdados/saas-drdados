import { AuthedAdminShell } from "@/components/AuthedAdminShell";

export default function EstoqueCatchAllPage() {
  return (
    <AuthedAdminShell>
      {({ loading }) => (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Estoque</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white">Em breve</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-300">
            {loading ? "Carregando..." : "Vamos implementar Produtos e Defensivos aqui."}
          </p>
        </div>
      )}
    </AuthedAdminShell>
  );
}
