@echo off
setlocal

cd /d "%~dp0"

start "PileCap Backend" cmd /k "%~dp0start-backend.cmd"
start "PileCap Frontend" cmd /k "%~dp0start-frontend.cmd"

echo Frontend esperado: http://localhost:5173
echo Backend esperado:  http://localhost:8000
