type LogoItem = {
  title: string;
  subtitle: string;
  icon:
    | "leaf"
    | "factory"
    | "boxes"
    | "buy"
    | "sell"
    | "pay"
    | "receive"
    | "cashflow"
    | "dre";
};

const items: LogoItem[] = [
  { title: "Agrogestao", subtitle: "Fazenda e operacao", icon: "leaf" },
  { title: "Producao", subtitle: "Apontamentos e metas", icon: "factory" },
  { title: "Estoque", subtitle: "Entradas e saidas", icon: "boxes" },
  { title: "Compras", subtitle: "Pedidos e fornecedores", icon: "buy" },
  { title: "Vendas", subtitle: "Pedidos e faturamento", icon: "sell" },
  { title: "Contas a Pagar", subtitle: "Agenda e controle", icon: "pay" },
  { title: "Contas a Receber", subtitle: "Cobrancas e boletos", icon: "receive" },
  { title: "Fluxo de Caixa", subtitle: "Previsto x realizado", icon: "cashflow" },
  { title: "DRE", subtitle: "Resultado do periodo", icon: "dre" },
];

function Icon({ kind }: { kind: LogoItem["icon"] }) {
  const common = "h-6 w-6";
  switch (kind) {
    case "leaf":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 4c-7 0-13 6-13 13 0 2 2 3 4 3 7 0 9-6 9-16Z" stroke="currentColor" strokeWidth="2" />
          <path d="M7 17c3-1 6-4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "factory":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 21V10l6 3V10l6 3V8l6 3v10H3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M7 21v-5h4v5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "boxes":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 7l9-4 9 4-9 4-9-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M3 7v10l9 4 9-4V7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 11v10" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "buy":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 7h15l-1.5 8.5H7.2L6 7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M6 7 5 3H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
        </svg>
      );
    case "sell":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 7H8l-1 12h12l1-12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 7a4 4 0 0 0-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "pay":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="2" />
          <path d="M7 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M14 12l2-2m-2 2l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "receive":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="2" />
          <path d="M7 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M14 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "cashflow":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 15l4-4 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "dre":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 3h10v18H7V3Z" stroke="currentColor" strokeWidth="2" />
          <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

function LogoCard({ item }: { item: LogoItem }) {
  return (
    <div className="flex min-w-[240px] items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 px-5 py-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-accent-300">
        <Icon kind={item.icon} />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-black text-white">{item.title}</p>
        <p className="text-xs font-semibold text-zinc-400">{item.subtitle}</p>
      </div>
    </div>
  );
}

export function LogoMarquee() {
  // Duplicate content to create a seamless loop.
  const loop = [...items, ...items];

  return (
    <section className="bg-[rgb(24_24_27)] py-10">
      <div className="mx-auto w-full max-w-6xl px-6">
        <p className="text-sm font-black text-zinc-100">
          Seu sistema e engessado e te obriga a criar relatorios paralelos?
        </p>
        <h2 className="mt-3 text-2xl font-black text-white md:text-3xl">
          E se voce tivesse tudo centralizado no Power BI, com dashboards dinamicos e prontos para apoiar suas decisoes?
        </h2>
        <p className="mt-5 text-sm font-black text-zinc-100">Com dashboards no Power BI, voce tem:</p>
        <ul className="mt-3 grid gap-2 text-sm text-zinc-300 md:grid-cols-3">
          <li>Tudo centralizado</li>
          <li>Dados atualizados em tempo real</li>
          <li>Visao clara para tomar decisoes rapidas</li>
        </ul>

        <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
          Modulos que estruturam a operacao
        </p>
      </div>

      <div className="relative mt-8 overflow-hidden">
        <div className="marquee-track px-6">
          {loop.map((item, idx) => (
            <LogoCard key={`${item.title}-${idx}`} item={item} />
          ))}
        </div>

        {/* Edge fades (left/right) to match the reference look */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[calc(18rem+40px)] bg-gradient-to-r from-[rgb(24_24_27)] via-[rgb(24_24_27)]/90 to-transparent md:w-[calc(24rem+40px)] lg:w-[460px]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[calc(18rem+40px)] bg-gradient-to-l from-[rgb(24_24_27)] via-[rgb(24_24_27)]/90 to-transparent md:w-[calc(24rem+40px)] lg:w-[460px]" />
      </div>
    </section>
  );
}
