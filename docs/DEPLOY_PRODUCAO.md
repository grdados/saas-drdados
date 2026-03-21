# Deploy Produção - GRDados

Este guia configura:

1. Backend Django + PostgreSQL no Render
2. Frontend Next.js no Vercel
3. Webhook do Asaas para ativação/bloqueio de licença

## 1) Pré-requisitos

1. Repositório atualizado no GitHub.
2. Conta no Render e Vercel.
3. Conta Asaas com API Key de Sandbox (depois Produção).

## 2) Backend no Render

Arquivo já preparado no projeto: `render.yaml`.

### Passos

1. No Render, clique em **New + > Blueprint**.
2. Selecione o repositório `grdados/saas-drdados`.
3. O Render lerá o `render.yaml` e criará:
   - `grdados-backend` (web service)
   - `grdados-postgres` (PostgreSQL)
4. Após criar, abra o serviço backend e ajuste variáveis:
   - `ALLOWED_HOSTS`: inclua seu domínio da API (ex: `api.grdados.com,.onrender.com`)
   - `CORS_ALLOWED_ORIGINS`: domínio do frontend (ex: `https://grdados.com,https://www.grdados.com`)
   - `CSRF_TRUSTED_ORIGINS`: mesmo domínio do frontend
   - `ASAAS_API_KEY`: sua chave
   - `ASAAS_WEBHOOK_TOKEN`: token secreto para webhook
5. Salve e faça redeploy.

## 3) Frontend no Vercel

1. No Vercel, importe o mesmo repositório.
2. Configure:
   - Root Directory: `apps/frontend`
   - Framework: Next.js
3. Variável de ambiente obrigatória:
   - `NEXT_PUBLIC_API_URL=https://api.grdados.com`
   Use sem `/api` porque o app já concatena os paths internamente.
4. Deploy.

## 4) Domínios

Sugestão:

1. Frontend: `grdados.com` (Vercel)
2. API: `api.grdados.com` (Render)

Depois de configurar DNS, atualize novamente no Render:

1. `ALLOWED_HOSTS=api.grdados.com,.onrender.com`
2. `CORS_ALLOWED_ORIGINS=https://grdados.com,https://www.grdados.com`
3. `CSRF_TRUSTED_ORIGINS=https://grdados.com,https://www.grdados.com`

## 5) Configurar Asaas (Sandbox primeiro)

No `.env`/Render:

1. `ASAAS_API_URL=https://api-sandbox.asaas.com/v3`
2. `ASAAS_API_KEY=<token sandbox>`
3. `ASAAS_WEBHOOK_TOKEN=<token forte>`

No painel Asaas:

1. Criar webhook apontando para:
   - `https://api.grdados.com/api/billing/webhooks/asaas/`
2. Enviar o header de autenticação com o token configurado.
3. Marcar eventos de cobrança/assinatura (ex: recebimento e atraso) para refletir licença.

## 6) Virar para produção Asaas

Quando validar tudo em sandbox:

1. Trocar `ASAAS_API_URL` para `https://api.asaas.com/v3`
2. Trocar `ASAAS_API_KEY` por chave de produção
3. Criar webhook no ambiente produção do Asaas com a mesma URL

## 7) Checklist final

1. Registro em `/register` funciona
2. Login em `/login` funciona
3. Dashboard abre e cria lead/tarefa
4. Botão “Ativar licença” cria assinatura no Asaas
5. Evento de webhook atualiza `license_status` da empresa
6. Healthcheck responde em `GET /api/health/`
