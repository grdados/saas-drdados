# Validacao Pos-Deploy (5-10 minutos)

## 1) Smoke test completo (frontend + backend + CRM)

No PowerShell:

```powershell
cd "C:\PowerBI\Saas - Template"
.\scripts\smoke_test.ps1 -BackendUrl "https://api.grdados.com" -FrontendUrl "https://grdados.com"
```

Resultado esperado:

1. Frontend responde `200`.
2. Healthcheck retorna `status=ok`.
3. Registro e login funcionam.
4. Criacao de lead e tarefa funciona.
5. Endpoint `/api/accounts/me/` retorna empresa.

## 2) Teste tecnico do webhook Asaas

Use os IDs reais do Asaas apos criar assinatura.

```powershell
.\scripts\test_asaas_webhook.ps1 `
  -BackendUrl "https://api.grdados.com" `
  -WebhookToken "<ASAAS_WEBHOOK_TOKEN>" `
  -AsaasCustomerId "<cus_...>" `
  -AsaasSubscriptionId "<sub_...>"
```

Resultado esperado:

1. Endpoint responde com `received=true`.
2. Status de licenca da empresa atualizado para `active` apos evento `PAYMENT_RECEIVED`.

## 3) Verificacao de bloqueio por licenca

1. Simule no Asaas um evento de atraso (`PAYMENT_OVERDUE`).
2. Tente criar lead/tarefa com usuario da empresa.
3. A API deve bloquear com mensagem de licenca inativa.

## 4) Virada para Producao Asaas

Depois de validar em sandbox:

1. Troque `ASAAS_API_URL` para `https://api.asaas.com/v3`.
2. Troque `ASAAS_API_KEY` para chave de producao.
3. Reconfigure webhook do ambiente producao Asaas.
