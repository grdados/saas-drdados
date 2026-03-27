import Image from "next/image";
import Link from "next/link";

import { HeroRotatingLine } from "@/components/HeroRotatingLine";
import { SectionIndicator } from "@/components/SectionIndicator";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getMessages } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function HomePage() {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale);
  const home = messages.home;

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />
      <SectionIndicator />

      <section
        id="inicio"
        className="mx-auto grid min-h-[68vh] w-full max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-12 lg:min-h-[72vh] lg:gap-10 lg:py-14"
      >
        <div className="md:col-span-6">
          <div className="space-y-6 text-left">
            <p className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-accent-300">
              {home.heroBadge}
            </p>

            <h1 className="font-extrabold leading-[1.06] tracking-tight">
              <span className="block text-2xl sm:text-3xl md:text-4xl md:whitespace-nowrap lg:text-5xl">
                {home.heroTitleTop}
              </span>
              <HeroRotatingLine
                phrases={[...home.heroPhrases]}
                className="mt-2 text-balance text-lg leading-[1.12] sm:text-xl md:text-2xl lg:text-4xl"
              />
            </h1>

            <p className="max-w-xl text-sm leading-6 text-zinc-200 sm:text-base sm:leading-7 md:text-lg">
              {home.heroDescription}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/iniciar-projeto"
                className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 sm:px-7 sm:py-4"
              >
                {home.heroCta}
              </Link>
            </div>
          </div>
        </div>

        <div className="relative hidden md:col-span-6 md:block">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 left-10 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl" />

          <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 p-5">
            <div className="absolute inset-0">
              <div className="absolute -right-20 top-8 h-80 w-80 rounded-[48px] bg-gradient-to-br from-accent-500/20 via-zinc-950/0 to-transparent blur-2xl" />
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              <Image
                src="/modulos/vendas-1.svg"
                alt={home.dashboardAlt}
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

      <section id="problemas" className="bg-zinc-950 py-10 scroll-mt-24 sm:py-12 lg:py-14">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-200">
            {home.sections.problems.tag}
          </p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl md:text-4xl">
            {home.sections.problems.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            {home.sections.problems.description}
          </p>

          <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-3">
            {home.sections.problems.cards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 transition hover:border-red-500/25 hover:bg-zinc-900/50 hover:shadow-[0_22px_70px_rgba(0,0,0,0.45)]"
              >
                <p className="text-sm font-black text-zinc-100">{card.title}</p>
                <p className="mt-2 text-sm leading-7 text-zinc-400">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solucao" className="bg-[rgb(24_24_27)] py-10 scroll-mt-24 sm:py-12 lg:py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
            {home.sections.solution.tag}
          </p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl md:text-4xl lg:text-5xl">
            {home.sections.solution.title}
          </h2>

          <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 lg:p-8">
              <ul className="space-y-4 text-sm text-zinc-200">
                {home.solutionItems.map((text) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-500/15 text-accent-300">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
                  className="inline-flex justify-center rounded-xl bg-accent-500 px-6 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 sm:px-8 sm:py-4"
                >
                  {home.sections.solution.demo}
                </a>
                <a
                  href="https://wa.me/5567998698159"
                  className="inline-flex justify-center rounded-xl border border-zinc-700 bg-zinc-950/40 px-6 py-3 text-sm font-black text-zinc-100 hover:bg-zinc-900 sm:px-8 sm:py-4"
                >
                  {home.sections.solution.talkNow}
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {home.solutionCards.map((card) => (
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
                    <p className="mt-1 text-xs font-semibold text-zinc-400">
                      {home.sections.solution.details}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="modulos" className="relative bg-zinc-950 py-10 scroll-mt-24 sm:py-12 lg:py-16">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/service-erp-dashboard.svg"
            alt=""
            fill
            className="object-cover opacity-[0.08] blur-[1px]"
            priority={false}
          />
          <div className="absolute inset-0 bg-[radial-gradient(900px_380px_at_25%_0%,rgba(223,152,48,0.18),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/85 to-zinc-950" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            {home.sections.modules.tag}
          </p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl md:text-4xl">
            {home.sections.modules.title}
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {home.modules.map((module) => (
              <div
                key={module.tag}
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
                  {module.tag}
                </p>
                <p className="mt-3 text-sm font-black text-zinc-100">{module.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="beneficios" className="bg-[rgb(24_24_27)] py-10 scroll-mt-24 sm:py-12 lg:py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            {home.sections.benefits.tag}
          </p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl md:text-4xl">
            {home.sections.benefits.title}
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {home.benefits.map((benefit) => (
              <div key={benefit} className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6">
                <p className="text-sm font-black text-zinc-100">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sobre" className="bg-zinc-950 py-10 scroll-mt-24 sm:py-12 lg:py-16">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 sm:px-6 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
              {home.sections.about.tag}
            </p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl md:text-4xl">
              {home.sections.about.title}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300">
              {home.sections.about.description}
            </p>
          </div>

          <div className="md:col-span-6">
            <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
              <Image
                src="/about-photo.svg"
                alt={home.sections.about.imageAlt}
                width={1400}
                height={980}
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="depoimentos" className="relative bg-zinc-950 py-10 scroll-mt-24 sm:py-12 lg:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(980px_440px_at_-10%_10%,rgba(99,102,241,0.22),transparent_62%),radial-gradient(920px_460px_at_15%_110%,rgba(14,165,233,0.16),transparent_62%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_35%,rgba(0,0,0,0.10))]" />

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            {home.sections.testimonials.tag}
          </p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl md:text-4xl">
            {home.sections.testimonials.title}
          </h2>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {home.testimonials.map((testimonial) => (
              <div
                key={testimonial.quote}
                className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40"
              >
                <div className="relative">
                  <Image
                    src={testimonial.dash}
                    alt={home.sections.testimonials.dashboardAlt}
                    width={1200}
                    height={720}
                    className="h-auto w-full"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/10 to-transparent" />
                </div>

                <div className="p-7">
                  <p className="text-sm font-black leading-7 text-zinc-100">
                    "{testimonial.quote}"
                  </p>

                  <div className="mt-6 flex items-center gap-3">
                    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40">
                      <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        width={52}
                        height={52}
                        className="h-12 w-12"
                      />
                    </div>
                    <div className="leading-tight">
                      <p className="text-sm font-black text-white">{testimonial.name}</p>
                      <p className="text-xs font-semibold text-zinc-400">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="iniciar-projeto" className="bg-zinc-950 py-10 scroll-mt-24 sm:py-12 lg:py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7 lg:p-10">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
            <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl" />

            <div className="relative grid gap-8 md:grid-cols-12 md:items-center">
              <div className="md:col-span-7">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                  {home.sections.project.tag}
                </p>
                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl md:text-4xl">
                  {home.sections.project.title}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-300">
                  {home.sections.project.description}
                </p>
              </div>

              <div className="md:col-span-5">
                <div className="grid gap-3">
                  <Link
                    href="/register"
                    className="inline-flex justify-center rounded-2xl bg-accent-500 px-6 py-3.5 text-sm font-black text-zinc-950 hover:bg-accent-400 sm:px-8 sm:py-5 sm:text-base"
                  >
                    {home.sections.project.demo}
                  </Link>
                  <a
                    href="https://wa.me/5567998698159"
                    className="inline-flex justify-center rounded-2xl border border-zinc-700 bg-zinc-950/40 px-6 py-3.5 text-sm font-black text-zinc-100 hover:bg-zinc-950 sm:px-8 sm:py-5 sm:text-base"
                  >
                    {home.sections.project.talkNow}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="quanto-custa" className="bg-[rgb(24_24_27)] py-10 scroll-mt-24 sm:py-12 lg:py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            {home.sections.pricing.tag}
          </p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl md:text-4xl">
            {home.sections.pricing.title}
          </h2>

          <div className="mt-8 space-y-3">
            {home.faq.map((item) => (
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

      <section id="localizacao" className="bg-zinc-950 py-10 scroll-mt-24 sm:py-12 lg:py-16">
        <div className="mx-auto grid w-full max-w-6xl items-stretch gap-4 px-4 sm:gap-6 sm:px-6 md:grid-cols-12">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 lg:p-8 md:col-span-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
              {home.sections.location.tag}
            </p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              {home.sections.location.title}
            </h2>
            <p className="mt-3 text-sm text-zinc-300">
              AV 22 de abril, 519 - Centro - Laguna Carapa - MS
            </p>
            <p className="mt-1 text-sm text-zinc-300">CEP 79920-000</p>
            <p className="mt-4 text-sm font-bold text-accent-300">
              {home.sections.location.contact}{" "}
              <a className="underline" href="tel:+5567998698159">
                (67) 99869-8159
              </a>
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 md:col-span-7">
            <iframe
              title={home.sections.location.mapTitle}
              className="h-[360px] w-full md:h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=AV%2022%20de%20abril%2C%20519%20-%20Centro%20-%20Laguna%20Carap%C3%A3%20-%20MS%2C%2079920-000&output=embed"
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
