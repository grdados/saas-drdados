# Execucao dos 3 Passos (Render + Vercel + Asaas)

Este arquivo e um roteiro rapido para colocar o GRDados no ar.

## Passo 1 - Render (Backend + Postgres)

1. Acesse o Render e clique em `New +` > `Blueprint`.
2. Selecione o repositorio `grdados/saas-drdados`.
3. Confirme a criacao dos recursos do `render.yaml`:
   - `grdados-backend`
   - `grdados-postgres`
4. No servico `grdados-backend`, ajuste env vars:
   - `DEBUG=0`
   - `FORCE_SSL_REDIRECT=1`
   - `ALLOWED_HOSTS=api.grdados.com,.onrender.com`
   - `CORS_ALLOWED_ORIGINS=https://grdados.com,https://www.grdados.com`
   - `CSRF_TRUSTED_ORIGINS=https://grdados.com,https://www.grdados.com`
   - `ASAAS_API_URL=https://api-sandbox.asaas.com/v3`
   - `ASAAS_API_KEY=<SUA_CHAVE_ASAAS_SANDBOX>`
   - `ASAAS_WEBHOOK_TOKEN=<TOKEN_FORTE>`
5. Faça `Manual Deploy` > `Deploy latest commit`.
6. Valide healthcheck:
   - `https://SEU_BACKEND.onrender.com/api/health/`

## Passo 2 - Vercel (Frontend)

1. Acesse a Vercel e clique em `Add New...` > `Project`.
2. Importe `grdados/saas-drdados`.
3. Configure:
   - `Framework Preset`: Next.js
   - `Root Directory`: `apps/frontend`
4. Variavel de ambiente:
   - `NEXT_PUBLIC_API_URL=https://api.grdados.com`
5. Clique em `Deploy`.
6. Depois do deploy, conecte dominio:
   - `grdados.com`
   - `www.grdados.com`

## Passo 3 - Asaas Webhook (Licenca)

1. No Asaas (Sandbox), va em `Integracoes` > `Webhooks`.
2. Crie webhook para:
   - `https://api.grdados.com/api/billing/webhooks/asaas/`
3. Defina no Asaas o header/token igual ao valor de `ASAAS_WEBHOOK_TOKEN`.
4. Marque eventos de cobranca/assinatura:
   - `PAYMENT_RECEIVED`
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_OVERDUE`
   - `PAYMENT_DELETED`
   - `PAYMENT_REFUNDED`
   - `SUBSCRIPTION_DELETED`
   - `SUBSCRIPTION_INACTIVATED`
5. Salve e execute teste de entrega de webhook.

## Validacao Final (Smoke Test)

1. Abra `https://grdados.com/register` e crie conta.
2. Entre em `https://grdados.com/login`.
3. Crie um lead em `/leads`.
4. Crie uma tarefa em `/tasks`.
5. No dashboard, clique em `Ativar licenca`.
6. Simule evento no Asaas e confirme atualizacao da licenca.
