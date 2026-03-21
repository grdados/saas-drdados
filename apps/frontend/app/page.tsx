import Image from "next/image";
import Link from "next/link";

const highlights = [
  "Pipeline visual para acompanhar cada oportunidade",
  "Tarefas e lembretes para nao perder follow-up",
  "Licenciamento SaaS com cobranca recorrente",
  "Dashboard comercial em tempo real"
];

const steps = [
  { title: "1. Estruturamos seu funil", text: "Configure etapas, origem de lead e responsaveis comerciais em minutos." },
  { title: "2. Centralizamos o relacionamento", text: "Todas as interacoes e tarefas em um unico lugar por empresa." },
  { title: "3. Escalamos com previsibilidade", text: "Relatorios claros para decisoes rapidas e crescimento consistente." }
];

const plans = [
  { name: "Start", price: "R$ 99", text: "Ate 3 usuarios, funil, tarefas e dashboard base." },
  { name: "Growth", price: "R$ 249", text: "Ate 12 usuarios, automacoes comerciais e indicadores avancados." },
  { name: "Scale", price: "Sob consulta", text: "Usuarios ilimitados, integracoes dedicadas e onboarding estrategico." }
];

export default function HomePage() {
  return (
    <main className="min-h-screen text-white">
      <header className="border-b border-zinc-800 bg-zinc-950/95">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/elvis-correia-logo.svg" alt="Logo Elvis Correia" width={46} height={46} className="rounded-full" />
            <div>
              <p className="text-lg font-extrabold leading-none tracking-tight">GRDados</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">CRM SaaS</p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            <a href="#" className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold text-accent-300">
              Home
            </a>
            <a href="#sobre" className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900">
              Sobre
            </a>
            <a href="#recursos" className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900">
              Servicos
            </a>
            <a href="#planos" className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900">
              Cases
            </a>
            <a href="#contato" className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900">
              Blog
            </a>
          </nav>

          <Link href="/register" className="rounded-2xl bg-accent-500 px-6 py-3 text-sm font-black text-zinc-950 transition hover:bg-accent-400">
            Iniciar um projeto
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-12 md:grid-cols-2 md:items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-accent-300">
            Sistemas sob medida e produtos digitais
          </p>
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
            Chega de planilhas.
            <span className="mt-2 block text-accent-400">Tenha um CRM que acelera receita.</span>
          </h1>
          <p className="max-w-xl text-lg text-zinc-300">
            O GRDados organiza leads, tarefas e funil em uma plataforma escura, robusta e pronta para crescimento real.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="rounded-xl bg-accent-500 px-7 py-4 font-black text-zinc-950 hover:bg-accent-400">
              Quero ver demo
            </Link>
            <a href="#contato" className="rounded-xl border border-zinc-700 bg-zinc-900 px-7 py-4 font-black text-zinc-100 hover:bg-zinc-800">
              Falar com consultor
            </a>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-panel">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl" />
          <div className="relative">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.15em] text-accent-300">Formulario de Aplicacao</p>
            <h2 className="text-2xl font-extrabold">Crie seu cenario CRM no GRDados</h2>
            <p className="mt-2 text-sm text-zinc-400">Responderemos em ate 1 dia util com proposta e cronograma.</p>
            <form className="mt-6 space-y-4">
              <input className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm placeholder:text-zinc-500 focus:outline-none" placeholder="Seu nome" />
              <input className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm placeholder:text-zinc-500 focus:outline-none" placeholder="Seu e-mail corporativo" />
              <input className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm placeholder:text-zinc-500 focus:outline-none" placeholder="Empresa ou projeto" />
              <textarea className="h-28 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm placeholder:text-zinc-500 focus:outline-none" placeholder="Descreva sua operacao atual e objetivo comercial." />
              <button className="w-full rounded-xl bg-accent-500 px-5 py-3 text-sm font-extrabold text-zinc-950">Enviar aplicacao</button>
            </form>
          </div>
        </div>
      </section>

      <section id="sobre" className="mx-auto w-full max-w-6xl px-6 pb-8">
        <div className="grid gap-4 md:grid-cols-4">
          {highlights.map((item) => (
            <article key={item} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-accent-300">Diferencial</h3>
              <p className="mt-2 text-sm text-zinc-300">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="recursos" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.title} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
              <h3 className="text-xl font-black text-accent-300">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="planos" className="border-y border-zinc-800 bg-zinc-950 py-16">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="text-3xl font-black">Planos GRDados</h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Escolha o formato ideal para seu estagio e escale sua operacao comercial com seguranca.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
                <h3 className="text-xl font-black">{plan.name}</h3>
                <p className="mt-2 text-2xl font-black text-accent-300">{plan.price}</p>
                <p className="mt-3 text-sm text-zinc-300">{plan.text}</p>
                <Link href="/register" className="mt-5 inline-block rounded-lg bg-accent-500 px-4 py-2 text-sm font-black text-zinc-950">
                  Comecar
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-zinc-700 bg-zinc-900 p-8 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-black">Pronto para lancar o CRM GRDados?</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-300">
              Comecamos pelo MVP, validamos cobranca e licenca e evoluimos para o seu cenario completo.
            </p>
          </div>
          <div className="mt-6 flex gap-3 md:mt-0">
            <Link href="/register" className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-black text-zinc-950">
              Solicitar acesso
            </Link>
            <Link href="/login" className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-black text-zinc-200">
              Entrar no app
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
