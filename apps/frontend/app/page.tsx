import Image from 'next/image';
import Link from 'next/link';

import { HeroRotatingLine } from '@/components/HeroRotatingLine';
import { LogoMarquee } from '@/components/LogoMarquee';

const highlights = [
  'Pipeline visual para acompanhar cada oportunidade',
  'Tarefas e lembretes para nao perder follow-up',
  'Licenciamento SaaS com cobranca recorrente',
  'Dashboard comercial em tempo real',
];

export default function HomePage() {
  return (
    <main className='min-h-screen text-white'>
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
                CRM SaaS
              </p>
            </div>
          </div>

          <nav className='hidden items-center gap-2 md:flex'>
            <a
              href='#'
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
            <a
              href='#recursos'
              className='rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900'
            >
              Servicos
            </a>
            <a
              href='#planos'
              className='rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900'
            >
              Cases
            </a>
            <a
              href='#contato'
              className='rounded-xl px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900'
            >
              Blog
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

      <section id='sobre' className='mx-auto w-full max-w-6xl px-6 pb-8'>
        <div className='grid gap-4 md:grid-cols-4'>
          {highlights.map((item) => (
            <article
              key={item}
              className='rounded-2xl border border-zinc-700 bg-zinc-900 p-5'
            >
              <h3 className='text-sm font-black uppercase tracking-[0.15em] text-accent-300'>
                Diferencial
              </h3>
              <p className='mt-2 text-sm text-zinc-300'>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section id='localizacao' className='bg-zinc-950 py-16'>
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

      <footer className='border-t border-zinc-800 bg-zinc-950 py-12'>
        <div className='mx-auto w-full max-w-6xl px-6'>
          <div className='flex flex-col items-start justify-between gap-8 md:flex-row md:items-center'>
            <div className='flex items-center gap-4'>
              <Image
                src='/gr-dados-logo-gray.svg'
                alt='GR Dados'
                width={180}
                height={46}
              />
              <div className='text-sm text-zinc-400'>
                <p className='font-bold text-zinc-300'>GR Dados</p>
                <p>Todos Direitos reservados</p>
              </div>
            </div>

            <div className='text-sm text-zinc-400'>
              <p>AV 22 de abril, 519 - Centro - Laguna Carapa - MS</p>
              <p>CEP 79920-000</p>
              <p className='mt-2'>
                Contato:{' '}
                <a className='font-bold text-zinc-300 underline' href='tel:+5567998698159'>
                  (67) 99869-8159
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
