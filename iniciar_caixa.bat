@echo off
title ERP Expobai 2026 - Frente de Caixa
cd /d "%~dp0"
echo ======================================================
echo    🤠 Iniciando ERP Expobai 2026 - Frente de Caixa
echo    Conectado ao Supabase (PostgreSQL - Schema expobai)
echo ======================================================
echo Abrindo servidor e frente de caixa...
echo Acesse no Google Chrome: http://localhost:5173
echo.
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"
npm run dev
pause
