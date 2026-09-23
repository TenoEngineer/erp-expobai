#!/usr/bin/env bash

# ======================================================
# 🤠 ERP Expobai 2026 - Frente de Caixa (Linux)
# ======================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "======================================================"
echo "   🤠 Iniciando ERP Expobai 2026 - Frente de Caixa"
echo "   Ambiente: Linux ($(uname -s) $(uname -m))"
echo "======================================================"

# 1. Verificar se Node.js e npm estão instalados
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js não foi encontrado!"
    echo "Instale o Node.js v18 ou superior: sudo apt update && sudo apt install -y nodejs npm"
    exit 1
fi

echo "✅ Node.js detectado: $(node -v)"
echo "✅ npm detectado: $(npm -v)"
echo ""

# 2. Verificar permissão de porta USB se impressora estiver conectada
if [ -e /dev/usb/lp0 ]; then
    if [ ! -w /dev/usb/lp0 ]; then
        echo "⚠️ AVISO: /dev/usb/lp0 detectado mas seu usuário não tem permissão de escrita."
        echo "Execute o script de permissão: ./configurar_impressora_linux.sh"
    else
        echo "✅ Impressora USB pronta em /dev/usb/lp0 com permissão de escrita!"
    fi
fi

# 3. Identificar IP na rede Wi-Fi para conexão do Tablet
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

# 4. Iniciar Backend e Frontend simultaneamente
echo ""
echo "🚀 Iniciando servidor backend e frente de caixa..."
echo "💻 Acesso no computador local: http://localhost:5173"
if [ -n "$LOCAL_IP" ]; then
    echo "📱 Acesso pelo TABLET / CELULAR no mesmo Wi-Fi: http://$LOCAL_IP:5173"
fi
echo "Pressione Ctrl+C para encerrar."
echo "======================================================"

# Tentar abrir navegador automaticamente em background
(
    sleep 3
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "http://localhost:5173" >/dev/null 2>&1 || true
    elif command -v google-chrome >/dev/null 2>&1; then
        google-chrome "http://localhost:5173" >/dev/null 2>&1 || true
    fi
) &

npm run dev
