import Image from "next/image";
import Link from "next/link";

import { HeroRotatingLine } from "@/components/HeroRotatingLine";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIndicator } from "@/components/SectionIndicator";

export default function HomePage() {
  const solutionItems = [
    "CRM personalizado para sua operacao",
    "Dashboards inteligentes em Power BI",
    "Integracao com seus sistemas",
    "Automacao de processos"
  ];

  const solutionCards = [
    { title: "Power BI", href: "/servicos/power-bi", img: "/service-card-powerbi.svg" },
    { title: "ERP", href: "/servicos/erp", img: "/service-card-erp.svg" },
    { title: "CRM", href: "/servicos/crm", img: "/service-card-crm.svg" },
    { title: "Landing Page", href: "/servicos/landing-page", img: "/service-card-landing.svg" }
  ];

  const modules = [
    {
      tag: "Comercial",
      title: "Gestao de leads e funil de vendas"
    },
    {
      tag: "Financeiro",
      title: "Controle de receitas, despesas e lucro"
    },
    {
      tag: "Estoque",
      title: "Controle completo de produtos"
    },
    {
      tag: "BI / Indicadores",
      title: "Dashboards estrategicos em tempo real"
    }
  ];

  const beneficios = [
    "Agilidade na tomada de decisao",
    "Mais produtividade",
    "Decisoes com dados reais",
    "Reducao de custos e erros"
  ];

  const depoimentos = [
    {
      quote: "O sistema trouxe clareza total do meu negocio",
      name: "Rogajo",
      role: "Diretoria",
      avatar: "/avatars/cliente-1.svg",
      dash: "/modulos/producao.svg"
    },
    {
      quote: "Hoje sei exatamente onde estou ganhando dinheiro",
      name: "Valor Agro",
      role: "Financeiro",
      avatar: "/avatars/cliente-2.svg",
      dash: "/modulos/vendas.svg"
    },
    {
      quote: "A equipe ganhou produtividade e previsibilidade",
      name: "Irineu Cassol",
      role: "Operacao",
      avatar: "/avatars/cliente-3.svg",
      dash: "/modulos/producao-1.svg"
    }
  ];

  const faq = [
    { q: "Quanto custa?", a: "Depende do projeto, fazemos sob medida." },
    { q: "Demora quanto tempo?", a: "Em media 15 a 30 dias." },
    { q: "Funciona com meu sistema?", a: "Sim, fazemos integracao." }
  ];

  return (
    <main className="min-h-screen text-white" id="inicio">
      <SiteHeader />
      <SectionIndicator />

      {/* Sessao 1 - Inicio (Hero) */}
      <section className="mx-auto grid min-h-[72vh] w-full max-w-6xl items-center gap-10 px-6 py-14 md:grid-cols-12">
        <div className="md:col-span-6">
          <div className="space-y-6 text-left">
            <p className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-accent-300">
              Sistemas sob medida e produtos digitais
            </p>

            <h1 className="font-extrabold leading-[1.06] tracking-tight">
              <span className="block text-3xl md:text-4xl lg:text-5xl md:whitespace-nowrap">
                Chega de planilhas
              </span>
              <HeroRotatingLine
                phrases={[
                  "Tenha um sistema seu,\nFeito para seu negocio.",
                  "Tudo centralizado no Power BI,\ncom dashboards dinamicos."
                ]}
                className="mt-2 text-balance text-xl leading-[1.12] sm:text-2xl md:text-3xl lg:text-4xl"
              />
            </h1>

            <p className="max-w-xl text-base leading-7 text-zinc-200 md:text-lg">
              Sistemas sob medida para organizar processos, centralizar informacoes e dar mais controle ao seu negocio.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/iniciar-projeto"
                className="rounded-xl bg-accent-500 px-7 py-4 font-black text-zinc-950 hover:bg-accent-400"
              >
                Iniciar um projeto
              </Link>
            </div>
          </div>
        </div>

        <div className="relative hidden md:col-span-6 md:block">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 left-10 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl" />

          <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 p-5">
            <div className="absolute inset-0">
              {/* shape */}
              <div className="absolute -right-20 top-8 h-80 w-80 rounded-[48px] bg-gradient-to-br from-accent-500/20 via-zinc-950/0 to-transparent blur-2xl" />
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              <Image
                src="/modulos/vendas-1.svg"
                alt="Dashboard exemplo"
                width={1200}
                height={720}
                className="h-auto w-full"
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/5 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Sessao 2 - Problemas */}
      <section id="problemas" className="bg-zinc-950 py-14 scroll-mt-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            Problemas
          </p>
          <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
            Onde a operacao trava
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            Planilhas, retrabalho e falta de visao deixam a equipe lenta e a gestao sem previsibilidade.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
              <p className="text-sm font-black text-zinc-100">Relatorios paralelos</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Cada area cria o proprio controle e os numeros nao batem.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
              <p className="text-sm font-black text-zinc-100">Dados desatualizados</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Informacao chega tarde e a decisao vira aposta.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
              <p className="text-sm font-black text-zinc-100">Baixa produtividade</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Muito tempo em copiar e colar, pouco tempo em executar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sessao 3 - Solucao */}
      <section id="solucao" className="bg-[rgb(24_24_27)] py-16 scroll-mt-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            Solucao
          </p>
          <h2 className="mt-2 text-3xl font-black text-white md:text-5xl">
            Uma solucao completa para gestao e inteligencia de dados
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-8">
              <ul className="space-y-4 text-sm text-zinc-200">
                {solutionItems.map((text) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-500/15 text-accent-300">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M20 6 9 17l-5-5"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="font-bold text-zinc-100">{text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/iniciar-projeto"
                  className="inline-flex justify-center rounded-xl bg-accent-500 px-8 py-4 text-sm font-black text-zinc-950 hover:bg-accent-400"
                >
                  Solicitar demonstracao
                </a>
                <a
                  href="https://wa.me/5567998698159"
                  className="inline-flex justify-center rounded-xl border border-zinc-700 bg-zinc-950/40 px-8 py-4 text-sm font-black text-zinc-100 hover:bg-zinc-900"
                >
                  Falar agora
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {solutionCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/30"
                >
                  <div className="relative">
                    <Image
                      src={card.img}
                      alt={card.title}
                      width={1200}
                      height={720}
                      className="h-auto w-full"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/15 to-transparent" />
                  </div>
                  <div className="p-5">
                    <p className="text-sm font-black text-zinc-100 group-hover:text-white">
                      {card.title}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-zinc-400">Ver detalhes</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sessao 4 - Modulos */}
      <section id="modulos" className="bg-zinc-950 py-16 scroll-mt-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            Modulos
          </p>
          <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
            Modulos que estruturam a operacao
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((m) => (
              <div
                key={m.tag}
                className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 transition hover:bg-zinc-900/30"
              >
                <div
                  className="pointer-events-none absolute -inset-1 opacity-0 blur-2xl transition group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(700px 160px at 30% 10%, rgba(223,152,48,0.35), transparent 60%)"
                  }}
                />
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
                  {m.tag}
                </p>
                <p className="mt-3 text-sm font-black text-zinc-100">{m.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sessao 5 - Beneficios */}
      <section id="beneficios" className="bg-[rgb(24_24_27)] py-16 scroll-mt-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            Beneficios
          </p>
          <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
            Resultados que voce vai perceber na pratica
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {beneficios.map((b) => (
              <div key={b} className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6">
                <p className="text-sm font-black text-zinc-100">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sessao 6 - Sobre */}
      <section id="sobre" className="bg-zinc-950 py-16 scroll-mt-24">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
              Sobre
            </p>
            <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
              Especialistas em solucoes inteligentes para empresas
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300">
              Criamos sistemas sob medida combinando CRM + Business Intelligence, ajudando empresas a crescer com organizacao e estrategia.
            </p>
          </div>

          <div className="md:col-span-6">
            <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
              <Image
                src="/about-photo.svg"
                alt="GR Dados - especialistas"
                width={1400}
                height={980}
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

       {/* Sessao 7 - Depoimentos */}
      <section id="depoimentos" className="relative bg-zinc-950 py-16 scroll-mt-24">
        {/* Fundo suave (diferente do primario/secondary) */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_20%_-10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_420px_at_85%_110%,rgba(14,165,233,0.14),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_35%,rgba(0,0,0,0.10))]" />

        <div className="relative mx-auto w-full max-w-6xl px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            Depoimentos
          </p>
          <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
            O que muda na pratica
          </h2>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {depoimentos.map((t) => (
              <div
                key={t.quote}
                className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40"
              >
                <div className="relative">
                  <Image
                    src={t.dash}
                    alt="Dashboard"
                    width={1200}
                    height={720}
                    className="h-auto w-full"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/10 to-transparent" />
                </div>

                <div className="p-7">
                  <p className="text-sm font-black leading-7 text-zinc-100">
                    "{t.quote}"
                  </p>

                  <div className="mt-6 flex items-center gap-3">
                    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40">
                      <Image
                        src={t.avatar}
                        alt={t.name}
                        width={52}
                        height={52}
                        className="h-12 w-12"
                      />
                    </div>
                    <div className="leading-tight">
                      <p className="text-sm font-black text-white">{t.name}</p>
                      <p className="text-xs font-semibold text-zinc-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sessao 8 - Iniciar um projeto */}
      <section id="iniciar-projeto" className="bg-zinc-950 py-16 scroll-mt-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-10">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
            <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl" />

            <div className="relative grid gap-8 md:grid-cols-12 md:items-center">
              <div className="md:col-span-7">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                  Iniciar um projeto
                </p>
                <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
                  Pronto para transformar seu negocio?
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-300">
                  Vamos mapear seu processo e entregar um sistema sob medida com BI para decisao rapida.
                </p>
              </div>

              <div className="md:col-span-5">
                <div className="grid gap-3">
                  <Link
                    href="/register"
                    className="inline-flex justify-center rounded-2xl bg-accent-500 px-8 py-5 text-base font-black text-zinc-950 hover:bg-accent-400"
                  >
                    Solicitar demonstracao
                  </Link>
                  <a
                    href="https://wa.me/5567998698159"
                    className="inline-flex justify-center rounded-2xl border border-zinc-700 bg-zinc-950/40 px-8 py-5 text-base font-black text-zinc-100 hover:bg-zinc-950"
                  >
                    Falar agora
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sessao 9 - Quanto custa? */}
      <section id="quanto-custa" className="bg-[rgb(24_24_27)] py-16 scroll-mt-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            Quanto custa?
          </p>
          <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
            Perguntas frequentes
          </h2>

          <div className="mt-8 space-y-3">
            {faq.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6"
              >
                <summary className="cursor-pointer list-none text-sm font-black text-zinc-100">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <svg
                      className="h-4 w-4 text-zinc-400 transition group-open:rotate-180"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-zinc-300">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Sessao 10 - Localizacao */}
      <section id="localizacao" className="bg-zinc-950 py-16 scroll-mt-24">
        <div className="mx-auto grid w-full max-w-6xl items-stretch gap-6 px-6 md:grid-cols-12">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 md:col-span-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
              Localizacao
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">Onde estamos</h2>
            <p className="mt-3 text-sm text-zinc-300">
              AV 22 de abril, 519 - Centro - Laguna Carapa - MS
            </p>
            <p className="mt-1 text-sm text-zinc-300">CEP 79920-000</p>
            <p className="mt-4 text-sm font-bold text-accent-300">
              Contato:{" "}
              <a className="underline" href="tel:+5567998698159">
                (67) 99869-8159
              </a>
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 md:col-span-7">
            <iframe
              title="Mapa - GR Dados"
              className="h-[360px] w-full md:h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=AV%2022%20de%20abril%2C%20519%20-%20Centro%20-%20Laguna%20Carap%C3%A3%20-%20MS%2C%2079920-000&output=embed"
            />
          </div>
        </div>
      </section>

      {/* Sessao 11 - Rodape */}
      <SiteFooter />
    </main>
  );
}
