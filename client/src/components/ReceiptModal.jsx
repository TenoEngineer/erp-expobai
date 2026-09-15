import React, { useEffect } from 'react';
import { CheckCircle, Printer, ArrowRight, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ReceiptModal({
  isOpen,
  onClose,
  order,
  config
}) {
  useEffect(() => {
    if (isOpen && order) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore
      }
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const formatPrice = (value) => {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handlePrint = () => {
    window.print();
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
                Número da Comanda
              </span>
              <span className="font-black text-4xl sm:text-5xl text-amber-400 font-mono tracking-tight">
                #{String(order.numero_pedido).padStart(3, '0')}
              </span>
            </div>
          </div>

          {/* Resumo dos Itens */}
          <div className="p-5 overflow-y-auto space-y-3 flex-1">
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 flex justify-between">
                <span>Item</span>
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
              onClick={handlePrint}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir Ficha / Comprovante</span>
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

      {/* Ticket Térmico Oculto (Impresso via window.print) */}
      <div id="thermal-receipt" className="hidden print:block text-black">
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>
            {config?.nome_estande || 'Tenda dos Müller'}
          </h2>
          <p style={{ fontSize: '11px', margin: '2px 0' }}>FICHA DE RETIRADA</p>
          <div style={{ fontSize: '32px', fontWeight: '900', margin: '8px 0', border: '2px solid #000', padding: '4px' }}>
            #{String(order.numero_pedido).padStart(3, '0')}
          </div>
          <p style={{ fontSize: '10px' }}>{new Date().toLocaleString('pt-BR')}</p>
        </div>

        <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
          <table style={{ width: '100%', fontSize: '12px' }}>
            <tbody>
              {(order.itens || []).map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 'bold', width: '30px' }}>{item.quantidade}x</td>
                  <td>{item.nome_produto}</td>
                  <td style={{ textAlign: 'right' }}>{formatPrice(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'right', marginBottom: '8px' }}>
          TOTAL: {formatPrice(order.total)} ({order.forma_pagamento?.toUpperCase()})
          {order.troco > 0 && <div>TROCO: {formatPrice(order.troco)}</div>}
        </div>

        {order.observacoes && (
          <div style={{ fontSize: '11px', fontStyle: 'italic', marginBottom: '8px' }}>
            Obs: {order.observacoes}
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '10px' }}>
          Obrigado pela preferência!<br />
          Expobai - Onde a cidade é + agro
        </div>
      </div>
    </>
  );
}
