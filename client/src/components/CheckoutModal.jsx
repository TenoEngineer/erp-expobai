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

  const executeSubmit = () => {
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

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    executeSubmit();
  };

  // Atalhos de teclado no Fechamento do Pedido (Enter confirma o pedido sem re-clicar botão, 1-5 seleciona método, Esc cancela)
  useEffect(() => {
    if (!isOpen) return;

    const handleModalKeyDown = (e) => {
      // 1. Tecla ENTER: Confirma a venda imediatamente e previne re-clique no botão focado
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        executeSubmit();
        return;
      }

      // 2. Tecla ESC: Fecha o modal de fechamento
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // 3. Se estiver digitando em um input de texto/número (ex: valor entregue em dinheiro), não tratar números como atalhos
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      // 4. Atalhos rápidos para as formas de pagamento: 1 (Pix), 2 (Dinheiro), 3 (Débito), 4 (Crédito), 5 (Misto)
      const k = e.key.toLowerCase();
      if (k === '1' || k === 'p') {
        e.preventDefault();
        e.stopPropagation();
        setIsSplit(false);
        setPaymentMethod('pix');
      } else if (k === '2' || k === 'd') {
        e.preventDefault();
        e.stopPropagation();
        setIsSplit(false);
        setPaymentMethod('dinheiro');
      } else if (k === '3' || k === 'e' || k === 'b') {
        e.preventDefault();
        e.stopPropagation();
        setIsSplit(false);
        setPaymentMethod('debito');
      } else if (k === '4' || k === 'c') {
        e.preventDefault();
        e.stopPropagation();
        setIsSplit(false);
        setPaymentMethod('credito');
      } else if (k === '5' || k === 'm') {
        e.preventDefault();
        e.stopPropagation();
        handleToggleSplit(true);
      }
    };

    window.addEventListener('keydown', handleModalKeyDown, true); // capture: true para garantir interceptação prioritária
    return () => window.removeEventListener('keydown', handleModalKeyDown, true);
  }, [isOpen, canSubmit, isProcessing, isSplit, paymentMethod, val1, val2, splitMethod1, splitMethod2, cashReceived, cartItems, totalNum, troco, hasCashInput, cashNum]);

  const showPixQr = (!isSplit && paymentMethod === 'pix') || (isSplit && (splitMethod1 === 'pix' || splitMethod2 === 'pix'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-x-hidden">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl md:rounded-3xl w-full max-w-lg md:max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[88vh]">
        
        {/* Header do Modal */}
        <div className="p-3.5 md:p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center text-white shadow-md">
              <span className="text-base md:text-lg">💰</span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm md:text-base text-slate-100">
                Finalizar Venda
              </h3>
              <p className="text-[11px] md:text-xs text-slate-400">
                Selecione o pagamento ou divida em 2 formas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            title="Fechar (Esc)"
          >
            <span className="hidden sm:inline text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              Esc
            </span>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-3 md:p-4 overflow-y-auto overflow-x-hidden space-y-3 md:space-y-3.5 flex-1">
            
            {/* Card de Valor Total */}
            <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] md:text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                Total do Pedido
              </span>
              <p className="text-[11px] text-slate-400">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'} no carrinho
              </p>
            </div>
            <span className="font-black text-xl md:text-2xl text-emerald-400 font-mono tracking-tight">
              {formatPrice(totalNum)}
            </span>
          </div>

          {/* Seletor de Modo: Pagamento Único vs Dividir em 2 Formas */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs md:text-xs font-bold">
            <button
              type="button"
              onClick={(e) => {
                handleToggleSplit(false);
                e.currentTarget.blur();
              }}
              className={`h-11 md:h-8.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isSplit
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>Pagamento Único</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                handleToggleSplit(true);
                e.currentTarget.blur();
              }}
              className={`h-11 md:h-8.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isSplit
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-950/50'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Dividir (2 Formas)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900/90 text-amber-300 border border-amber-500/40">
                ⌨ 5
              </span>
            </button>
          </div>

          {/* MODO 1: PAGAMENTO ÚNICO */}
          {!isSplit && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] md:text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Forma de Pagamento:
                </label>
                <span className="text-[10px] text-amber-400 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  ⌨️ Teclas 1, 2, 3, 4 &bull; [Enter] Confirma
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* PIX (Tecla 1) */}
                <button
                  type="button"
                  onClick={(e) => {
                    setPaymentMethod('pix');
                    e.currentTarget.blur();
                  }}
                  className={`flex flex-col items-center justify-center gap-1 h-18 md:h-14 rounded-xl border-2 font-bold text-sm md:text-xs transition-all active:scale-95 relative ${
                    paymentMethod === 'pix'
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 shadow-md ring-1 ring-emerald-400'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 active:bg-slate-800'
                  }`}
                >
                  <span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950/80 text-emerald-300 border border-emerald-500/30">
                    ⌨ 1
                  </span>
                  <QrCode className="w-6 h-6 md:w-4.5 md:h-4.5 text-emerald-400" />
                  <span>PIX</span>
                </button>

                {/* Dinheiro (Tecla 2) */}
                <button
                  type="button"
                  onClick={(e) => {
                    setPaymentMethod('dinheiro');
                    e.currentTarget.blur();
                  }}
                  className={`flex flex-col items-center justify-center gap-1 h-18 md:h-14 rounded-xl border-2 font-bold text-sm md:text-xs transition-all active:scale-95 relative ${
                    paymentMethod === 'dinheiro'
                      ? 'bg-amber-600/30 border-amber-400 text-amber-200 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 active:bg-slate-800'
                  }`}
                >
                  <span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950/80 text-amber-300 border border-amber-500/30">
                    ⌨ 2
                  </span>
                  <Banknote className="w-6 h-6 md:w-4.5 md:h-4.5 text-amber-400" />
                  <span>Dinheiro</span>
                </button>

                {/* Débito (Tecla 3) */}
                <button
                  type="button"
                  onClick={(e) => {
                    setPaymentMethod('debito');
                    e.currentTarget.blur();
                  }}
                  className={`flex flex-col items-center justify-center gap-1 h-18 md:h-14 rounded-xl border-2 font-bold text-sm md:text-xs transition-all active:scale-95 relative ${
                    paymentMethod === 'debito'
                      ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 active:bg-slate-800'
                  }`}
                >
                  <span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950/80 text-cyan-300 border border-cyan-500/30">
                    ⌨ 3
                  </span>
                  <CreditCard className="w-6 h-6 md:w-4.5 md:h-4.5 text-cyan-400" />
                  <span>Débito</span>
                </button>

                {/* Crédito (Tecla 4) */}
                <button
                  type="button"
                  onClick={(e) => {
                    setPaymentMethod('credito');
                    e.currentTarget.blur();
                  }}
                  className={`flex flex-col items-center justify-center gap-1 h-18 md:h-14 rounded-xl border-2 font-bold text-sm md:text-xs transition-all active:scale-95 relative ${
                    paymentMethod === 'credito'
                      ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-md ring-1 ring-purple-400'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 active:bg-slate-800'
                  }`}
                >
                  <span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950/80 text-purple-300 border border-purple-500/30">
                    ⌨ 4
                  </span>
                  <CreditCard className="w-6 h-6 md:w-4.5 md:h-4.5 text-purple-400" />
                  <span>Crédito</span>
                </button>
              </div>

              {/* Painel Específico para DINHEIRO (Troco Opcional) */}
              {paymentMethod === 'dinheiro' && (
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] md:text-xs text-slate-400 font-medium">
                        Valor Entregue pelo Cliente:
                      </label>
                      <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">
                        Opcional
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">
                        R$
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder={`Valor exato (${totalNum.toFixed(2)}) ou digite o valor recebido`}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            executeSubmit();
                          }
                        }}
                        className="w-full h-12 md:h-9.5 bg-slate-900 border-2 border-slate-700 rounded-xl pl-9 pr-3 text-lg md:text-base font-black text-slate-100 font-mono focus:outline-none focus:border-amber-500 placeholder:text-slate-500 placeholder:font-normal placeholder:text-xs"
                      />
                    </div>
                  </div>

                  {/* Atalhos de Dinheiro Touch-Friendly no Mobile e Compactos no Notebook */}
                  <div className="flex flex-wrap gap-1.5 md:gap-2 items-center pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        handleQuickCash(totalNum);
                        e.currentTarget.blur();
                      }}
                      className="h-10 md:h-7.5 px-3 md:px-2.5 bg-amber-500/20 active:bg-amber-500 text-amber-300 active:text-slate-950 font-bold text-xs rounded-lg border border-amber-500/50 shadow"
                    >
                      Exato ({formatPrice(totalNum)})
                    </button>
                    {[5, 10, 20, 50, 100].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={(e) => {
                          handleQuickCash(val);
                          e.currentTarget.blur();
                        }}
                        className="h-10 md:h-7.5 px-2.5 md:px-2 bg-slate-800 active:bg-slate-700 text-xs font-bold text-slate-100 rounded-lg border border-slate-700 active:scale-95 shadow"
                      >
                        R$ {val}
                      </button>
                    ))}
                    {hasCashInput && (
                      <button
                        type="button"
                        onClick={(e) => {
                          setCashReceived('');
                          e.currentTarget.blur();
                        }}
                        className="h-10 md:h-7.5 px-2.5 md:px-2 bg-slate-900 active:bg-slate-800 text-[11px] font-bold text-slate-400 rounded-lg border border-slate-700"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Troco */}
                  {hasCashInput && (
                    <div className={`p-2 rounded-xl border flex items-center justify-between ${
                      cashNum >= totalNum
                        ? 'bg-emerald-950/50 border-emerald-500/40'
                        : 'bg-rose-950/40 border-rose-500/30'
                    }`}>
                      <span className="text-xs font-bold text-slate-300">
                        {cashNum >= totalNum ? 'Troco a Devolver:' : 'Valor Insuficiente:'}
                      </span>
                      <span className={`font-black text-base md:text-lg font-mono ${
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
            <div className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Dividir Venda em 2 Formas
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Alvo: {formatPrice(totalNum)}
                </span>
              </div>

              {/* Campo Forma 1 */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-[11px] font-bold text-slate-300">1ª Forma de Pagamento:</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={splitMethod1}
                    onChange={(e) => setSplitMethod1(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:border-amber-500"
                  >
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="pix">📱 PIX</option>
                    <option value="debito">💳 Débito</option>
                    <option value="credito">💳 Crédito</option>
                  </select>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">
                      R$
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0,00"
                      value={splitAmount1}
                      onChange={(e) => setSplitAmount1(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1.5 text-sm md:text-sm font-black text-white font-mono text-right focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Campo Forma 2 */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-[11px] font-bold text-slate-300">2ª Forma de Pagamento:</span>
                  <button
                    type="button"
                    onClick={handleAutoAdjustSplit2}
                    className="text-[10px] md:text-[11px] text-amber-400 font-bold hover:underline"
                  >
                    ⚡ Completar Restante
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={splitMethod2}
                    onChange={(e) => setSplitMethod2(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:border-amber-500"
                  >
                    <option value="pix">📱 PIX</option>
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="debito">💳 Débito</option>
                    <option value="credito">💳 Crédito</option>
                  </select>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">
                      R$
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0,00"
                      value={splitAmount2}
                      onChange={(e) => setSplitAmount2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1.5 text-sm md:text-sm font-black text-white font-mono text-right focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Conferência dos Valores */}
              <div className={`p-2 rounded-xl border text-xs font-mono flex items-center justify-between ${
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
            <div className="bg-slate-950/90 p-3 md:p-3.5 rounded-2xl border-2 border-emerald-500/50 flex flex-col items-center text-center space-y-2 shadow-xl">
              <div className="w-52 h-52 md:w-44 md:h-44 max-w-[70vw] bg-white p-2.5 rounded-2xl shadow-xl flex items-center justify-center overflow-hidden border-2 md:border-3 border-emerald-400 shrink-0">
                <img
                  src={config?.pix_qrcode_url || '/img/pix-qrcode.jpeg'}
                  alt="QR Code Pix"
                  draggable={false}
                  className="w-full h-full object-contain pointer-events-none select-none rounded-lg"
                  onError={(e) => {
                    if (pixKey) {
                      e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixKey)}`;
                    }
                  }}
                />
              </div>

              <div>
                <p className="text-xs md:text-sm font-black text-emerald-400">
                  Aponte a câmera do aplicativo do banco para pagar
                </p>
                {pixKey ? (
                  <div className="flex items-center justify-center gap-1.5 mt-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 font-mono text-[11px] md:text-xs text-slate-200">
                    <span className="text-[10px] text-slate-400">Chave/CNPJ:</span>
                    <span className="text-emerald-400 font-bold truncate max-w-[180px] sm:max-w-none">{pixKey}</span>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="text-slate-400 hover:text-white transition-colors shrink-0 p-0.5"
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

          </div>

          {/* Rodapé Fixo / Sticky com Botão de Confirmação Normal no Desktop e Grande no Mobile */}
          <div 
            className="p-3 md:p-3 bg-slate-950 border-t border-slate-800 shrink-0"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <button
              type="submit"
              disabled={!canSubmit || isProcessing}
              className={`w-full h-15 md:h-11 py-2 px-4 rounded-xl font-black text-base md:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                canSubmit && !isProcessing
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 active:from-emerald-400 active:to-green-400 text-slate-950 shadow-emerald-950 border-2 border-emerald-400/60 cursor-pointer active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  <span>Processando Venda...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>CONFIRMAR VENDA [ENTER ↵]</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
