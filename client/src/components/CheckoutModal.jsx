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
  Loader2,
  Layers,
  ArrowRight
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
  const [isSplit, setIsSplit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pix'); // 'pix', 'dinheiro', 'debito', 'credito'
  const [cashReceived, setCashReceived] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);

  // Estados para Pagamento Dividido (2 Formas)
  const [splitMethod1, setSplitMethod1] = useState('dinheiro');
  const [splitAmount1, setSplitAmount1] = useState('');
  const [splitMethod2, setSplitMethod2] = useState('pix');
  const [splitAmount2, setSplitAmount2] = useState('');

  const pixKey = config?.pix_cnpj || config?.chave_pix || '';
  const totalNum = parseFloat(total) || 0;

  useEffect(() => {
    if (isOpen) {
      setIsSplit(false);
      setPaymentMethod('pix');
      setCashReceived('');
      setCopiedPix(false);
      setSplitMethod1('dinheiro');
      setSplitAmount1('');
      setSplitMethod2('pix');
      setSplitAmount2('');
    }
  }, [isOpen, total]);

  // Ao ativar o modo dividido, preenche sugestão se estiver vazio
  const handleToggleSplit = (splitActive) => {
    setIsSplit(splitActive);
    if (splitActive && !splitAmount1 && !splitAmount2) {
      setSplitMethod1('dinheiro');
      setSplitMethod2('pix');
    }
  };

  const val1 = parseFloat(splitAmount1) || 0;
  const val2 = parseFloat(splitAmount2) || 0;
  const sumSplit = val1 + val2;
  const splitDiff = totalNum - sumSplit;
  const isSplitValid = Math.abs(splitDiff) <= 0.05 && val1 > 0 && val2 > 0;

  // Auto-ajuste para completar o 2º pagamento
  const handleAutoAdjustSplit2 = () => {
    const restante = Math.max(0, totalNum - val1);
    setSplitAmount2(restante.toFixed(2));
  };

  if (!isOpen) return null;

  const cashNum = parseFloat(cashReceived) || 0;
  const hasCashInput = Boolean(cashReceived && cashReceived.trim() !== '');
  const troco = paymentMethod === 'dinheiro' && hasCashInput && cashNum > totalNum ? cashNum - totalNum : 0;
  
  // No pagamento em dinheiro, inserir o valor entregue é 100% opcional (apenas para ajudar no troco).
  const isCashValid = paymentMethod !== 'dinheiro' || !hasCashInput || cashNum >= totalNum;

  const canSubmit = isSplit ? isSplitValid : isCashValid;

  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleCopyPix = () => {
    if (!pixKey) return;
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleQuickCash = (amount) => {
    setCashReceived(amount.toFixed(2));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit || isProcessing) return;

    if (isSplit) {
      onConfirmOrder({
        itens: cartItems,
        forma_pagamento: 'misto',
        pagamentos: [
          { forma: splitMethod1, valor: val1 },
          { forma: splitMethod2, valor: val2 }
        ],
        valor_pago: totalNum,
        troco: 0
      });
    } else {
      onConfirmOrder({
        itens: cartItems,
        forma_pagamento: paymentMethod,
        pagamentos: [
          { forma: paymentMethod, valor: totalNum }
        ],
        valor_pago: paymentMethod === 'dinheiro' ? (hasCashInput ? cashNum : totalNum) : totalNum,
        troco: troco
      });
    }
  };

  const showPixQr = (!isSplit && paymentMethod === 'pix') || (isSplit && (splitMethod1 === 'pix' || splitMethod2 === 'pix'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header do Modal */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center text-white shadow-md">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-100">
                Finalizar Venda
              </h3>
              <p className="text-xs text-slate-400">
                Selecione o pagamento ou divida em 2 formas
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Card de Valor Total */}
          <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 p-3.5 sm:p-4 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                Total do Pedido
              </span>
              <p className="text-xs text-slate-400">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'} no carrinho
              </p>
            </div>
            <span className="font-black text-2xl sm:text-3xl text-emerald-400 font-mono tracking-tight">
              {formatPrice(totalNum)}
            </span>
          </div>

          {/* Seletor de Modo: Pagamento Único vs Dividido em 2 Formas */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleToggleSplit(false)}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                !isSplit
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>Pagamento Único</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleSplit(true)}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                isSplit
                  ? 'bg-amber-600 text-slate-950 font-black shadow-lg shadow-amber-950/50'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Dividir (2 Formas) ⚡</span>
            </button>
          </div>

          {/* MODO 1: PAGAMENTO ÚNICO */}
          {!isSplit && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
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

              {/* Painel Específico para DINHEIRO (Troco Opcional) */}
              {paymentMethod === 'dinheiro' && (
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-slate-400 font-medium">
                        Valor Entregue pelo Cliente:
                      </label>
                      <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">
                        Opcional
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={`Valor exato (${totalNum.toFixed(2)}) ou digite o valor recebido`}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-lg font-black text-slate-100 font-mono focus:outline-none focus:border-amber-500 placeholder:text-slate-500 placeholder:font-normal placeholder:text-xs"
                      />
                    </div>
                  </div>

                  {/* Atalhos de Dinheiro */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-slate-500 font-medium mr-1">Atalhos:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(totalNum)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 rounded-lg border border-slate-700"
                    >
                      Exato ({formatPrice(totalNum)})
                    </button>
                    {[10, 20, 50, 100].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickCash(val)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg border border-slate-700"
                      >
                        R$ {val}
                      </button>
                    ))}
                    {hasCashInput && (
                      <button
                        type="button"
                        onClick={() => setCashReceived('')}
                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 rounded-lg border border-slate-700"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Troco */}
                  {hasCashInput && (
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      cashNum >= totalNum
                        ? 'bg-emerald-950/50 border-emerald-500/40'
                        : 'bg-rose-950/40 border-rose-500/30'
                    }`}>
                      <span className="text-xs font-bold text-slate-300">
                        {cashNum >= totalNum ? 'Troco a Devolver:' : 'Valor Insuficiente:'}
                      </span>
                      <span className={`font-black text-lg font-mono ${
                        cashNum >= totalNum ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {formatPrice(Math.abs(cashNum - totalNum))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODO 2: DIVIDIR PAGAMENTO EM 2 FORMAS */}
          {isSplit && (
            <div className="bg-slate-950/80 p-3.5 sm:p-4 rounded-2xl border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Dividir Venda em 2 Formas de Pagamento
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Alvo: {formatPrice(totalNum)}
                </span>
              </div>

              {/* Campo Forma 1 */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">1ª Forma de Pagamento:</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={splitMethod1}
                    onChange={(e) => setSplitMethod1(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:border-amber-500"
                  >
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="pix">📱 PIX</option>
                    <option value="debito">💳 Débito</option>
                    <option value="credito">💳 Crédito</option>
                  </select>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={splitAmount1}
                      onChange={(e) => setSplitAmount1(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-base font-black text-white font-mono text-right focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Campo Forma 2 */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">2ª Forma de Pagamento:</span>
                  <button
                    type="button"
                    onClick={handleAutoAdjustSplit2}
                    className="text-[11px] text-amber-400 font-bold hover:underline"
                  >
                    ⚡ Completar Restante
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={splitMethod2}
                    onChange={(e) => setSplitMethod2(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:border-amber-500"
                  >
                    <option value="pix">📱 PIX</option>
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="debito">💳 Débito</option>
                    <option value="credito">💳 Crédito</option>
                  </select>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={splitAmount2}
                      onChange={(e) => setSplitAmount2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-base font-black text-white font-mono text-right focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Conferência dos Valores */}
              <div className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                isSplitValid
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}>
                <span>Soma: {formatPrice(sumSplit)}</span>
                <span className="font-bold">
                  {isSplitValid ? '✓ Total confere!' : `Falta: ${formatPrice(splitDiff)}`}
                </span>
              </div>
            </div>
          )}

          {/* Painel do QR CODE PIX (se PIX for selecionado) */}
          {showPixQr && (
            <div className="bg-slate-950/90 p-4 rounded-2xl border border-emerald-500/30 flex flex-col items-center text-center space-y-2.5">
              <div className="w-44 h-44 bg-white p-2 rounded-2xl shadow-xl flex items-center justify-center overflow-hidden border-2 border-emerald-500">
                <img
                  src={config?.pix_qrcode_url || '/img/pix-qrcode.jpeg'}
                  alt="QR Code Pix"
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    if (pixKey) {
                      e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pixKey)}`;
                    }
                  }}
                />
              </div>

              <div>
                <p className="text-xs font-bold text-emerald-400">
                  Aponte a câmera do aplicativo do banco para pagar
                </p>
                {pixKey ? (
                  <div className="flex items-center justify-center gap-2 mt-1.5 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 font-mono text-xs text-slate-300">
                    <span className="text-[11px] text-slate-400">Chave/CNPJ:</span>
                    <span className="text-emerald-400 font-bold">{pixKey}</span>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copiar Chave"
                    >
                      {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    (CNPJ da chave pode ser cadastrado nas Configurações)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Botão de Confirmação */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSubmit || isProcessing}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                canSubmit && !isProcessing
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
