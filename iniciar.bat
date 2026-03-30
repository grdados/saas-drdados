@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%apps\backend"
set "FRONTEND_DIR=%ROOT%apps\frontend"
set "SQLITE_DB=%BACKEND_DIR%\db.sqlite3"

set "PY_EXE=%ROOT%.venv-1\Scripts\python.exe"
if not exist "%PY_EXE%" set "PY_EXE=%ROOT%.venv\Scripts\python.exe"

if not exist "%PY_EXE%" (
  echo [ERRO] Python da venv nao encontrado em .venv-1 ou .venv.
  echo Crie/ajuste sua venv e tente novamente.
  pause
  exit /b 1
)

echo Iniciando backend...
start "GR Dados Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && set DATABASE_URL=sqlite:///%SQLITE_DB:\=/% && ""%PY_EXE%"" manage.py migrate && ""%PY_EXE%"" manage.py runserver"

echo Iniciando frontend...
start "GR Dados Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

echo.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
echo Use parar.bat para encerrar os servicos.
endlocal
