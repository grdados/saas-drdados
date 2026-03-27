export const SUPPORTED_LOCALES = ["pt-BR", "en-US"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "pt-BR";
export const LOCALE_COOKIE_NAME = "grdados_locale";

function normalizeLocale(input?: string | null): AppLocale | undefined {
  if (!input) return undefined;

  const value = input.toLowerCase();
  if (value.startsWith("pt")) return "pt-BR";
  if (value.startsWith("en")) return "en-US";

  return undefined;
}

export function detectLocaleFromAcceptLanguage(input?: string | null): AppLocale {
  if (!input) return DEFAULT_LOCALE;

  const candidates = input
    .split(",")
    .map((item) => item.split(";")[0]?.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}

export const translations = {
  "pt-BR": {
    meta: {
      description: "Solucoes sob medida para gestao, CRM e BI com Power BI."
    },
    localeSwitcher: {
      label: "Idioma",
      options: {
        "pt-BR": "PT",
        "en-US": "EN"
      }
    },
    header: {
      ariaMenu: "Menu principal",
      nav: {
        home: "Inicio",
        problems: "Problemas",
        solution: "Solucao",
        modules: "Modulos",
        benefits: "Beneficios",
        about: "Sobre",
        testimonials: "Depoimentos",
        pricing: "Quanto custa?",
        location: "Localizacao"
      },
      more: "Mais",
      startProject: "Iniciar um projeto",
      login: "Login"
    },
    footer: {
      description:
        "A GR Dados desenvolve sistemas sob medida para empresas que precisam de mais controle, clareza operacional e base tecnologica para crescer.",
      strategicBase: "Base estrategica",
      solutions: "Solucoes",
      institutional: "Institucional",
      channels: "Canais institucionais",
      commercialWhatsapp: "WhatsApp comercial",
      address: "Endereco",
      rightsReserved: "(c) 2026 GR Dados. Todos os direitos reservados.",
      privacy: "Politica de Privacidade",
      terms: "Termos de Uso"
    },
    whatsapp: {
      message: "Ola! Quero falar sobre um projeto com a GR Dados.",
      ariaLabel: "Falar no WhatsApp",
      title: "Falar no WhatsApp",
      button: "WhatsApp"
    },
    auth: {
      login: {
        title: "Entrar no GR Dados",
        subtitle: "Acesse seu ERP.",
        email: "E-mail",
        password: "Senha",
        submit: "Entrar",
        loading: "Entrando...",
        noAccount: "Ainda nao tem conta?",
        createAccount: "Criar conta",
        fallbackError: "Nao foi possivel entrar. Verifique e-mail e senha."
      },
      register: {
        title: "Criar conta GR Dados",
        subtitle: "Comece seu CRM agora.",
        name: "Seu nome",
        email: "E-mail",
        company: "Empresa",
        password: "Senha (minimo 8 caracteres)",
        submit: "Criar conta",
        loading: "Criando...",
        hasAccount: "Ja possui conta?",
        login: "Entrar",
        fallbackError: "Nao foi possivel criar a conta."
      }
    },
    home: {
      heroBadge: "Sistemas sob medida e produtos digitais",
      heroTitleTop: "Chega de planilhas",
      heroPhrases: [
        "Tenha um sistema seu,\nfeito para seu negocio.",
        "Tudo centralizado no Power BI,\ncom dashboards dinamicos."
      ],
      heroDescription:
        "Sistemas sob medida para organizar processos, centralizar informacoes e dar mais controle ao seu negocio.",
      heroCta: "Iniciar um projeto",
      solutionItems: [
        "CRM personalizado para sua operacao",
        "Dashboards inteligentes em Power BI",
        "Integracao com seus sistemas",
        "Automacao de processos"
      ],
      solutionCards: [
        { title: "Power BI", href: "/servicos/power-bi", img: "/service-card-powerbi.svg" },
        { title: "ERP", href: "/servicos/erp", img: "/service-card-erp.svg" },
        { title: "CRM", href: "/servicos/crm", img: "/service-card-crm.svg" },
        { title: "Landing Page", href: "/servicos/landing-page", img: "/service-card-landing.svg" }
      ],
      modules: [
        { tag: "Comercial", title: "Gestao de leads e funil de vendas" },
        { tag: "Financeiro", title: "Controle de receitas, despesas e lucro" },
        { tag: "Estoque", title: "Controle completo de produtos" },
        { tag: "BI / Indicadores", title: "Dashboards estrategicos em tempo real" }
      ],
      benefits: [
        "Agilidade na tomada de decisao",
        "Mais produtividade",
        "Decisoes com dados reais",
        "Reducao de custos e erros"
      ],
      testimonials: [
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
      ],
      faq: [
        { q: "Quanto custa?", a: "Depende do projeto, fazemos sob medida." },
        { q: "Demora quanto tempo?", a: "Em media 15 a 30 dias." },
        { q: "Funciona com meu sistema?", a: "Sim, fazemos integracao." }
      ],
      dashboardAlt: "Dashboard exemplo",
      sections: {
        problems: {
          tag: "Problemas",
          title: "Onde a operacao trava",
          description:
            "Planilhas, retrabalho e falta de visao deixam a equipe lenta e a gestao sem previsibilidade.",
          cards: [
            {
              title: "Relatorios paralelos",
              text: "Cada area cria o proprio controle e os numeros nao batem."
            },
            {
              title: "Dados desatualizados",
              text: "Informacao chega tarde e a decisao vira aposta."
            },
            {
              title: "Baixa produtividade",
              text: "Muito tempo em copiar e colar, pouco tempo em executar."
            }
          ]
        },
        solution: {
          tag: "Solucao",
          title: "Uma solucao completa para gestao e inteligencia de dados",
          demo: "Solicitar demonstracao",
          talkNow: "Falar agora",
          details: "Ver detalhes"
        },
        modules: {
          tag: "Modulos",
          title: "Modulos que estruturam a operacao"
        },
        benefits: {
          tag: "Beneficios",
          title: "Resultados que voce vai perceber na pratica"
        },
        about: {
          tag: "Sobre",
          title: "Especialistas em solucoes inteligentes para empresas",
          description:
            "Criamos sistemas sob medida combinando CRM + Business Intelligence, ajudando empresas a crescer com organizacao e estrategia.",
          imageAlt: "GR Dados - especialistas"
        },
        testimonials: {
          tag: "Depoimentos",
          title: "O que muda na pratica",
          dashboardAlt: "Dashboard"
        },
        project: {
          tag: "Iniciar um projeto",
          title: "Pronto para transformar seu negocio?",
          description:
            "Vamos mapear seu processo e entregar um sistema sob medida com BI para decisao rapida.",
          demo: "Solicitar demonstracao",
          talkNow: "Falar agora"
        },
        pricing: {
          tag: "Quanto custa?",
          title: "Perguntas frequentes"
        },
        location: {
          tag: "Localizacao",
          title: "Onde estamos",
          contact: "Contato:",
          mapTitle: "Mapa - GR Dados"
        }
      }
    }
  },
  "en-US": {
    meta: {
      description: "Tailored solutions for operations, CRM, and BI powered by Power BI."
    },
    localeSwitcher: {
      label: "Language",
      options: {
        "pt-BR": "PT",
        "en-US": "EN"
      }
    },
    header: {
      ariaMenu: "Main menu",
      nav: {
        home: "Home",
        problems: "Challenges",
        solution: "Solution",
        modules: "Modules",
        benefits: "Benefits",
        about: "About",
        testimonials: "Testimonials",
        pricing: "Pricing",
        location: "Location"
      },
      more: "More",
      startProject: "Start a project",
      login: "Login"
    },
    footer: {
      description:
        "GR Dados builds tailored systems for companies that need more control, operational clarity, and a stronger technology foundation to grow.",
      strategicBase: "Strategic base",
      solutions: "Solutions",
      institutional: "Company",
      channels: "Contact channels",
      commercialWhatsapp: "Sales WhatsApp",
      address: "Address",
      rightsReserved: "(c) 2026 GR Dados. All rights reserved.",
      privacy: "Privacy Policy",
      terms: "Terms of Use"
    },
    whatsapp: {
      message: "Hello! I want to talk about a project with GR Dados.",
      ariaLabel: "Talk on WhatsApp",
      title: "Talk on WhatsApp",
      button: "WhatsApp"
    },
    auth: {
      login: {
        title: "Log in to GR Dados",
        subtitle: "Access your ERP.",
        email: "Email",
        password: "Password",
        submit: "Log in",
        loading: "Signing in...",
        noAccount: "Don’t have an account yet?",
        createAccount: "Create account",
        fallbackError: "We could not sign you in. Check your email and password."
      },
      register: {
        title: "Create your GR Dados account",
        subtitle: "Start your CRM now.",
        name: "Your name",
        email: "Email",
        company: "Company",
        password: "Password (minimum 8 characters)",
        submit: "Create account",
        loading: "Creating...",
        hasAccount: "Already have an account?",
        login: "Log in",
        fallbackError: "We could not create your account."
      }
    },
    home: {
      heroBadge: "Tailored systems and digital products",
      heroTitleTop: "Move beyond spreadsheets",
      heroPhrases: [
        "Own a system that is yours,\nbuilt for your business.",
        "Everything centralized in Power BI,\nwith dynamic dashboards."
      ],
      heroDescription:
        "Tailored systems to organize processes, centralize information, and give your business more control.",
      heroCta: "Start a project",
      solutionItems: [
        "Custom CRM for your operation",
        "Smart dashboards in Power BI",
        "Integration with your existing systems",
        "Process automation"
      ],
      solutionCards: [
        { title: "Power BI", href: "/servicos/power-bi", img: "/service-card-powerbi.svg" },
        { title: "ERP", href: "/servicos/erp", img: "/service-card-erp.svg" },
        { title: "CRM", href: "/servicos/crm", img: "/service-card-crm.svg" },
        { title: "Landing Page", href: "/servicos/landing-page", img: "/service-card-landing.svg" }
      ],
      modules: [
        { tag: "Sales", title: "Lead management and sales pipeline" },
        { tag: "Finance", title: "Revenue, expenses, and profit control" },
        { tag: "Inventory", title: "Full product control" },
        { tag: "BI / Metrics", title: "Real-time strategic dashboards" }
      ],
      benefits: [
        "Faster decision-making",
        "Higher productivity",
        "Decisions backed by real data",
        "Lower costs and fewer errors"
      ],
      testimonials: [
        {
          quote: "The system gave us total clarity over the business",
          name: "Rogajo",
          role: "Leadership",
          avatar: "/avatars/cliente-1.svg",
          dash: "/modulos/producao.svg"
        },
        {
          quote: "Now I know exactly where we are making money",
          name: "Valor Agro",
          role: "Finance",
          avatar: "/avatars/cliente-2.svg",
          dash: "/modulos/vendas.svg"
        },
        {
          quote: "The team gained productivity and predictability",
          name: "Irineu Cassol",
          role: "Operations",
          avatar: "/avatars/cliente-3.svg",
          dash: "/modulos/producao-1.svg"
        }
      ],
      faq: [
        { q: "How much does it cost?", a: "It depends on the project. Everything is tailored." },
        { q: "How long does it take?", a: "Usually between 15 and 30 days." },
        { q: "Does it work with my system?", a: "Yes, we build the integration." }
      ],
      dashboardAlt: "Sample dashboard",
      sections: {
        problems: {
          tag: "Challenges",
          title: "Where operations get stuck",
          description:
            "Spreadsheets, rework, and lack of visibility slow the team down and make management unpredictable.",
          cards: [
            {
              title: "Disconnected reports",
              text: "Each team builds its own control layer and the numbers no longer match."
            },
            {
              title: "Outdated data",
              text: "Information arrives too late and decisions turn into guesswork."
            },
            {
              title: "Low productivity",
              text: "Too much copy and paste, not enough execution."
            }
          ]
        },
        solution: {
          tag: "Solution",
          title: "A complete solution for management and data intelligence",
          demo: "Request a demo",
          talkNow: "Talk now",
          details: "See details"
        },
        modules: {
          tag: "Modules",
          title: "Modules that structure the operation"
        },
        benefits: {
          tag: "Benefits",
          title: "Results you will notice in practice"
        },
        about: {
          tag: "About",
          title: "Specialists in smart solutions for businesses",
          description:
            "We build tailored systems that combine CRM and Business Intelligence, helping companies grow with organization and strategy.",
          imageAlt: "GR Dados specialists"
        },
        testimonials: {
          tag: "Testimonials",
          title: "What changes in practice",
          dashboardAlt: "Dashboard"
        },
        project: {
          tag: "Start a project",
          title: "Ready to transform your business?",
          description:
            "Let’s map your process and deliver a tailored system with BI for faster decisions.",
          demo: "Request a demo",
          talkNow: "Talk now"
        },
        pricing: {
          tag: "Pricing",
          title: "Frequently asked questions"
        },
        location: {
          tag: "Location",
          title: "Where we are",
          contact: "Contact:",
          mapTitle: "Map - GR Dados"
        }
      }
    }
  }
};

export type Messages = (typeof translations)[typeof DEFAULT_LOCALE];

export function getMessages(locale: AppLocale): Messages {
  return translations[locale];
}

export function resolveLocale(input?: string | null): AppLocale {
  return normalizeLocale(input) ?? DEFAULT_LOCALE;
}
