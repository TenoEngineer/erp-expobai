import { getTicketBuffer, printDirectWebUsb, printViaRawBT } from './tabletPrinter';
import { printOrderDirect } from './api';

/**
 * Dispara a impressão de comanda do pedido automaticamente
 * sem travar o operador ou abrir modais obstrutivos.
 */
export async function executeOrderPrint(order, config) {
  if (!order) return { success: false, message: 'Nenhum pedido selecionado' };

  const autoPrintEnabled = config?.impressora_auto_imprimir !== 'false';
  const tipo = (config?.impressora_tipo || 'usb').toLowerCase();

  // Se desativado explicitamente nas configurações
  if (!autoPrintEnabled || tipo === 'desativado') {
    return { success: true, message: 'Impressão desativada nas configurações' };
  }

  // 1. Caso: Tablet Android com cabo USB (WebUSB)
  if (tipo === 'tablet_usb') {
    try {
      const base64 = await getTicketBuffer(order);
      await printDirectWebUsb(base64);
      return { success: true, message: 'Comandas impressas via cabo USB no Tablet!' };
    } catch (err) {
      console.warn('Falha WebUSB, acionando impressão do navegador como fallback:', err);
      triggerBrowserPrint();
      return { success: false, message: `Erro USB (${err.message}). Impressão enviada ao navegador.` };
    }
  }

  // 2. Caso: Tablet Android com app RawBT
  if (tipo === 'rawbt') {
    try {
      const base64 = await getTicketBuffer(order);
      printViaRawBT(base64);
      return { success: true, message: 'Enviado para o RawBT no Tablet!' };
    } catch (err) {
      console.warn('Falha RawBT, acionando impressão do navegador como fallback:', err);
      triggerBrowserPrint();
      return { success: false, message: `Erro RawBT (${err.message}). Impressão enviada ao navegador.` };
    }
  }

  // 3. Caso: Impressora Térmica física (USB ou Rede) via Backend
  if (tipo === 'usb' || tipo === 'rede') {
    // Se o backend já tentou imprimir durante o POST /api/pedidos
    if (order.impressao) {
      if (order.impressao.success) {
        return { success: true, message: order.impressao.message || 'Comandas impressas na impressora térmica!' };
      } else {
        console.warn('Impressão direta via servidor falhou, acionando impressão do navegador:', order.impressao.error);
        triggerBrowserPrint();
        return { success: false, message: `Falha na impressora física (${order.impressao.error}). Enviado ao navegador.` };
      }
    } else {
      // Tenta acionar a rota de impressão direta avulsa
      try {
        await printOrderDirect(order);
        return { success: true, message: 'Comandas impressas na impressora térmica!' };
      } catch (err) {
        console.warn('Erro na impressão direta, usando navegador:', err);
        triggerBrowserPrint();
        return { success: false, message: 'Enviado ao navegador para impressão.' };
      }
    }
  }

  // 4. Caso padrão / navegador
  triggerBrowserPrint();
  return { success: true, message: 'Comanda enviada para impressão!' };
}

/**
 * Aciona window.print() de forma assíncrona para garantir renderização do DOM
 */
function triggerBrowserPrint() {
  setTimeout(() => {
    try {
      window.print();
    } catch (e) {
      console.error('Erro ao acionar window.print():', e);
    }
  }, 100);
}
