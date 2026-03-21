# Go-Live Checklist - GRDados

## Infra

1. Render backend publicado e respondendo `GET /api/health/`.
2. Vercel frontend publicado e carregando landing/app.
3. Banco PostgreSQL conectado via `DATABASE_URL`.
4. Dominios ativos:
   - `grdados.com` (frontend)
   - `api.grdados.com` (backend)

## Variaveis (Backend)

1. `DEBUG=0`
2. `SECRET_KEY` forte
3. `ALLOWED_HOSTS=api.grdados.com,.onrender.com`
4. `CORS_ALLOWED_ORIGINS=https://grdados.com,https://www.grdados.com`
5. `CSRF_TRUSTED_ORIGINS=https://grdados.com,https://www.grdados.com`
6. `ASAAS_API_URL` correto para ambiente
7. `ASAAS_API_KEY` correto para ambiente
8. `ASAAS_WEBHOOK_TOKEN` forte e secreto

## Variaveis (Frontend)

1. `NEXT_PUBLIC_API_URL=https://api.grdados.com`

## Asaas

1. Webhook criado para `https://api.grdados.com/api/billing/webhooks/asaas/`
2. Header `asaas-access-token` igual ao `ASAAS_WEBHOOK_TOKEN`
3. Eventos de pagamento/assinatura selecionados
4. Teste de webhook validado no painel do Asaas

## Teste funcional final

1. Criar conta em `/register`
2. Login em `/login`
3. Criar lead em `/leads`
4. Criar tarefa em `/tasks`
5. Ativar assinatura no dashboard
6. Simular evento de pagamento no Asaas
7. Confirmar `license_status` atualizado e permissao do CRM funcionando
