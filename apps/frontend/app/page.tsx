import Image from 'next/image';
import Link from 'next/link';

import { HeroRotatingLine } from '@/components/HeroRotatingLine';
import { LogoMarquee } from '@/components/LogoMarquee';
import { SiteHeader } from '@/components/SiteHeader';

export default function HomePage() {
  return (
    <main className='min-h-screen text-white scroll-mt-24' id='inicio'>
      <SiteHeader />

      <section className='mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-12 md:items-center'>
        <div className='space-y-6'>
          <p className='inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-accent-300'>
            Sistemas sob medida e produtos digitais
          </p>
          <h1 className='font-extrabold leading-[1.03] tracking-tight'>
            <span className='block text-5xl md:text-6xl lg:text-7xl md:whitespace-nowrap'>
              Chega de planilhas
            </span>
            <HeroRotatingLine
              phrases={[
                'Vamos desenvolver\nseu projeto',
                'Tenha um sistema seu,\nFeito para seu negocio.',
              ]}
              className='mt-2 text-balance text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.05]'
            />
          </h1>
          <p className='max-w-xl text-lg text-zinc-200'>
            Sistemas sob medida para organizar processos, centralizar
            informações e dar mais controle ao seu negócio..
          </p>
          <div className='flex justify-start'>
            <Link
              href='/register'
              className='rounded-xl bg-accent-500 px-7 py-4 font-black text-zinc-950 hover:bg-accent-400'
            >
              Iniciar um projeto
            </Link>
          </div>
        </div>
      </section>

      <section className='mx-auto w-full max-w-6xl px-6 pb-6'>
        <div className='flex flex-col items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-6 py-4 md:flex-row'>
          <p className='text-xs font-black uppercase tracking-[0.22em] text-zinc-400'>
            Experiencia tecnica
          </p>
          <p className='text-sm font-extrabold text-zinc-100'>
            <span className='text-accent-300'>ERP &amp; Gestao</span>
            <span className='px-2 text-zinc-500'>|</span>
            <span className='text-zinc-100'>CRM</span>
            <span className='px-2 text-zinc-500'>|</span>
            <span className='text-zinc-100'>Landing Pages</span>
          </p>
        </div>
      </section>

      <LogoMarquee />

      <section id='sobre' className='bg-[rgb(24_24_27)] py-10 scroll-mt-24'>
        <div className='mx-auto grid w-full max-w-6xl items-center gap-8 px-6 md:grid-cols-12'>
          <div className='md:col-span-6'>
            <p className='inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-accent-300'>
              <span className='h-2 w-2 rounded-full bg-accent-400' />
              Sobre a GR Dados
            </p>

            <h2 className='mt-6 text-4xl font-black leading-tight md:text-5xl'>
              Projetos digitais com
              <span className='block text-accent-400'>logica e controle</span>
            </h2>

            <p className='mt-5 max-w-xl text-sm leading-7 text-zinc-300'>
              Engenharia de software sob medida para empresas que precisam de controle financeiro,
              processo estruturado e clareza operacional na rotina.
            </p>

            <div className='mt-6 space-y-3 text-sm text-zinc-200'>
              <div className='flex items-start gap-3'>
                <span className='mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-500/15 text-accent-300'>
                  ✓
                </span>
                <p>ERP, CRM, SaaS e automacoes avancadas</p>
              </div>
              <div className='flex items-start gap-3'>
                <span className='mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-500/15 text-accent-300'>
                  ✓
                </span>
                <p>Sistemas desenhados para a operacao real</p>
              </div>
              <div className='flex items-start gap-3'>
                <span className='mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-500/15 text-accent-300'>
                  ✓
                </span>
                <p>Tecnologia feita para escalar junto com o negocio</p>
              </div>
            </div>

            {/* CTA removido da sessao Sobre (mantemos apenas no Hero) */}
          </div>

          <div className='md:col-span-6'>
            <div className='relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/30 p-10'>
              <div className='absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-500/15 blur-3xl' />
              <div className='relative flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/50 p-12'>
                <Image
                  src='/gr-dados-logo-gray.svg'
                  alt='GR Dados'
                  width={260}
                  height={70}
                />
              </div>

              <div className='relative mt-6 flex justify-center text-center'>
                <div className='max-w-full'>
                  <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                    Software house
                  </p>
                  <p className='mt-2 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-extrabold text-white'>
                    Engenharia sob medida para negocios B2B
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section
        id='servicos'
        className='relative overflow-hidden bg-zinc-950 py-16 scroll-mt-24'
      >
        <div className='pointer-events-none absolute inset-0 opacity-[0.25]'>
          <div
            className='absolute inset-0'
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '52px 52px',
            }}
          />
          <div className='absolute inset-0 bg-gradient-to-b from-zinc-950/20 via-zinc-950/70 to-zinc-950' />
        </div>

        <div className='relative mx-auto w-full max-w-6xl px-6'>
          <div className='flex flex-col items-start justify-between gap-6 md:flex-row md:items-end'>
            <div>
              <p className='text-xs font-black uppercase tracking-[0.22em] text-zinc-400'>
                Servicos
              </p>
              <h2 className='mt-2 text-4xl font-black tracking-tight text-white md:text-5xl'>
                Solucoes para sua operacao
              </h2>
              <p className='mt-3 max-w-2xl text-sm leading-7 text-zinc-300'>
                Power BI, ERP, CRM e Landing Page. Cada servico tem uma pagina dedicada.
              </p>
            </div>
          </div>

          <div className='mt-10 grid gap-6 md:grid-cols-2'>
            <Link
              href='/servicos/power-bi'
              className='group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/30'
            >
              <div className='relative'>
                <Image
                  src='/service-card-powerbi.svg'
                  alt='Power BI'
                  width={1200}
                  height={720}
                  className='h-auto w-full'
                />
                <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/15 to-transparent' />
              </div>
              <div className='p-7'>
                <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                  Power BI
                </p>
                <p className='mt-2 text-2xl font-black text-zinc-100 group-hover:text-white'>
                  Dashboards e indicadores
                </p>
                <p className='mt-2 text-sm leading-7 text-zinc-400'>
                  Modelagem, DAX, relatorios e visao executiva para decisao rapida.
                </p>
              </div>
            </Link>

            <Link
              href='/servicos/erp'
              className='group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/30'
            >
              <div className='relative'>
                <Image
                  src='/service-card-erp.svg'
                  alt='ERP'
                  width={1200}
                  height={720}
                  className='h-auto w-full'
                />
                <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/15 to-transparent' />
              </div>
              <div className='p-7'>
                <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                  ERP
                </p>
                <p className='mt-2 text-2xl font-black text-zinc-100 group-hover:text-white'>
                  Gestao e operacao
                </p>
                <p className='mt-2 text-sm leading-7 text-zinc-400'>
                  Processos, financeiro, estoque e relatorios centralizados.
                </p>
              </div>
            </Link>

            <Link
              href='/servicos/crm'
              className='group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/30'
            >
              <div className='relative'>
                <Image
                  src='/service-card-crm.svg'
                  alt='CRM'
                  width={1200}
                  height={720}
                  className='h-auto w-full'
                />
                <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/15 to-transparent' />
              </div>
              <div className='p-7'>
                <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                  CRM
                </p>
                <p className='mt-2 text-2xl font-black text-zinc-100 group-hover:text-white'>
                  Funil e produtividade
                </p>
                <p className='mt-2 text-sm leading-7 text-zinc-400'>
                  Leads, tarefas e acompanhamento do comercial em um unico painel.
                </p>
              </div>
            </Link>

            <Link
              href='/servicos/landing-page'
              className='group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/30'
            >
              <div className='relative'>
                <Image
                  src='/service-card-landing.svg'
                  alt='Landing Page'
                  width={1200}
                  height={720}
                  className='h-auto w-full'
                />
                <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/15 to-transparent' />
              </div>
              <div className='p-7'>
                <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                  Landing Page
                </p>
                <p className='mt-2 text-2xl font-black text-zinc-100 group-hover:text-white'>
                  Conversao com performance
                </p>
                <p className='mt-2 text-sm leading-7 text-zinc-400'>
                  Design, copy, SEO e velocidade para gerar demanda.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section id='localizacao' className='bg-zinc-950 py-16 scroll-mt-24'>
        <div className='mx-auto grid w-full max-w-6xl items-stretch gap-6 px-6 md:grid-cols-12'>
          <div className='rounded-3xl border border-zinc-800 bg-zinc-900 p-8 md:col-span-5'>
            <p className='text-xs font-black uppercase tracking-[0.22em] text-zinc-400'>
              Localizacao
            </p>
            <h2 className='mt-2 text-3xl font-black text-white'>Onde estamos</h2>
            <p className='mt-3 text-sm text-zinc-300'>
              AV 22 de abril, 519 - Centro - Laguna Carapa - MS
            </p>
            <p className='mt-1 text-sm text-zinc-300'>CEP 79920-000</p>
            <p className='mt-4 text-sm font-bold text-accent-300'>
              Contato: <a className='underline' href='tel:+5567998698159'>(67) 99869-8159</a>
            </p>
          </div>
          <div className='overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 md:col-span-7'>
            <iframe
              title='Mapa - GR Dados'
              className='h-[360px] w-full md:h-full'
              loading='lazy'
              referrerPolicy='no-referrer-when-downgrade'
              src='https://www.google.com/maps?q=AV%2022%20de%20abril%2C%20519%20-%20Centro%20-%20Laguna%20Carap%C3%A3%20-%20MS%2C%2079920-000&output=embed'
            />
          </div>
        </div>
      </section>

      <footer className='border-t border-zinc-800 bg-zinc-950'>
        <div className='mx-auto w-full max-w-6xl px-6 py-14'>
          <div className='grid gap-10 md:grid-cols-12'>
            <div className='md:col-span-4'>
              <Image
                src='/gr-dados-logo-gray.svg'
                alt='GR Dados'
                width={210}
                height={56}
              />
              <p className='mt-5 max-w-md text-sm leading-7 text-zinc-400'>
                A GR Dados desenvolve sistemas sob medida para empresas que precisam de
                mais controle, clareza operacional e base tecnologica para crescer.
              </p>

              <div className='mt-6 flex items-start gap-3 text-sm text-zinc-300'>
                <span className='mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-accent-300'>
                  ⦿
                </span>
                <div>
                  <p className='font-black text-zinc-100'>Base estrategica</p>
                  <p className='text-zinc-400'>
                    AV 22 de abril, 519 - Centro - Laguna Carapa - MS
                  </p>
                  <p className='text-zinc-400'>CEP 79920-000</p>
                </div>
              </div>
            </div>

            <div className='md:col-span-3'>
              <p className='text-sm font-black text-zinc-100'>Solucoes</p>
              <div className='mt-4 space-y-3 text-sm text-zinc-400'>
                <Link className='block hover:text-zinc-200' href='/servicos/power-bi'>
                  Power BI
                </Link>
                <Link className='block hover:text-zinc-200' href='/servicos/erp'>
                  ERP
                </Link>
                <Link className='block hover:text-zinc-200' href='/servicos/crm'>
                  CRM
                </Link>
                <Link className='block hover:text-zinc-200' href='/servicos/landing-page'>
                  Landing Page
                </Link>
              </div>
            </div>

            <div className='md:col-span-2'>
              <p className='text-sm font-black text-zinc-100'>Institucional</p>
              <div className='mt-4 space-y-3 text-sm'>
                <a className='block text-zinc-400 hover:text-zinc-200' href='#inicio'>
                  Inicio
                </a>
                <a className='block text-zinc-400 hover:text-zinc-200' href='#sobre'>
                  Sobre
                </a>
                <a className='block text-zinc-400 hover:text-zinc-200' href='#servicos'>
                  Servicos
                </a>
                <a className='block text-zinc-400 hover:text-zinc-200' href='#localizacao'>
                  Localizacao
                </a>
              </div>
            </div>

            <div className='md:col-span-3'>
              <p className='text-sm font-black text-zinc-100'>Canais Institucionais</p>
              <div className='mt-4 space-y-4'>
                <div className='w-full min-w-[260px] rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:min-w-[320px]'>
                  <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                    WhatsApp Comercial
                  </p>
                  <p className='mt-2 whitespace-nowrap text-sm font-black text-zinc-100'>
                    <a className='inline-block whitespace-nowrap underline tabular-nums' href='tel:+5567998698159'>
                      (67) 99869-8159
                    </a>
                  </p>
                </div>
                <div className='w-full min-w-[260px] rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:min-w-[320px]'>
                  <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                    Endereco
                  </p>
                  <p className='mt-2 whitespace-nowrap text-sm font-black text-zinc-100'>
                    Laguna Carapa - MS
                  </p>
                  <p className='text-xs font-semibold text-zinc-400'>CEP 79920-000</p>
                </div>
              </div>
            </div>
          </div>

          <div className='mt-12 flex flex-col items-start justify-between gap-4 border-t border-zinc-800 pt-8 text-sm text-zinc-500 md:flex-row md:items-center'>
            <p>© 2026 GR Dados. Todos os direitos reservados.</p>
            <div className='flex gap-6'>
              <a className='hover:text-zinc-300' href='#'>
                Politica de Privacidade
              </a>
              <a className='hover:text-zinc-300' href='#'>
                Termos de Uso
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
