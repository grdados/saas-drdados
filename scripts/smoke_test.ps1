param(
  [Parameter(Mandatory = $true)]
  [string]$BackendUrl,
  [Parameter(Mandatory = $true)]
  [string]$FrontendUrl
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host "==> $message" -ForegroundColor Cyan
}

$backend = $BackendUrl.TrimEnd("/")
$frontend = $FrontendUrl.TrimEnd("/")
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "smoke+$stamp@grdados.com"
$password = "SenhaForte123!"
$company = "GRDados Smoke $stamp"

Write-Step "Validando frontend"
$frontRes = Invoke-WebRequest -Uri $frontend -Method GET
if ($frontRes.StatusCode -ne 200) {
  throw "Frontend nao respondeu 200."
}

Write-Step "Validando healthcheck backend"
$health = Invoke-RestMethod -Uri "$backend/api/health/" -Method GET
if ($health.status -ne "ok") {
  throw "Healthcheck invalido."
}

Write-Step "Criando usuario de smoke"
$registerBody = @{
  name = "Smoke User"
  email = $email
  password = $password
  company_name = $company
} | ConvertTo-Json

$registerRes = Invoke-RestMethod -Uri "$backend/api/accounts/register/" -Method POST -ContentType "application/json" -Body $registerBody
if (-not $registerRes.detail) {
  throw "Falha ao registrar usuario."
}

Write-Step "Fazendo login JWT"
$loginBody = @{
  username = $email
  password = $password
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$backend/api/auth/login/" -Method POST -ContentType "application/json" -Body $loginBody
if (-not $loginRes.access) {
  throw "Falha no login."
}

$headers = @{
  Authorization = "Bearer $($loginRes.access)"
}

Write-Step "Criando lead"
$leadBody = @{
  name = "Lead Smoke"
  email = "lead+$stamp@grdados.com"
  phone = "65999999999"
} | ConvertTo-Json

$leadRes = Invoke-RestMethod -Uri "$backend/api/crm/leads/" -Method POST -Headers $headers -ContentType "application/json" -Body $leadBody
if (-not $leadRes.id) {
  throw "Falha ao criar lead."
}

Write-Step "Criando tarefa"
$taskBody = @{
  title = "Tarefa Smoke"
  description = "Teste automatizado pos-deploy"
} | ConvertTo-Json

$taskRes = Invoke-RestMethod -Uri "$backend/api/crm/tasks/" -Method POST -Headers $headers -ContentType "application/json" -Body $taskBody
if (-not $taskRes.id) {
  throw "Falha ao criar tarefa."
}

Write-Step "Consultando usuario atual"
$meRes = Invoke-RestMethod -Uri "$backend/api/accounts/me/" -Method GET -Headers $headers
if (-not $meRes.company) {
  throw "Resposta /me sem company."
}

Write-Host ""
Write-Host "Smoke test finalizado com sucesso." -ForegroundColor Green
Write-Host "Email de teste: $email"
Write-Host "Company: $company"
