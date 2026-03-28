@echo off
setlocal

echo Encerrando processos nas portas 8000 e 3000...

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
  taskkill /PID %%p /F >nul 2>&1
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /PID %%p /F >nul 2>&1
)

echo Servicos encerrados (se estavam ativos).
endlocal
