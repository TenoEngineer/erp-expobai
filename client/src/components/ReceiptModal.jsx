import React, { useEffect, useState } from 'react';
import { CheckCircle, Printer, ArrowRight, X, AlertCircle, RefreshCw, Ticket, Tag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { printOrderDirect, printFichasDirect } from '../services/api';

/**
 * Extrai fichas individuais do pedido, inclusive desmembrando combos
 */
function extractFichasFromOrder(order) {
  if (!order) return [];
  const fichas = [];
  const itens = order.itens || order.itens_detalhes || [];

  itens.forEach((item, itemIdx) => {
    if (item.gera_ficha === false || item.gera_ficha === 0) return;

    const qtd = Math.max(1, parseInt(item.quantidade, 10) || 1);
    let comboInfo = item.combo_info;
    if (typeof comboInfo === 'string') {
      try { comboInfo = JSON.parse(comboInfo); } catch {}
    }

    if (comboInfo?.itens && Array.isArray(comboInfo.itens) && comboInfo.itens.length > 0) {
      for (let c = 0; c < qtd; c++) {
        comboInfo.itens.forEach((sub, subIdx) => {
          const subQtd = Math.max(1, parseInt(sub.quantidade, 10) || 1);
          for (let s = 0; s < subQtd; s++) {
            fichas.push({
              nome_produto: sub.nome || sub.nome_produto || 'Item',
              origem_combo: item.nome_produto || item.nome,
              codigo_item: `${itemIdx + 1}.${c + 1}.${subIdx + 1}.${s + 1}`
            });
          }
        });
      }
    } else {
      for (let q = 0; q < qtd; q++) {
        fichas.push({
          nome_produto: item.nome_produto || item.nome || 'Item',
          origem_combo: null,
          codigo_item: `${itemIdx + 1}.${q + 1}`
        });
      }
    }
  });

  return fichas;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  order,
  config
}) {
  const [printStatus, setPrintStatus] = useState('idle'); // 'idle', 'printed', 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [isImprimindo, setIsImprimindo] = useState(false);
  const isMobile = typeof window !== 'undefined' && (window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

  const fichas = extractFichasFromOrder(order);

  useEffect(() => {
    if (isOpen && order) {
      setPrintStatus('idle');
      setStatusMessage('');
      setIsImprimindo(false);

      // Efeito visual comemorativo
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore
      }
    }
  }, [isOpen, order]);

  // Ação manual: Imprimir tudo (Comprovante + Cozinha + Fichas)
  const handleImprimirTudo = async () => {
    setIsImprimindo(true);
    try {
      const tipo = (config?.impressora_tipo || 'navegador').toLowerCase();
      if (tipo === 'rede' || tipo === 'usb') {
        try {
          await printOrderDirect(order);
          setPrintStatus('printed');
          setStatusMessage('Comandas e fichas enviadas para a impressora física!');
          return;
        } catch (e) {
          console.warn('Impressão direta falhou, acionando navegador:', e);
        }
      }
      document.body.classList.remove('printing-fichas-only');
      document.body.classList.add('printing-receipt');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-receipt');
      }, 1500);
      setPrintStatus('printed');
      setStatusMessage('Comandas enviadas para impressão!');
    } catch (err) {
      document.body.classList.remove('printing-receipt');
      console.warn('Erro ao imprimir:', err);
      setPrintStatus('error');
      setStatusMessage(`Falha ao imprimir: ${err.message}`);
    } finally {
      setIsImprimindo(false);
    }
  };

  // Ação manual: Imprimir somente as fichas de retirada
  const handleImprimirFichas = async () => {
    if (fichas.length === 0) return;
    setIsImprimindo(true);
    try {
      const tipo = (config?.impressora_tipo || 'navegador').toLowerCase();
      if (tipo === 'rede' || tipo === 'usb') {
        try {
          await printFichasDirect(order);
          setPrintStatus('printed');
          setStatusMessage(`${fichas.length} Fichas de retirada enviadas para a impressora!`);
          return;
        } catch (e) {
          console.warn('Impressão direta de fichas falhou, abrindo navegador:', e);
        }
      }
      document.body.classList.add('printing-fichas-only');
      document.body.classList.add('printing-receipt');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-receipt');
        document.body.classList.remove('printing-fichas-only');
      }, 1500);
      setPrintStatus('printed');
      setStatusMessage(`${fichas.length} Fichas enviadas para impressão!`);
    } catch (err) {
      document.body.classList.remove('printing-receipt');
      document.body.classList.remove('printing-fichas-only');
      console.warn('Erro ao imprimir fichas:', err);
      setPrintStatus('error');
      setStatusMessage(`Falha ao imprimir fichas: ${err.message}`);
    } finally {
      setIsImprimindo(false);
    }
  };

  // Atalhos de teclado: Enter fecha / P imprime tudo / F imprime fichas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleImprimirTudo();
      } else if (e.key === 'f' || e.key === 'F') {
        if (fichas.length > 0) {
          e.preventDefault();
          handleImprimirFichas();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, order, fichas.length]);

  if (!isOpen || !order) return null;

  const formatPrice = (value) => {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const numeroFormatado = String(order.numero_pedido).padStart(3, '0');
  const nomeEstande = config?.nome_estande || config?.nome_sistema || 'ExpoERP';
  const dataHora = order.data_hora
    ? new Date(order.data_hora).toLocaleString('pt-BR')
    : new Date().toLocaleString('pt-BR');

  // Resumo agrupado das fichas para exibição
  const resumoFichas = fichas.reduce((acc, f) => {
    acc[f.nome_produto] = (acc[f.nome_produto] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <style>{`
        @media print {
          body.printing-fichas-only .ticket-comprovantes {
            display: none !important;
          }
          .ticket-wrapper {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      {/* Modal na Tela */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
          
          {/* Header Sucesso */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-emerald-950/80 to-slate-900 border-b border-slate-800 flex flex-col items-center text-center relative">
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 mb-2 shadow-lg shadow-emerald-950">
              <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-400">
              Venda Concluída com Sucesso!
            </h3>

            {/* Número do Pedido Grande */}
            <div className="mt-2 bg-slate-950 border-2 border-amber-500/60 px-6 py-2 sm:px-8 sm:py-2.5 rounded-2xl shadow-inner">
              <span className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest block font-bold">
                Número da Comanda / Senha
              </span>
              <span className="font-black text-6xl sm:text-7xl text-amber-400 font-mono tracking-tight block">
                #{numeroFormatado}
              </span>
            </div>

            {/* Status da Impressão */}
            <div className="mt-2 w-full">
              {isMobile ? (
                <div className="bg-slate-950/80 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm">📱 Venda via Celular • Ficha impressa no computador do caixa</span>
                </div>
              ) : printStatus === 'printed' ? (
                <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-xl flex items-center justify-center gap-1.5 animate-in fade-in">
                  <Printer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-medium text-[11px] sm:text-xs">{statusMessage}</span>
                </div>
              ) : printStatus === 'printing_browser' ? (
                <div className="bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs px-3 py-1 rounded-xl flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                  <span className="font-medium text-[11px] sm:text-xs">Imprimindo pelo navegador automaticamente...</span>
                </div>
              ) : printStatus === 'error' ? (
                <div className="bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs px-3 py-1 rounded-xl flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="font-medium text-[11px] sm:text-xs">{statusMessage}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Resumo dos Itens & Fichas Geradas */}
          <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1 max-h-48 sm:max-h-60">
            {/* Destaque das Fichas de Retirada se houver */}
            {fichas.length > 0 && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-2.5">
                <div className="flex items-center justify-between text-amber-300 text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-amber-400" />
                    <span>{fichas.length} {fichas.length === 1 ? 'Ficha de Retirada Gerada' : 'Fichas de Retirada Geradas'}</span>
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Corte Individual
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(resumoFichas).map(([nome, qtd], i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-slate-900 text-slate-200 text-[11px] px-2 py-0.5 rounded-lg border border-slate-700">
                      <b className="text-amber-400 font-mono">{qtd}x</b> {nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-950/60 rounded-xl p-2.5 sm:p-3 border border-slate-800 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 flex justify-between">
                <span>Item Pedido</span>
                <span>Subtotal</span>
              </div>
              
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {(order.itens || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-slate-200 font-medium truncate max-w-[200px]">
                      <b className="text-amber-400 font-mono">{item.quantidade}x</b> {item.nome_produto}
                    </span>
                    <span className="text-slate-300 font-mono shrink-0">
                      {formatPrice(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-xs sm:text-sm font-bold">
                <span className="text-slate-300">Total ({order.forma_pagamento?.toUpperCase()}):</span>
                <span className="text-emerald-400 font-mono font-black text-sm sm:text-base">
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

          {/* Ações: Próximo Pedido & Impressão */}
          <div 
            className="p-3.5 sm:p-4 bg-slate-950/98 border-t border-slate-800 flex flex-col gap-2.5 shrink-0"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {/* Botão Primário: Próximo Pedido */}
            <button
              onClick={onClose}
              autoFocus
              className="w-full h-15 sm:h-16 px-4 bg-gradient-to-r from-emerald-500 to-green-500 active:from-emerald-400 active:to-green-400 active:scale-[0.98] text-slate-950 rounded-2xl font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950 border-2 border-emerald-400/60 transition-all cursor-pointer"
            >
              <span>PRÓXIMO PEDIDO (ENTER)</span>
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 stroke-[3]" />
            </button>

            {/* Botões de Impressão (Desktop) */}
            {!isMobile && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleImprimirTudo}
                  disabled={isImprimindo}
                  className="w-full h-11 px-3 bg-slate-800 active:bg-slate-700 active:scale-[0.98] text-amber-300 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                  title="Imprime comprovante cliente, comanda cozinha e todas as fichas de retirada (Tecla P)"
                >
                  {isImprimindo ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  ) : (
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>Tudo (P)</span>
                </button>

                {fichas.length > 0 && (
                  <button
                    onClick={handleImprimirFichas}
                    disabled={isImprimindo}
                    className="w-full h-11 px-3 bg-amber-500/20 active:bg-amber-500/30 active:scale-[0.98] text-amber-300 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 border border-amber-500/40 transition-all cursor-pointer disabled:opacity-50"
                    title="Imprime apenas as fichas individuais de retirada (Tecla F)"
                  >
                    <Ticket className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fichas ({fichas.length}) (F)</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Impressão Térmica (CSS @media print) */}
      <div id="thermal-receipt" className="hidden print:block text-black">
        
        {/* COMPROVANTES GERAIS (SENHA + COZINHA) */}
        <div className="ticket-comprovantes">
          {/* ============================================== */}
          {/* TICKET 1: SOMENTE O NÚMERO / FICHA DO CLIENTE */}
          {/* ============================================== */}
          <div className="ticket-wrapper" style={{ textAlign: 'center', paddingBottom: '2px', paddingTop: '0px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', lineHeight: '1.2' }}>
              {nomeEstande}
            </h2>
            
            {/* NÚMERO GIGANTE DA SENHA */}
            <div style={{ 
              fontSize: '52px', 
              fontWeight: '900', 
              margin: '4px 0', 
              letterSpacing: '2px', 
              border: '2px solid #000', 
              padding: '4px 0',
              fontFamily: 'monospace',
              lineHeight: '1'
            }}>
              #{numeroFormatado}
            </div>
            <p style={{ fontSize: '10px', margin: '2px 0' }}>COMPROVANTE DO CLIENTE</p>
          </div>

          {/* Quebra de Página / Corte entre Ticket 1 e Ticket 2 */}
          <div className="page-break-ticket" style={{ pageBreakAfter: 'always', margin: '0', borderTop: '1px dashed #999' }}></div>

          {/* ======================================================== */}
          {/* TICKET 2: COMANDA DA COZINHA / PRODUÇÃO (NÚMERO + ITENS) */}
          {/* ======================================================== */}
          <div className="ticket-wrapper" style={{ paddingTop: '0px' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '3px', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', lineHeight: '1.2' }}>
                *** VIA DA COZINHA ***
              </h3>
              <p style={{ fontSize: '10px', margin: '1px 0', fontWeight: 'bold' }}>
                CONTROLE DE PRODUÇÃO E PREPARO
              </p>
              <div style={{ fontSize: '24px', fontWeight: '900', margin: '3px 0', fontFamily: 'monospace', lineHeight: '1' }}>
                PEDIDO #{numeroFormatado}
              </div>
              <p style={{ fontSize: '10px', margin: '0' }}>{dataHora}</p>
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
                        <div>{item.nome_produto}</div>
                        {(() => {
                          let info = item.combo_info;
                          if (typeof info === 'string') {
                            try { info = JSON.parse(info); } catch {}
                          }
                          if (info?.itens && Array.isArray(info.itens) && info.itens.length > 0) {
                            return (
                              <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#444', marginTop: '2px' }}>
                                Inclui: {info.itens.map(it => `${it.quantidade}x ${it.nome}`).join(' + ')}
                              </div>
                            );
                          }
                          return null;
                        })()}
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

        {/* ======================================================== */}
        {/* TICKET 3..N: FICHAS INDIVIDUAIS DE RETIRADA / VALE-CONSUMO */}
        {/* ======================================================== */}
        {fichas.map((ficha, idx) => {
          const seq = idx + 1;
          const seqStr = String(seq).padStart(2, '0');
          const totalStr = String(fichas.length).padStart(2, '0');
          const validador = `${numeroFormatado}-${seqStr}`;
          return (
            <React.Fragment key={idx}>
              <div className="page-break-ticket" style={{ pageBreakAfter: 'always', margin: '0', borderTop: '1px dashed #999' }}></div>
              <div className="ticket-wrapper ticket-ficha" style={{ textAlign: 'center', padding: '6px 0' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {nomeEstande}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', margin: '2px 0' }}>
                  *** VALE / FICHA DE RETIRADA ***
                </div>
                <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', margin: '6px 0', padding: '8px 0' }}>
                  <div style={{ fontSize: '22px', fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.2' }}>
                    {ficha.nome_produto}
                  </div>
                  {ficha.origem_combo && (
                    <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>
                      (Origem: {ficha.origem_combo})
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '900', fontFamily: 'monospace' }}>
                  FICHA {seqStr} / {totalStr}
                </div>
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  PEDIDO #{numeroFormatado} • {dataHora}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '900', fontFamily: 'monospace', margin: '6px auto', border: '1px solid #000', padding: '3px 8px', display: 'inline-block' }}>
                  COD. VALIDADOR: [ {validador} ]
                </div>
                <div style={{ fontSize: '9px', fontStyle: 'italic', marginTop: '4px' }}>
                  Apresente no balcão para retirada do produto.
                </div>
              </div>
            </React.Fragment>
          );
        })}

      </div>
    </>
  );
}
