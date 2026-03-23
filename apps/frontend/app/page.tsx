import Image from 'next/image';
import Link from 'next/link';

import { HeroRotatingLine } from '@/components/HeroRotatingLine';
import { LogoMarquee } from '@/components/LogoMarquee';

export default function HomePage() {
  return (
    <main className='min-h-screen text-white scroll-mt-24' id='inicio'>
      <header className='border-b border-zinc-800 bg-zinc-950/95'>
        <div className='mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4'>
          <div className='flex items-center gap-3'>
            <Image
              src='/elvis-correia-logo.svg'
              alt='Logo Elvis Correia'
              width={46}
              height={46}
              className='rounded-full'
            />
            <div>
              <p className='text-lg font-extrabold leading-none tracking-tight'>
                GR Dados
              </p>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400'>
                ERP
              </p>
            </div>
          </div>

          <nav className='hidden items-center gap-2 md:flex'>
            <a
              href='#inicio'
              className='rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold text-accent-300'
            >
              Inicio
            </a>
            <a
              href='#sobre'
              className='rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900'
            >
              Sobre
            </a>
            <details className='group relative'>
              <summary className='list-none cursor-pointer rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900'>
                <span className='inline-flex items-center gap-2'>
                  Servicos
                  <svg
                    className='h-4 w-4 text-zinc-400 transition group-open:rotate-180'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                    aria-hidden='true'
                  >
                    <path
                      fillRule='evenodd'
                      d='M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z'
                      clipRule='evenodd'
                    />
                  </svg>
                </span>
              </summary>
              <div className='absolute left-0 top-[calc(100%+10px)] z-30 w-56 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl shadow-black/50'>
                <a
                  href='#servicos-erp'
                  className='block px-4 py-3 text-sm font-black text-accent-300 hover:bg-zinc-900'
                >
                  Sistemas ERP
                </a>
                <a
                  href='#servicos-saas'
                  className='block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900'
                >
                  SaaS e MVP
                </a>
                <a
                  href='#servicos-crm'
                  className='block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900'
                >
                  CRM Personalizado
                </a>
                <a
                  href='#servicos-ia'
                  className='block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900'
                >
                  IA e Automacao
                </a>
                <a
                  href='#servicos-portais'
                  className='block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900'
                >
                  Portais Web
                </a>
                <a
                  href='#servicos-sites'
                  className='block px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900'
                >
                  Sites Corporativos
                </a>
              </div>
            </details>
            <a
              href='#localizacao'
              className='rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900'
            >
              Localizacao
            </a>
          </nav>

          <Link
            href='/login'
            className='rounded-2xl bg-accent-500 px-6 py-3 text-sm font-black text-zinc-950 transition hover:bg-accent-400'
          >
            Login
          </Link>
        </div>
      </header>

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
          <div
            id='servicos-erp'
            className='grid items-center gap-10 md:grid-cols-12'
          >
            <div className='md:col-span-6'>
              <p className='inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-accent-300'>
                <span className='h-2 w-2 rounded-full bg-accent-400' />
                Sistemas de gestao &amp; ERP
              </p>

              <h2 className='mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl'>
                Organize a operacao da
                <span className='block'>
                  sua empresa com{' '}
                  <span className='text-accent-400'>controle total.</span>
                </span>
              </h2>

              <p className='mt-5 max-w-xl text-sm leading-7 text-zinc-300'>
                Desenvolvemos sistemas sob medida para empresas que precisam sair das planilhas,
                centralizar processos, acompanhar indicadores e ganhar mais controle financeiro e
                gerencial da operacao.
              </p>

              <div className='mt-8 flex flex-col gap-3 sm:flex-row sm:items-center'>
                <Link
                  href='/register'
                  className='inline-flex justify-center rounded-xl bg-accent-500 px-8 py-4 text-sm font-black text-zinc-950 hover:bg-accent-400'
                >
                  Iniciar um projeto
                </Link>
                <a
                  href='#localizacao'
                  className='inline-flex justify-center rounded-xl border border-zinc-700 bg-zinc-950/40 px-8 py-4 text-sm font-black text-zinc-100 hover:bg-zinc-900'
                >
                  Ver casos reais
                </a>
              </div>

              <div className='mt-8 flex flex-wrap gap-3'>
                <span className='inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-xs font-bold text-zinc-200'>
                  <span className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-500/15 text-accent-300'>
                    ✓
                  </span>
                  Sob medida para a operacao
                </span>
                <span className='inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-xs font-bold text-zinc-200'>
                  <span className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-500/15 text-accent-300'>
                    ✓
                  </span>
                  Nada de software pronto engessado
                </span>
                <span className='inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-xs font-bold text-zinc-200'>
                  <span className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-500/15 text-accent-300'>
                    ✓
                  </span>
                  Integracao financeira total
                </span>
              </div>
            </div>

            <div className='md:col-span-6'>
              <div className='relative'>
                <div className='absolute -right-10 -top-10 h-64 w-64 rounded-full bg-accent-500/15 blur-3xl' />
                <div className='relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5'>
                  <div className='overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950'>
                    <Image
                      src='/service-erp-dashboard.svg'
                      alt='Dashboard ERP'
                      width={1200}
                      height={740}
                      className='h-auto w-full'
                      priority={false}
                    />
                  </div>
                </div>

                <div className='absolute -bottom-6 right-4 max-w-[340px] rounded-2xl border border-zinc-800 bg-white p-5 text-zinc-900 shadow-2xl shadow-black/40'>
                  <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500'>
                    Operacao centralizada
                  </p>
                  <p className='mt-2 text-sm font-extrabold leading-6 text-zinc-900'>
                    Financeiro, processos e relatorios em um so ambiente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className='mt-14 grid gap-4 md:grid-cols-3'>
            <a
              id='servicos-saas'
              href='#servicos-saas'
              className='group rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 hover:bg-zinc-900/40'
            >
              <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                SaaS e MVP
              </p>
              <p className='mt-2 text-lg font-black text-zinc-100 group-hover:text-white'>
                Lancamento rapido com base pronta
              </p>
              <p className='mt-2 text-sm leading-7 text-zinc-400'>
                Autenticacao, licenca e portal para validar e vender.
              </p>
            </a>

            <a
              id='servicos-crm'
              href='#servicos-crm'
              className='group rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 hover:bg-zinc-900/40'
            >
              <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                CRM Personalizado
              </p>
              <p className='mt-2 text-lg font-black text-zinc-100 group-hover:text-white'>
                Funil, tarefas e operacao comercial
              </p>
              <p className='mt-2 text-sm leading-7 text-zinc-400'>
                Tudo alinhado ao seu processo e realidade.
              </p>
            </a>

            <a
              id='servicos-ia'
              href='#servicos-ia'
              className='group rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 hover:bg-zinc-900/40'
            >
              <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                IA e Automacao
              </p>
              <p className='mt-2 text-lg font-black text-zinc-100 group-hover:text-white'>
                Processos mais rapidos e consistentes
              </p>
              <p className='mt-2 text-sm leading-7 text-zinc-400'>
                Integracoes, rotinas e assistentes para o time.
              </p>
            </a>

            <a
              id='servicos-portais'
              href='#servicos-portais'
              className='group rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 hover:bg-zinc-900/40'
            >
              <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                Portais Web
              </p>
              <p className='mt-2 text-lg font-black text-zinc-100 group-hover:text-white'>
                Area do cliente e operacao online
              </p>
              <p className='mt-2 text-sm leading-7 text-zinc-400'>
                Acesso, relatorios e processos em um lugar.
              </p>
            </a>

            <a
              id='servicos-sites'
              href='#servicos-sites'
              className='group rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 hover:bg-zinc-900/40 md:col-span-2'
            >
              <p className='text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400'>
                Sites Corporativos
              </p>
              <p className='mt-2 text-lg font-black text-zinc-100 group-hover:text-white'>
                Marca forte, claro e rapido
              </p>
              <p className='mt-2 max-w-2xl text-sm leading-7 text-zinc-400'>
                Landing pages e sites com performance, SEO e visual de alto nivel.
              </p>
            </a>
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
                <p>Agrogestao</p>
                <p>Producao</p>
                <p>Estoque</p>
                <p>Contas a Pagar</p>
                <p>Contas a Receber</p>
                <p>Fluxo de Caixa</p>
                <p>DRE</p>
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
