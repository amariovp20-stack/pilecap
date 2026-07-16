@echo off
setlocal

cd /d "%~dp0pilecap-react-connected"

if not exist "package.json" (
  echo No se encontro pilecap-react-connected\package.json
  exit /b 1
)

echo Iniciando frontend en http://localhost:5173
call npm.cmd run dev -- --host 127.0.0.1 --port 5173
