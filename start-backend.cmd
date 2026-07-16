@echo off
setlocal

cd /d "%~dp0pilecap-backend-complete"

set "PY312=%LocalAppData%\Programs\Python\Python312\python.exe"

if exist "%PY312%" (
  echo Iniciando backend en http://localhost:8000
  "%PY312%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
  exit /b %ERRORLEVEL%
)

if exist "venv\Scripts\uvicorn.exe" (
  echo Iniciando backend en http://localhost:8000
  call .\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
  exit /b %ERRORLEVEL%
)

echo No se encontro Python 3.12 ni venv\Scripts\uvicorn.exe
echo Revisa el entorno virtual del backend.
exit /b 1
