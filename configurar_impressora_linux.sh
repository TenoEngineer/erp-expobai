#!/usr/bin/env bash

# =====================================================================
# 🖨️ Script de Configuração da Impressora Térmica Bematech / Elgin no Linux
# Dá permissão permanente de escrita para qualquer impressora USB térmica
# sem necessidade de rodar o sistema como root (sudo).
# =====================================================================

set -e

echo "=========================================================="
echo "   🖨️ Configurando Permissões USB para Bematech / Elgin"
echo "=========================================================="
echo ""

# 1. Adicionar usuário atual aos grupos lp e dialout
echo "1. Adicionando usuário '$USER' aos grupos de impressora (lp, dialout)..."
sudo usermod -aG lp,dialout "$USER" || true

# 2. Criar regra udev para conceder permissão 0666 para /dev/usb/lp*
echo "2. Criando regra udev permanente em /etc/udev/rules.d/99-impressora-termica.rules..."
sudo bash -c 'cat << "EOF" > /etc/udev/rules.d/99-impressora-termica.rules
# Permissão de escrita para impressoras USB térmicas (Bematech, Elgin, Epson, etc.)
SUBSYSTEM=="usbmisc", KERNEL=="lp*", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", KERNEL=="lp*", MODE="0666", GROUP="lp"
KERNEL=="lp[0-9]*", MODE="0666", GROUP="lp"
EOF'

# 3. Recarregar regras do udev
echo "3. Recarregando regras udev do Linux..."
sudo udevadm control --reload-rules || true
sudo udevadm trigger || true

echo ""
echo "4. Verificando dispositivos USB conectados:"
lsusb || true

echo ""
echo "5. Verificando nós de impressora USB em /dev/usb/:"
if ls -l /dev/usb/lp* 2>/dev/null; then
    echo "✅ Porta USB encontrada com sucesso!"
    # Ajuste imediato de permissão se o dispositivo já estiver plugado
    sudo chmod 666 /dev/usb/lp* 2>/dev/null || true
    echo "✅ Permissão 666 concedida em /dev/usb/lp*."
else
    echo "ℹ️ Nenhuma impressora USB detectada em /dev/usb/lp* no momento."
    echo "Conecte o cabo USB da Bematech/Elgin e ligue o botão de energia."
fi

echo ""
echo "=========================================================="
echo "🎉 Configuração concluída!"
echo "Caso tenha sido adicionado ao grupo 'lp' agora, faça logoff"
echo "ou reinicie o terminal para ativar os novos grupos."
echo "=========================================================="
