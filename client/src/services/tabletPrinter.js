import api from './api';

let activeUsbDevice = null;
let activeOutEndpoint = null;

/**
 * Verifica se o navegador atual suporta WebUSB (Google Chrome no Android, Windows, Mac, Linux)
 */
export function isWebUsbSupported() {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

/**
 * Solicita ao usuário selecionar a impressora USB conectada no Tablet via cabo OTG
 */
export async function requestWebUsbPrinter() {
  if (!isWebUsbSupported()) {
    throw new Error('WebUSB não é suportado neste navegador. Use o Google Chrome no Tablet.');
  }

  // Abre janela do navegador para selecionar a impressora USB plugada no cabo
  const device = await navigator.usb.requestDevice({ filters: [] });
  await initUsbDevice(device);
  return device;
}

/**
 * Inicializa a conexão com o dispositivo USB
 */
async function initUsbDevice(device) {
  if (!device.opened) {
    await device.open();
  }

  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }

  // Localiza interface com endpoint de saída (OUT)
  let outEp = null;
  let targetInterface = null;

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const ep = alt.endpoints.find((e) => e.direction === 'out');
      if (ep) {
        outEp = ep;
        targetInterface = iface;
        break;
      }
    }
    if (outEp) break;
  }

  if (!outEp || !targetInterface) {
    throw new Error('Nenhum canal de impressão (OUT endpoint) foi detectado na impressora USB.');
  }

  try {
    await device.claimInterface(targetInterface.interfaceNumber);
  } catch (err) {
    // Interface pode já estar reivindicada
  }

  activeUsbDevice = device;
  activeOutEndpoint = outEp;
  return device;
}

/**
 * Obtém o buffer binário dos 2 tickets em Base64 a partir do backend
 */
export async function getTicketBuffer(order = null, isTest = false) {
  const { data } = await api.post('/impressao/buffer', {
    pedido: order,
    isTest
  });
  return data.base64;
}

/**
 * Converte string Base64 em Uint8Array
 */
function base64ToUint8Array(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Imprime diretamente no Tablet via Cabo USB (WebUSB)
 */
export async function printDirectWebUsb(base64Data) {
  if (!activeUsbDevice) {
    // Tenta reconectar a um dispositivo pareado anteriormente
    if (isWebUsbSupported()) {
      const devices = await navigator.usb.getDevices();
      if (devices.length > 0) {
        await initUsbDevice(devices[0]);
      }
    }
  }

  if (!activeUsbDevice || !activeOutEndpoint) {
    throw new Error('Impressora USB não conectada. Conecte pelo botão "Conectar Impressora USB" nas configurações.');
  }

  const bytes = base64ToUint8Array(base64Data);

  // Divide o envio em blocos de até 1024 bytes para máxima estabilidade
  const CHUNK_SIZE = 1024;
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.slice(offset, offset + CHUNK_SIZE);
    await activeUsbDevice.transferOut(activeOutEndpoint.endpointNumber, chunk);
  }

  return { success: true, message: 'Tickets impressos com sucesso via cabo USB no Tablet!' };
}

/**
 * Imprime no Tablet Android via App RawBT (Padrão em PDVs Android)
 */
export function printViaRawBT(base64Data) {
  // Dispara intent nativo do RawBT
  const url = `rawbt:data:application/octet-stream;base64,${base64Data}`;
  window.location.href = url;
  return { success: true, message: 'Enviado para o RawBT no Tablet!' };
}
