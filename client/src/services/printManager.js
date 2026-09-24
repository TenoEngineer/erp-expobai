import { printOrderDirect } from './api';

/**
 * Dispara a impressão de comanda do pedido automaticamente
 * sem travar o operador ou abrir modais obstrutivos.
 */
export async function executeOrderPrint(order, config) {
  if (!order) return { success: false, message: 'Nenhum pedido selecionado' };

  const autoPrintEnabled = config?.impressora_auto_imprimir !== 'false';
  const tipo = (config?.impressora_tipo || 'navegador').toLowerCase();

  // Se desativado explicitamente nas configurações
  if (!autoPrintEnabled || tipo === 'desativado') {
    return { success: true, message: 'Impressão desativada nas configurações' };
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
