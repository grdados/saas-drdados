import Link from "next/link";

const highlights = [
  "Pipeline visual para acompanhar cada oportunidade",
  "Tarefas e lembretes para não perder follow-up",
  "Licenciamento SaaS com cobrança recorrente",
  "Dashboard de performance comercial em tempo real"
];

const steps = [
  { title: "1. Estruturamos seu funil", text: "Configure etapas, origem de lead e responsáveis comerciais em minutos." },
  { title: "2. Centralizamos o relacionamento", text: "Todas as interações e tarefas em um único lugar, por empresa." },
  { title: "3. Escalamos com previsibilidade", text: "Relatórios claros para decisões rápidas e crescimento consistente." }
];

const plans = [
  { name: "Start", price: "R$ 99", text: "Até 3 usuários, funil, tarefas e dashboard básico." },
  { name: "Growth", price: "R$ 249", text: "Até 12 usuários, automações comerciais e indicadores avançados." },
  { name: "Scale", price: "Sob consulta", text: "Usuários ilimitados, integrações dedicadas e onboarding estratégico." }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
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

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-20 pt-8 md:grid-cols-2 md:items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-brand-700">
            CRM SaaS para operações comerciais reais
          </p>
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
            Chega de planilhas.
            <span className="block text-brand-600">Tenha um CRM que acelera receita.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-600">
            O GRDados organiza leads, tarefas e funil em uma plataforma SaaS pronta para crescer com seu negócio.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-xl bg-brand-800 px-7 py-4 font-black text-white hover:bg-brand-700">
              Quero ver demo
            </Link>
            <Link href="#contato" className="rounded-xl border border-brand-300 bg-white px-7 py-4 font-black text-brand-800 hover:bg-brand-50">
              Falar com consultor
            </Link>
          </div>
          <div className="grid gap-3 pt-3 md:grid-cols-2">
            {highlights.slice(0, 2).map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-brand-900 p-6 text-white shadow-panel">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-brand-200">Formulário de Aplicação</p>
            <h2 className="text-2xl font-extrabold">Crie seu cenário CRM no GRDados</h2>
            <p className="mt-2 text-sm text-brand-100">Responderemos em até 1 dia útil com proposta e cronograma.</p>
            <form className="mt-6 space-y-4">
              <input className="w-full rounded-xl border border-brand-600 bg-brand-800 px-4 py-3 text-sm placeholder:text-brand-300 focus:outline-none" placeholder="Seu nome" />
              <input className="w-full rounded-xl border border-brand-600 bg-brand-800 px-4 py-3 text-sm placeholder:text-brand-300 focus:outline-none" placeholder="Seu e-mail corporativo" />
              <input className="w-full rounded-xl border border-brand-600 bg-brand-800 px-4 py-3 text-sm placeholder:text-brand-300 focus:outline-none" placeholder="Empresa ou projeto" />
              <textarea className="h-28 w-full rounded-xl border border-brand-600 bg-brand-800 px-4 py-3 text-sm placeholder:text-brand-300 focus:outline-none" placeholder="Descreva sua operação atual e objetivo comercial." />
              <button className="w-full rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-brand-900">
                Enviar aplicação
              </button>
            </form>
          </div>
        </div>
      </section>

      <section id="recursos" className="mx-auto w-full max-w-6xl px-6 pb-8">
        <div className="grid gap-4 md:grid-cols-4">
          {highlights.map((item) => (
            <article key={item} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wide text-brand-700">Diferencial</h3>
              <p className="mt-2 text-sm text-slate-600">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-black text-brand-900">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="planos" className="bg-brand-900 py-16 text-white">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="text-3xl font-black">Planos GRDados</h2>
          <p className="mt-2 max-w-xl text-sm text-brand-100">
            Escolha o formato ideal para seu estágio e escale sua operação comercial com segurança.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className="rounded-2xl border border-brand-700 bg-brand-800 p-6">
                <h3 className="text-xl font-black">{plan.name}</h3>
                <p className="mt-2 text-2xl font-black">{plan.price}</p>
                <p className="mt-3 text-sm text-brand-100">{plan.text}</p>
                <Link href="/register" className="mt-5 inline-block rounded-lg bg-white px-4 py-2 text-sm font-black text-brand-900">
                  Começar
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-black text-brand-900">Pronto para lançar o CRM GRDados?</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Começamos pelo MVP, validamos cobrança/licença e evoluímos para o seu cenário completo.
            </p>
          </div>
          <div className="mt-6 flex gap-3 md:mt-0">
            <Link href="/register" className="rounded-xl bg-brand-800 px-6 py-3 text-sm font-black text-white">
              Solicitar acesso
            </Link>
            <Link href="/login" className="rounded-xl border border-brand-300 px-6 py-3 text-sm font-black text-brand-800">
              Entrar no app
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
