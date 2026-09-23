import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Banknote, 
  CreditCard, 
  CheckCircle2, 
  Copy, 
  Check, 
  Calculator,
  Loader2 
} from 'lucide-react';

export default function CheckoutModal({
  isOpen,
  onClose,
  total,
  cartItems = [],
  config,
  onConfirmOrder,
  isProcessing = false
}) {
  const [paymentMethod, setPaymentMethod] = useState('pix'); // 'pix', 'dinheiro', 'debito', 'credito'
  const [cashReceived, setCashReceived] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);

  const pixKey = config?.chave_pix || 'pix@expobai.com.br';

  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('pix');
      setCashReceived('');
      setCopiedPix(false);
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  const totalNum = parseFloat(total) || 0;
  const cashNum = parseFloat(cashReceived) || 0;
  const troco = paymentMethod === 'dinheiro' && cashNum > totalNum ? cashNum - totalNum : 0;
  const isCashValid = paymentMethod !== 'dinheiro' || cashNum >= totalNum;

  const formatPrice = (value) => {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleQuickCash = (amount) => {
    setCashReceived(amount.toFixed(2));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isCashValid || isProcessing) return;

    onConfirmOrder({
      itens: cartItems,
      forma_pagamento: paymentMethod,
      valor_pago: paymentMethod === 'dinheiro' ? cashNum : totalNum,
      troco: troco
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center text-white shadow-md">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-100">
                Finalizar Venda
              </h3>
              <p className="text-xs text-slate-400">
                Selecione a forma de pagamento do cliente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Card de Valor Total */}
          <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 p-4 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                Total a Pagar
              </span>
              <p className="text-xs text-slate-400">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'} no pedido
              </p>
            </div>
            <span className="font-black text-3xl text-emerald-400 font-mono tracking-tight">
              {formatPrice(totalNum)}
            </span>
          </div>

          {/* Formas de Pagamento em Botões Grandes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Forma de Pagamento:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border font-bold text-xs transition-all ${
                  paymentMethod === 'pix'
                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-950'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-5 h-5 text-emerald-400" />
                <span>PIX</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('dinheiro')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border font-bold text-xs transition-all ${
                  paymentMethod === 'dinheiro'
                    ? 'bg-amber-600/30 border-amber-400 text-amber-200 shadow-md shadow-amber-950'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Banknote className="w-5 h-5 text-amber-400" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('debito')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border font-bold text-xs transition-all ${
                  paymentMethod === 'debito'
                    ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-5 h-5 text-cyan-400" />
                <span>Débito</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credito')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border font-bold text-xs transition-all ${
                  paymentMethod === 'credito'
                    ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-md shadow-purple-950'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-5 h-5 text-purple-400" />
                <span>Crédito</span>
              </button>
            </div>
          </div>

          {/* Painel Específico para PIX */}
          {paymentMethod === 'pix' && (
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col items-center text-center">
              <div className="w-36 h-36 bg-white p-2 rounded-xl shadow-lg flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(pixKey)}`}
                  alt="QR Code Pix"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-xs text-slate-400">Chave PIX cadastrada:</p>
                <div className="flex items-center gap-2 mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-xs text-emerald-400">
                  <span>{pixKey}</span>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Painel Específico para DINHEIRO (Cálculo de Troco) */}
          {paymentMethod === 'dinheiro' && (
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Valor Entregue pelo Cliente:
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    placeholder="0,00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-lg font-black text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Botões de Valores Rápidos */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickCash(totalNum)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 rounded-lg border border-slate-700"
                >
                  Exato ({formatPrice(totalNum)})
                </button>
                {[10, 20, 50, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickCash(val)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg border border-slate-700"
                  >
                    R$ {val}
                  </button>
                ))}
              </div>

              {/* Exibição do Troco em Destaque */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                cashNum >= totalNum
                  ? 'bg-emerald-950/50 border-emerald-500/40'
                  : 'bg-rose-950/40 border-rose-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase">
                    {cashNum >= totalNum ? 'Troco a Devolver:' : 'Valor Insuficiente:'}
                  </span>
                </div>
                <span className={`font-black text-xl font-mono ${
                  cashNum >= totalNum ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatPrice(Math.abs(cashNum - totalNum))}
                </span>
              </div>
            </div>
          )}

          {/* Botão de Confirmação */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isCashValid || isProcessing}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                isCashValid && !isProcessing
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-950/50 border border-emerald-400/40 cursor-pointer active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processando Venda...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>CONFIRMAR VENDA (ENTER)</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
