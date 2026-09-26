import React, { useState } from 'react';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, X, Edit2, Check, Tag, Sparkles } from 'lucide-react';

export default function CartPanel({
  cart = [],
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onClearCart,
  onAddCustomCombo,
  onOpenCheckout
}) {
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editPriceVal, setEditPriceVal] = useState('');
  const [isCustomComboOpen, setIsCustomComboOpen] = useState(false);
  const [customComboData, setCustomComboData] = useState({
    nome: '',
    preco: '',
    preco_custo: '',
    quantidade: 1
  });

  const totalItems = cart.reduce((acc, item) => acc + item.quantidade, 0);
  const totalPrice = cart.reduce((acc, item) => acc + (item.quantidade * item.preco), 0);

  const formatPrice = (value) => {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleStartEditPrice = (item) => {
    setEditingPriceId(item.id);
    setEditPriceVal(String(item.preco));
  };

  const handleSavePrice = (itemId) => {
    const val = parseFloat(editPriceVal);
    if (!isNaN(val) && val >= 0 && onUpdatePrice) {
      onUpdatePrice(itemId, val);
    }
    setEditingPriceId(null);
  };

  const handleCreateCustomCombo = (e) => {
    e.preventDefault();
    if (!customComboData.nome || !customComboData.preco) {
      alert('Informe o nome e o preço do combo');
      return;
    }
    if (onAddCustomCombo) {
      onAddCustomCombo(customComboData);
    }
    setCustomComboData({ nome: '', preco: '', preco_custo: '', quantidade: 1 });
    setIsCustomComboOpen(false);
  };

  return (
    <div className="w-full lg:w-96 bg-slate-900/95 border border-slate-800 rounded-2xl flex flex-col h-[calc(100vh-6rem)] lg:sticky lg:top-20 shadow-2xl overflow-hidden">
      
      {/* Header do Carrinho */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
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

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCustomComboOpen(true)}
            title="Lançar combo avulso ou promoção na hora"
            className="text-[11px] bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all"
          >
            <Sparkles className="w-3 h-3" />
            <span>+ Combo</span>
          </button>

          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              title="Limpar todos os itens"
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 p-1.5 rounded-lg transition-colors flex items-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-100 leading-snug">
                        {item.nome}
                      </h4>
                      {item.combo_info && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[9px] font-black font-mono">
                          🎁 {item.combo_info.titulo || 'COMBO'}
                        </span>
                      )}
                    </div>

                    {editingPriceId === item.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-slate-400 font-mono">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={editPriceVal}
                          onChange={(e) => setEditPriceVal(e.target.value)}
                          className="w-20 bg-slate-950 border border-amber-500 rounded px-1.5 py-0.5 text-xs text-white font-mono font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePrice(item.id)}
                          className="p-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white"
                          title="Salvar preço"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPriceId(null)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-slate-400 font-mono">
                          {formatPrice(item.preco)} cada
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEditPrice(item)}
                          className="text-slate-500 hover:text-amber-400 p-0.5 rounded transition-colors"
                          title="Alterar preço deste item"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
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

      {/* Modal Rápido de Combo Avulso / Especial */}
      {isCustomComboOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Lançar Combo Avulso</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomComboOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomCombo} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome do Combo / Descrição *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Combo 4 Latas + Gelo"
                  value={customComboData.nome}
                  onChange={(e) => setCustomComboData({ ...customComboData, nome: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1">
                    Preço Total (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={customComboData.preco}
                    onChange={(e) => setCustomComboData({ ...customComboData, preco: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1">
                    Custo Total (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={customComboData.preco_custo}
                    onChange={(e) => setCustomComboData({ ...customComboData, preco_custo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomComboOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg"
                >
                  Adicionar ao Carrinho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
