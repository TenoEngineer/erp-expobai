const net = require('net');
const fs = require('fs');
const path = require('path');
const { execFile, exec } = require('child_process');
const os = require('os');
const {
  buildTicketCliente,
  buildTicketProducao,
  buildAmbosTickets,
  buildTicketTeste
} = require('./escposGenerator');

const IS_WINDOWS = os.platform() === 'win32';
const TEMP_DIR = path.join(__dirname, '../temp');

if (!fs.existsSync(TEMP_DIR)) {
  try {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

/**
 * Lista impressoras instaladas no Windows através do .NET
 */
async function getWindowsPrinters() {
  if (!IS_WINDOWS) {
    return [];
  }

  return new Promise((resolve) => {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Drawing; [System.Drawing.Printing.PrinterSettings]::InstalledPrinters | ConvertTo-Json"`;
    exec(cmd, { timeout: 6000 }, (error, stdout, stderr) => {
      if (error || !stdout) {
        return resolve([]);
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        if (Array.isArray(parsed)) {
          resolve(parsed);
        } else if (typeof parsed === 'string') {
          resolve([parsed]);
        } else {
          resolve([]);
        }
      } catch (e) {
        // Fallback: se não vier como JSON válido, divide por quebra de linha
        const lines = stdout
          .split(/\r?\n/)
          .map((l) => l.trim().replace(/^"|"$/g, ''))
          .filter((l) => l && l !== '[' && l !== ']');
        resolve(lines);
      }
    });
  });
}

/**
 * Envia buffer ESC/POS para Impressora de Rede (TCP/IP socket port 9100)
 */
async function printNetwork(buffer, host, port = 9100, timeout = 4000) {
  return new Promise((resolve, reject) => {
    if (!host) {
      return reject(new Error('Endereço IP da impressora de rede não foi informado.'));
    }

    const socket = new net.Socket();
    let isFinished = false;

    socket.setTimeout(timeout);

    socket.connect(parseInt(port, 10) || 9100, host, () => {
      socket.write(buffer, () => {
        socket.end();
      });
    });

    socket.on('close', () => {
      if (!isFinished) {
        isFinished = true;
        resolve({ success: true, message: `Impresso via Rede em ${host}:${port}` });
      }
    });

    socket.on('timeout', () => {
      if (!isFinished) {
        isFinished = true;
        socket.destroy();
        reject(
          new Error(
            `Tempo esgotado ao tentar conectar à impressora no IP ${host}:${port}. Verifique se ela está ligada e no mesmo Wi-Fi/Rede.`
          )
        );
      }
    });

    socket.on('error', (err) => {
      if (!isFinished) {
        isFinished = true;
        socket.destroy();
        reject(
          new Error(
            `Falha de conexão com a impressora no IP ${host}:${port}: ${err.message}`
          )
        );
      }
    });
  });
}

/**
 * Envia buffer ESC/POS diretamente para o spooler do Windows (USB ou compartilhada)
 */
async function printWindowsSpooler(buffer, printerName) {
  if (!IS_WINDOWS) {
    throw new Error('A impressão via spooler USB direto é suportada nativamente no Windows.');
  }

  if (!printerName) {
    throw new Error('Nenhuma impressora Windows foi selecionada.');
  }

  const psScript = path.join(__dirname, 'printWindows.ps1');
  if (!fs.existsSync(psScript)) {
    throw new Error('Script de impressão printWindows.ps1 não encontrado.');
  }

  const tempFile = path.join(
    TEMP_DIR,
    `print_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.bin`
  );

  await fs.promises.writeFile(tempFile, buffer);

  return new Promise((resolve, reject) => {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${psScript}" -PrinterName "${printerName}" -FilePath "${tempFile}"`;
    exec(cmd, { timeout: 8000 }, (error, stdout, stderr) => {
      // Deleta arquivo temporário em background
      fs.unlink(tempFile, () => {});

      if (error) {
        return reject(
          new Error(
            `Erro ao imprimir na impressora "${printerName}": ${stderr || stdout || error.message}`
          )
        );
      }

      resolve({
        success: true,
        message: `Impresso com sucesso via USB no Windows (${printerName})`
      });
    });
  });
}

/**
 * Imprime pedido nos dois tickets ou conforme configuração
 */
async function printOrder(order, config = {}) {
  const tipo = (config.impressora_tipo || 'usb').toLowerCase(); // 'usb', 'rede', 'navegador', 'desativado'
  const autoImprimir = config.impressora_auto_imprimir !== 'false';
  const vias = config.impressora_vias || 'ambas'; // 'ambas', 'apenas_cliente', 'apenas_cozinha'
  const largura = config.impressora_largura || '80mm';
  const cortar = config.impressora_cortar_papel !== 'false';

  if (tipo === 'desativado') {
    return {
      success: true,
      mode: 'desativado',
      message: 'Impressão física desativada nas configurações.'
    };
  }

  if (tipo === 'navegador') {
    return {
      success: true,
      mode: 'navegador',
      message: 'Configurado para impressão automática via navegador / kiosk.'
    };
  }

  // Gera o buffer ESC/POS correspondente
  let buffer;
  if (vias === 'apenas_cliente') {
    buffer = buildTicketCliente(order, config, largura, cortar);
  } else if (vias === 'apenas_cozinha') {
    buffer = buildTicketProducao(order, config, largura, cortar);
  } else {
    // Padrão: AMBAS as vias (Ticket Cliente com número + Ticket Cozinha com número e itens)
    buffer = buildAmbosTickets(order, config, largura, cortar);
  }

  if (tipo === 'rede') {
    const host = config.impressora_ip;
    const port = config.impressora_porta || 9100;
    return await printNetwork(buffer, host, port);
  }

  if (tipo === 'usb') {
    const printerName = config.impressora_nome_usb;
    return await printWindowsSpooler(buffer, printerName);
  }

  throw new Error(`Tipo de impressora desconhecido: "${tipo}". Escolha USB, Rede ou Navegador.`);
}

/**
 * Realiza impressão de teste
 */
async function testPrinter(config = {}) {
  const tipo = (config.impressora_tipo || 'usb').toLowerCase();
  const largura = config.impressora_largura || '80mm';

  if (tipo === 'desativado') {
    throw new Error('A impressora está definida como "Desativado". Selecione Rede ou USB para testar.');
  }

  if (tipo === 'navegador') {
    return {
      success: true,
      mode: 'navegador',
      message: 'Modo navegador ativo. O teste de impressão sairá pela janela do navegador.'
    };
  }

  const buffer = buildTicketTeste(config, largura);

  if (tipo === 'rede') {
    const host = config.impressora_ip;
    const port = config.impressora_porta || 9100;
    return await printNetwork(buffer, host, port);
  }

  if (tipo === 'usb') {
    const printerName = config.impressora_nome_usb;
    return await printWindowsSpooler(buffer, printerName);
  }

  throw new Error(`Tipo de impressora inválido: ${tipo}`);
}

module.exports = {
  getWindowsPrinters,
  printNetwork,
  printWindowsSpooler,
  printOrder,
  testPrinter
};
