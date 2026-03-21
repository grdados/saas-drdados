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

## Próximo passo

1. Criar app Django `crm` com modelos (Lead, Company, Task)
2. Implementar autenticação JWT
3. Conectar telas do frontend à API
4. Integrar cobrança/licença com Asaas (webhooks)
