# GRDados SaaS CRM (MVP)

Base do projeto GRDados com arquitetura monorepo:

- `apps/backend`: API em Python com Django + DRF
- `apps/frontend`: Web app em Next.js + Tailwind CSS
- `docker-compose.yml`: orquestra banco, backend e frontend

## Stack

- Python 3.13
- Django 5 + Django REST Framework
- PostgreSQL 16
- Next.js 15 (React 19)
- Tailwind CSS 3
- Docker / Docker Compose

## Estrutura

```txt
.
├─ apps/
│  ├─ backend/
│  └─ frontend/
├─ docs/
│  ├─ ROADMAP.md
│  └─ SETUP_GITHUB.md
├─ docker-compose.yml
└─ .env.example
```

## Subir ambiente local (Docker)

1. Copie `.env.example` para `.env`
2. Execute:

```bash
docker compose up --build
```

Serviços:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/health/`
- PostgreSQL: `localhost:5432`

## Endpoints principais (MVP)

- `POST /api/accounts/register/`: cadastro de usuário + empresa
- `POST /api/auth/login/`: login JWT
- `GET /api/accounts/me/`: dados do usuário logado
- `GET/POST /api/crm/leads/`: listar e criar leads
- `GET/POST /api/crm/tasks/`: listar e criar tarefas
- `POST /api/billing/subscriptions/create/`: criar assinatura no Asaas
- `GET /api/billing/subscriptions/me/`: consultar assinatura atual
- `POST /api/billing/webhooks/asaas/`: receber eventos de cobrança/licença

## Rotas do frontend

- `/`: landing page
- `/register`: cadastro
- `/login`: login
- `/dashboard`: painel do CRM
- `/leads`: gestão de leads
- `/tasks`: gestão de tarefas

## Próximo passo

1. Ligar credenciais reais do Asaas no `.env`
2. Subir Docker e executar migrações
3. Testar webhook com túnel (`ngrok` ou Cloudflare Tunnel)
4. Integrar fluxo de checkout na landing/app

## Deploy

Guia completo de deploy:

- `docs/DEPLOY_PRODUCAO.md`
