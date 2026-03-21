param(
  [Parameter(Mandatory = $true)]
  [string]$BackendUrl,
  [Parameter(Mandatory = $true)]
  [string]$WebhookToken,
  [Parameter(Mandatory = $true)]
  [string]$AsaasCustomerId,
  [string]$AsaasSubscriptionId = ""
)

$ErrorActionPreference = "Stop"

$backend = $BackendUrl.TrimEnd("/")

$payload = @{
  event = "PAYMENT_RECEIVED"
  payment = @{
    customer = $AsaasCustomerId
    subscription = $AsaasSubscriptionId
  }
} | ConvertTo-Json -Depth 5

$headers = @{
  "asaas-access-token" = $WebhookToken
}

$res = Invoke-RestMethod -Uri "$backend/api/billing/webhooks/asaas/" -Method POST -Headers $headers -ContentType "application/json" -Body $payload

if ($res.received -ne $true) {
  throw "Webhook nao confirmado."
}

Write-Host "Webhook de teste enviado com sucesso." -ForegroundColor Green
