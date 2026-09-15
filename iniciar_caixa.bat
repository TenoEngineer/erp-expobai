@echo off
title ERP Expobai 2026 - Frente de Caixa
cd /d "%~dp0"
echo ======================================================
echo    🤠 Iniciando ERP Expobai 2026 - Frente de Caixa
echo    Conectado ao Supabase (PostgreSQL - Schema expobai)
echo ======================================================
echo Abrindo servidor e interface...
echo.
npm run dev
pause
