import Link from "next/link";

const benefits = [
  "Pipeline visual para acompanhar cada oportunidade",
  "Tarefas e lembretes para não perder follow-up",
  "Relatórios rápidos para decisão comercial"
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-brand-50/60 text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-brand-700" />
          <span className="text-lg font-extrabold tracking-tight">GRDados</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <a href="#contato">Contato</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-bold text-brand-800">
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-brand-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            Iniciar teste
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-8 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-4 inline-flex items-center rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-700">
            CRM SaaS para pequenas e médias empresas
          </p>
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
            Chega de planilhas.
            <span className="block text-brand-600">Tenha um CRM que acelera suas vendas.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-600">
            O GRDados centraliza leads, tarefas e funil comercial em um único lugar para seu time vender
            com previsibilidade.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-xl bg-brand-800 px-7 py-4 font-bold text-white hover:bg-brand-700">
              Quero ver demo
            </Link>
            <Link href="/login" className="rounded-xl border border-brand-300 bg-white px-7 py-4 font-bold text-brand-800 hover:bg-brand-50">
              Falar com especialista
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-brand-100 bg-brand-900 p-6 text-white shadow-panel">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-200">Formulário de Aplicação</p>
          <h2 className="text-2xl font-extrabold">Comece seu CRM com o GRDados</h2>
          <p className="mt-2 text-sm text-brand-100">Preencha os dados e receba acesso ao plano de demonstração.</p>
          <form className="mt-6 space-y-4">
            <input className="w-full rounded-xl border border-brand-600 bg-brand-800 px-4 py-3 text-sm placeholder:text-brand-300 focus:outline-none" placeholder="Seu nome" />
            <input className="w-full rounded-xl border border-brand-600 bg-brand-800 px-4 py-3 text-sm placeholder:text-brand-300 focus:outline-none" placeholder="Seu e-mail corporativo" />
            <input className="w-full rounded-xl border border-brand-600 bg-brand-800 px-4 py-3 text-sm placeholder:text-brand-300 focus:outline-none" placeholder="Nome da empresa" />
            <button className="w-full rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-brand-900">
              Solicitar acesso
            </button>
          </form>
        </div>
      </section>

      <section id="recursos" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((item) => (
            <article key={item} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-brand-800">Benefício</h3>
              <p className="mt-2 text-sm text-slate-600">{item}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
