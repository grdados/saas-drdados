# Passo a passo do MVP CRM (GRDados)

## Backend (Django + DRF)

1. Criar app `accounts` para autenticação JWT.
2. Criar app `crm` com modelos:
   - `Company`
   - `Lead`
   - `Contact`
   - `Task`
3. Implementar serializers e viewsets.
4. Proteger endpoints por empresa (tenant).
5. Criar testes de API para CRUD e permissões.

## Frontend (Next.js + Tailwind)

1. Criar telas:
   - `/login`
   - `/dashboard`
   - `/leads`
   - `/tasks`
2. Criar cliente HTTP para API.
3. Implementar autenticação e guarda de rotas.
4. Integrar dashboard com dados reais.

## Landing Page

1. Hero com CTA forte
2. Blocos de benefício
3. Seção de planos
4. Formulário de aplicação comercial
5. Página de obrigado

## Integração Asaas

1. Criar cliente no Asaas ao cadastrar empresa.
2. Criar assinatura mensal.
3. Salvar `customer_id`, `subscription_id`.
4. Configurar webhook:
   - `PAYMENT_RECEIVED`
   - `PAYMENT_OVERDUE`
   - `PAYMENT_DELETED`
5. Atualizar status da licença no banco.
6. Bloquear acesso ao CRM quando status inválido.

## Deploy

1. Frontend: Vercel
2. Backend + DB: Railway/Render
3. Variáveis de ambiente em produção
4. Migrações automáticas no deploy
5. Domínio e SSL

## Rodar local agora (com Docker Desktop aberto)

```bash
copy .env.example .env
docker compose up -d --build
docker compose exec backend python manage.py migrate
```

Testes rápidos:

1. Acessar `http://localhost:3000` (landing)
2. Criar conta em `/register`
3. Entrar em `/login`
4. Criar lead e tarefa
5. Acionar botão "Ativar licença" no dashboard
