import React, { useEffect, useState } from 'react';
import { CheckCircle, Printer, ArrowRight, X, AlertCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { printOrderDirect } from '../services/api';
import { getTicketBuffer, printDirectWebUsb, printViaRawBT } from '../services/tabletPrinter';

export default function ReceiptModal({
  isOpen,
  onClose,
  order,
  config
}) {
  const [printStatus, setPrintStatus] = useState('idle'); // 'idle', 'printed', 'printing_browser', 'printing_usb', 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [isReimprimindo, setIsReimprimindo] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      // 1. Efeito visual comemorativo
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore
      }

      // 2. Avaliar status de impressão automática retornado pelo backend
      const autoPrintEnabled = config?.impressora_auto_imprimir !== 'false';
      const tipo = (config?.impressora_tipo || 'usb').toLowerCase();

      // Caso A: Tablet com cabo USB direto (WebUSB)
      if (tipo === 'tablet_usb' && autoPrintEnabled) {
        setPrintStatus('printing_usb');
        setStatusMessage('Enviando via cabo USB do Tablet...');
        getTicketBuffer(order)
          .then((base64) => printDirectWebUsb(base64))
          .then(() => {
            setPrintStatus('printed');
            setStatusMessage('Tickets impressos via cabo USB no Tablet!');
          })
          .catch((err) => {
            setPrintStatus('error');
            setStatusMessage(`Erro USB: ${err.message}. Você pode reimprimir.`);
          });
        return;
      }

      // Caso B: Tablet Android com app RawBT
      if (tipo === 'rawbt' && autoPrintEnabled) {
        setPrintStatus('printing_usb');
        setStatusMessage('Enviando para o RawBT no Tablet...');
        getTicketBuffer(order)
          .then((base64) => printViaRawBT(base64))
          .then(() => {
            setPrintStatus('printed');
            setStatusMessage('Enviado para o RawBT no Tablet!');
          })
          .catch((err) => {
            setPrintStatus('error');
            setStatusMessage(`Erro RawBT: ${err.message}`);
          });
        return;
      }

      if (order.impressao) {
        if (order.impressao.success && (order.impressao.mode === 'usb' || order.impressao.mode === 'rede')) {
          setPrintStatus('printed');
          setStatusMessage(order.impressao.message || 'Tickets impressos automaticamente na impressora térmica!');
          return;
        } else if (order.impressao.error) {
          setPrintStatus('error');
          setStatusMessage(`Falha na impressora (${order.impressao.error}). Você pode reimprimir.`);
          return;
        }
      }

      // Se configurado para navegador ou se não foi impresso fisicamente e o auto-print estiver ligado
      if (autoPrintEnabled && (tipo === 'navegador' || (!order.impressao?.success && tipo !== 'desativado'))) {
        setPrintStatus('printing_browser');
        setStatusMessage('Enviando para a impressora do navegador...');
        const timer = setTimeout(() => {
          window.print();
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, order, config]);

  if (!isOpen || !order) return null;

  const formatPrice = (value) => {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const numeroFormatado = String(order.numero_pedido).padStart(3, '0');
  const nomeEstande = config?.nome_estande || 'Tenda dos Müller';
  const dataHora = order.data_hora
    ? new Date(order.data_hora).toLocaleString('pt-BR')
    : new Date().toLocaleString('pt-BR');

  // Ação de reimprimir sob demanda
  const handleReimprimir = async () => {
    setIsReimprimindo(true);
    try {
      const tipo = (config?.impressora_tipo || 'usb').toLowerCase();
      if (tipo === 'tablet_usb') {
        const base64 = await getTicketBuffer(order);
        await printDirectWebUsb(base64);
        setPrintStatus('printed');
        setStatusMessage('Tickets reimpressos com sucesso via cabo USB no Tablet!');
      } else if (tipo === 'rawbt') {
        const base64 = await getTicketBuffer(order);
        printViaRawBT(base64);
        setPrintStatus('printed');
        setStatusMessage('Reenviado para o RawBT no Tablet!');
      } else if (tipo === 'rede' || tipo === 'usb') {
        const res = await printOrderDirect(order);
        setPrintStatus('printed');
        setStatusMessage('Tickets reimpressos com sucesso na impressora térmica!');
      } else {
        window.print();
      }
    } catch (err) {
      console.warn('Reimpressão direta falhou, acionando impressão pelo navegador...', err);
      window.print();
    } finally {
      setIsReimprimindo(false);
    }
  };

  return (
    <>
      {/* Modal na Tela */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Header Sucesso */}
          <div className="p-6 bg-gradient-to-b from-emerald-950/80 to-slate-900 border-b border-slate-800 flex flex-col items-center text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-950">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">
              Venda Concluída com Sucesso!
            </h3>

            {/* Número do Pedido Grande */}
            <div className="mt-3 bg-slate-950 border border-amber-500/40 px-6 py-2.5 rounded-2xl shadow-inner">
              <span className="text-xs text-slate-400 uppercase tracking-widest block font-bold">
                Número da Comanda / Senha
              </span>
              <span className="font-black text-5xl sm:text-6xl text-amber-400 font-mono tracking-tight">
                #{numeroFormatado}
              </span>
            </div>

            {/* Status da Impressão Térmica Automática */}
            <div className="mt-3 w-full">
              {printStatus === 'printed' && (
                <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 animate-in fade-in">
                  <Printer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-medium">{statusMessage}</span>
                </div>
              )}

              {printStatus === 'printing_browser' && (
                <div className="bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                  <span className="font-medium">Imprimindo pelo navegador automaticamente...</span>
                </div>
              )}

              {printStatus === 'error' && (
                <div className="bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="font-medium">{statusMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Resumo dos Itens & Vias Impressas */}
          <div className="p-5 overflow-y-auto space-y-3 flex-1">
            <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span>🎟️ <b>Via 1:</b> Ficha Cliente (Senha)</span>
              <span>👨‍🍳 <b>Via 2:</b> Cozinha (Itens)</span>
            </div>

            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 flex justify-between">
                <span>Item Pedido</span>
                <span>Subtotal</span>
              </div>
              
              <div className="space-y-1.5">
                {(order.itens || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-200 font-medium">
                      <b className="text-amber-400 font-mono">{item.quantidade}x</b> {item.nome_produto}
                    </span>
                    <span className="text-slate-300 font-mono">
                      {formatPrice(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-300">Total Pago ({order.forma_pagamento?.toUpperCase()}):</span>
                <span className="text-emerald-400 font-mono font-black text-base">
                  {formatPrice(order.total)}
                </span>
              </div>

              {order.troco > 0 && (
                <div className="flex justify-between items-center text-xs text-amber-300 font-mono">
                  <span>Troco Devolvido:</span>
                  <span>{formatPrice(order.troco)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col gap-2">
            <button
              onClick={handleReimprimir}
              disabled={isReimprimindo}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition-colors disabled:opacity-50"
            >
              {isReimprimindo ? (
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Printer className="w-4 h-4 text-amber-400" />
              )}
              <span>Reimprimir Comandas (2 Vias)</span>
            </button>

            <button
              onClick={onClose}
              autoFocus
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all active:scale-[0.98]"
            >
              <span>NOVO PEDIDO (ENTER)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Impressão Térmica (CSS @media print) */}
      <div id="thermal-receipt" className="hidden print:block text-black">
        
        {/* ============================================== */}
        {/* TICKET 1: SOMENTE O NÚMERO / FICHA DO CLIENTE */}
        {/* ============================================== */}
        <div className="ticket-wrapper" style={{ textAlign: 'center', paddingBottom: '12px', paddingTop: '6px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>
            {nomeEstande}
          </h2>
          
          {/* NÚMERO GIGANTE DA SENHA */}
          <div style={{ 
            fontSize: '56px', 
            fontWeight: '900', 
            margin: '14px 0', 
            letterSpacing: '2px', 
            border: '3px solid #000', 
            padding: '8px 0',
            fontFamily: 'monospace'
          }}>
            #{numeroFormatado}
          </div>
        </div>

        {/* Quebra de Página / Corte entre Ticket 1 e Ticket 2 */}
        <div className="page-break-ticket"></div>

        {/* ======================================================== */}
        {/* TICKET 2: COMANDA DA COZINHA / PRODUÇÃO (NÚMERO + ITENS) */}
        {/* ======================================================== */}
        <div className="ticket-wrapper" style={{ paddingTop: '8px' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0' }}>
              *** VIA DA COZINHA ***
            </h3>
            <p style={{ fontSize: '11px', margin: '2px 0', fontWeight: 'bold' }}>
              CONTROLE DE PRODUÇÃO E PREPARO
            </p>
            <div style={{ fontSize: '26px', fontWeight: '900', margin: '6px 0', fontFamily: 'monospace' }}>
              PEDIDO #{numeroFormatado}
            </div>
            <p style={{ fontSize: '10px' }}>{dataHora}</p>
          </div>

          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>
              ITENS A PREPARAR:
            </div>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <tbody>
                {(order.itens || []).map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px dotted #ccc' }}>
                    <td style={{ fontWeight: '900', fontSize: '15px', width: '40px', verticalAlign: 'top', padding: '4px 0' }}>
                      {item.quantidade}x
                    </td>
                    <td style={{ fontWeight: 'bold', padding: '4px 0' }}>
                      {item.nome_produto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: '11px', textAlign: 'right', borderTop: '1px dashed #000', paddingTop: '6px' }}>
            TOTAL: {formatPrice(order.total)} ({order.forma_pagamento?.toUpperCase()})
          </div>

          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '12px', fontWeight: 'bold' }}>
            *** EXPEDIÇÃO E COZINHA ***
          </div>
        </div>

      </div>
    </>
  );
}
