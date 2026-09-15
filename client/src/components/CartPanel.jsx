import React from 'react';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, X } from 'lucide-react';

export default function CartPanel({
  cart = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenCheckout
}) {
  const totalItems = cart.reduce((acc, item) => acc + item.quantidade, 0);
  const totalPrice = cart.reduce((acc, item) => acc + (item.quantidade * item.preco), 0);

  const formatPrice = (value) => {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <div className="w-full lg:w-96 bg-slate-900/95 border border-slate-800 rounded-2xl flex flex-col h-[calc(100vh-6rem)] lg:sticky lg:top-20 shadow-2xl overflow-hidden">
      
      {/* Header do Carrinho */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">
              Pedido Atual
            </h2>
            <p className="text-[11px] text-slate-400">
              {totalItems} {totalItems === 1 ? 'item selecionado' : 'itens selecionados'}
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            title="Limpar todos os itens"
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 p-1.5 rounded-lg border border-transparent hover:border-rose-800/40 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Lista de Itens do Carrinho */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 border border-slate-800 flex items-center justify-center mb-3">
              <ShoppingBag className="w-8 h-8 text-slate-600" />
            </div>
            <p className="font-semibold text-slate-300 text-sm">O carrinho está vazio</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
              Clique nos produtos do cardápio para adicionar ao pedido.
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const itemSubtotal = item.quantidade * item.preco;

            return (
              <div
                key={item.id}
                className="bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 rounded-xl p-3 flex flex-col gap-2 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-100 leading-snug">
                      {item.nome}
                    </h4>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatPrice(item.preco)} cada
                    </span>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Controles de Quantidade e Subtotal */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/40">
                  <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg overflow-hidden">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantidade - 1)}
                      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-black text-slate-100 font-mono">
                      {item.quantidade}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantidade + 1)}
                      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="font-bold text-sm text-amber-400 font-mono">
                    {formatPrice(itemSubtotal)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer do Carrinho: Resumo & Botão Finalizar */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Subtotal ({totalItems} itens):</span>
            <span className="font-mono">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-base text-slate-200">TOTAL:</span>
            <span className="font-black text-2xl text-emerald-400 font-mono tracking-tight">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenCheckout}
          disabled={cart.length === 0}
          className={`w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all duration-200 ${
            cart.length > 0
              ? 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-orange-500 text-white shadow-orange-950/50 border border-amber-400/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed'
          }`}
        >
          <span>FINALIZAR PEDIDO</span>
          <span className="text-xs font-normal opacity-80">(F2)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
