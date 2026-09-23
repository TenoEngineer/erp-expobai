const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const {
  buildTicketCliente,
  buildTicketProducao,
  buildAmbosTickets,
  buildTicketTeste
} = require('./escposGenerator');

const IS_WINDOWS = os.platform() === 'win32';
const IS_LINUX = os.platform() === 'linux';
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
  if (!IS_WINDOWS) return [];

  return new Promise((resolve) => {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Drawing; [System.Drawing.Printing.PrinterSettings]::InstalledPrinters | ConvertTo-Json"`;
    exec(cmd, { timeout: 6000 }, (error, stdout) => {
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
 * Lista portas de impressora USB (/dev/usb/lp*) e impressoras CUPS no Linux
 */
async function getLinuxPrinters() {
  const printers = [];

  // 1. Procurar nós de dispositivos USB diretos (/dev/usb/lp0, lp1, ttyUSB0, etc.)
  const possibleDevs = [
    '/dev/usb/lp0',
    '/dev/usb/lp1',
    '/dev/usb/lp2',
    '/dev/ttyUSB0',
    '/dev/ttyUSB1'
  ];

  for (const dev of possibleDevs) {
    if (fs.existsSync(dev)) {
      printers.push(dev);
    }
  }

  // Se nenhum nó foi detectado no momento (ex: impressora desligada), inclui /dev/usb/lp0 como sugestão padrão
  if (printers.length === 0) {
    printers.push('/dev/usb/lp0');
  }

  // 2. Procurar impressoras cadastradas no CUPS (se houver)
  try {
    const cupsPrinters = await new Promise((resolve) => {
      exec('lpstat -e', { timeout: 3000 }, (err, stdout) => {
        if (!err && stdout) {
          const list = stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
          return resolve(list);
        }
        // Fallback: lpstat -p
        exec('lpstat -p', { timeout: 3000 }, (err2, stdout2) => {
          if (!err2 && stdout2) {
            const matches = stdout2.match(/printer\s+([^\s]+)/g);
            if (matches) {
              const list = matches.map((m) => m.replace(/printer\s+/, '').trim());
              return resolve(list);
            }
          }
          resolve([]);
        });
      });
    });

    cupsPrinters.forEach((p) => {
      if (!printers.includes(p)) printers.push(p);
    });
  } catch (e) {
    // CUPS pode não estar rodando, ignora silenciosamente
  }

  return printers;
}

/**
 * Lista impressoras disponíveis dependendo do Sistema Operacional (Windows ou Linux)
 */
async function getAvailablePrinters() {
  if (IS_WINDOWS) {
    return await getWindowsPrinters();
  }
  return await getLinuxPrinters();
}

/**
 * Envia buffer ESC/POS para Impressora de Rede (TCP/IP socket port 9100)
 * Funciona de forma 100% idêntica e nativa tanto no Linux quanto no Windows!
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
            `Tempo esgotado ao tentar conectar à impressora no IP ${host}:${port}. Verifique se a Bematech/Elgin está ligada e conectada na mesma rede/Wi-Fi.`
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
 * Envia buffer ESC/POS diretamente no Linux (Porta /dev/usb/lp* ou fila CUPS)
 */
async function printLinuxUsb(buffer, printerTarget) {
  const target = printerTarget || '/dev/usb/lp0';

  // Opção 1: Escrita direta no nó de dispositivo (/dev/usb/lp0, etc.)
  if (target.startsWith('/dev/')) {
    if (!fs.existsSync(target)) {
      throw new Error(
        `Dispositivo USB "${target}" não foi encontrado no Linux. Verifique se o cabo da Bematech/Elgin está conectado e ligado (verifique com: ls -l /dev/usb/lp*).`
      );
    }

    try {
      await fs.promises.writeFile(target, buffer);
      return {
        success: true,
        message: `Impresso com sucesso via USB em ${target}`
      };
    } catch (err) {
      if (err.code === 'EACCES') {
        throw new Error(
          `Permissão negada ao acessar ${target} no Linux. Execute no terminal:\n` +
          `sudo usermod -aG lp $USER\n` +
          `sudo chmod 666 ${target}`
        );
      }
      throw new Error(`Erro ao escrever no dispositivo ${target}: ${err.message}`);
    }
  }

  // Opção 2: Envio para fila do CUPS (ex: Elgin_i9, Bematech_MP4200) com modo RAW (-o raw)
  const tempFile = path.join(
    TEMP_DIR,
    `print_linux_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.bin`
  );

  await fs.promises.writeFile(tempFile, buffer);

  return new Promise((resolve, reject) => {
    const cmd = `lp -d "${target}" -o raw "${tempFile}"`;
    exec(cmd, { timeout: 6000 }, (error, stdout, stderr) => {
      fs.unlink(tempFile, () => {});

      if (error) {
        return reject(
          new Error(
            `Erro ao enviar para fila CUPS "${target}": ${stderr || stdout || error.message}`
          )
        );
      }

      resolve({
        success: true,
        message: `Comando enviado para a impressora "${target}" via CUPS`
      });
    });
  });
}

/**
 * Envia buffer para impressora USB dependendo do Sistema Operacional
 */
async function printUsb(buffer, printerName) {
  if (IS_WINDOWS) {
    return await printWindowsSpooler(buffer, printerName);
  }
  // Linux ou outro Unix
  return await printLinuxUsb(buffer, printerName);
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
    return await printUsb(buffer, printerName);
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
    return await printUsb(buffer, printerName);
  }

  throw new Error(`Tipo de impressora inválido: ${tipo}`);
}

module.exports = {
  getAvailablePrinters,
  getWindowsPrinters,
  getLinuxPrinters,
  printNetwork,
  printWindowsSpooler,
  printLinuxUsb,
  printUsb,
  printOrder,
  testPrinter,
  platform: os.platform()
};
