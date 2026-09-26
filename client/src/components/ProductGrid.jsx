import React, { useState } from 'react';
import { Search, Plus, Minus, Utensils, Sparkles, LayoutGrid, List } from 'lucide-react';

export default function ProductGrid({ 
  products = [], 
  onAddToCart, 
  onUpdateQuantity, 
  onRemoveItem, 
  cartItems = [] 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('pos_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('pos_view_mode', mode);
    } catch {}
  };

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.nome.toLowerCase().includes(term) || (p.descricao && p.descricao.toLowerCase().includes(term));
  });

  const getProductCombos = (prod) => {
    if (!prod?.combos) return [];
    if (Array.isArray(prod.combos)) return prod.combos;
    try {
      return JSON.parse(prod.combos);
    } catch {
      return [];
    }
  };

  const getParsedItensCombo = (prod) => {
    if (!prod?.itens_combo) return [];
    if (Array.isArray(prod.itens_combo)) return prod.itens_combo;
    try {
      return JSON.parse(prod.itens_combo);
    } catch {
      return [];
    }
  };

  const getCartItem = (prodId) => {
    return cartItems.find(item => item.id === prodId || item.produto_id === prodId);
  };

  const formatPrice = (value) => {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleDecrement = (e, prod) => {
    e.stopPropagation();
    const cartItem = getCartItem(prod.id);
    if (!cartItem) return;
    const itemKey = cartItem.cart_id || cartItem.id;
    if (cartItem.quantidade <= 1) {
      if (onRemoveItem) onRemoveItem(itemKey);
    } else {
      if (onUpdateQuantity) onUpdateQuantity(itemKey, cartItem.quantidade - 1);
    }
  };

  const handleIncrement = (e, prod) => {
    e.stopPropagation();
    onAddToCart(prod);
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-w-0">
      {/* Barra de Busca e Alternador de Visualização (Grade / Lista Rápida) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar produto (ex: espetinho, chopp, suco)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded-full"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Alternador de Modo (Grid vs List) */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 shrink-0 shadow-sm">
          <button
            type="button"
            onClick={() => handleSetViewMode('grid')}
            className={`p-1.5 sm:px-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              viewMode === 'grid'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Visualização em Grade"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden md:inline">Grade</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode('list')}
            className={`p-1.5 sm:px-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              viewMode === 'list'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Visualização em Lista Rápida (Modo Agilidade)"
          >
            <List className="w-4 h-4" />
            <span className="hidden md:inline">Lista</span>
          </button>
        </div>
      </div>

      {/* Se não houver produtos */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-center">
          <Utensils className="w-10 h-10 text-slate-600 mb-2" />
          <p className="text-slate-300 font-semibold text-sm">Nenhum produto encontrado</p>
          <p className="text-slate-500 text-xs mt-0.5">Tente outra busca ou selecione outra categoria.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ========================================================================= */
        /* MODO GRADE: COMPACTO, 2 COLUNAS NO MOBILE COM STEPPER DIRETO NO CARD */
        /* ========================================================================= */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {filteredProducts.map((prod) => {
            const cartItem = getCartItem(prod.id);
            const qtyInCart = cartItem ? cartItem.quantidade : 0;
            const combos = getProductCombos(prod);
            const isCombo = Boolean(prod.is_combo || prod.categoria_nome?.toLowerCase() === 'combos');
            const itensCombo = getParsedItensCombo(prod);
            const somaAvulso = itensCombo.reduce((acc, it) => acc + (parseFloat(it.preco || 0) * (it.quantidade || 1)), 0);
            const economia = Math.max(0, somaAvulso - parseFloat(prod.preco || 0));

            return (
              <div
                key={prod.id}
                onClick={() => onAddToCart(prod)}
                className={`group relative border rounded-2xl p-2 sm:p-3 text-left transition-all duration-150 flex flex-col justify-between shadow-md active:scale-[0.99] select-none cursor-pointer overflow-hidden ${
                  qtyInCart > 0
                    ? 'ring-2 ring-amber-500 bg-slate-800/95 border-amber-500/60'
                    : isCombo
                      ? 'bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-900 border-purple-500/40 hover:border-purple-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/70 hover:border-amber-500/50'
                }`}
              >
                {/* Badge de Combo */}
                {isCombo && (
                  <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow-md flex items-center gap-1 border border-purple-400/50">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>COMBO</span>
                  </div>
                )}

                {/* Badge Superior de Quantidade */}
                {qtyInCart > 0 && (
                  <div className="absolute top-2 right-2 z-10 bg-amber-500 text-slate-950 font-black text-[11px] px-2 py-0.5 rounded-full shadow-md flex items-center">
                    <span>{qtyInCart}x</span>
                  </div>
                )}

                {/* Imagem do Produto (Mais compacta no mobile para caber mais itens na tela) */}
                <div className="w-full h-20 sm:h-28 rounded-xl overflow-hidden bg-slate-900 mb-2 relative flex items-center justify-center border border-slate-700/50 shrink-0">
                  {prod.foto_url ? (
                    <img
                      src={prod.foto_url}
                      alt={prod.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-full h-full flex items-center justify-center ${
                      isCombo ? 'bg-gradient-to-br from-purple-950/80 to-slate-900' : 'bg-gradient-to-br from-emerald-950/80 to-slate-900'
                    } ${prod.foto_url ? 'hidden' : 'flex'}`}
                  >
                    {isCombo ? (
                      <Sparkles className="w-6 h-6 text-amber-400" />
                    ) : (
                      <Utensils className="w-6 h-6 text-emerald-500/60" />
                    )}
                  </div>
                </div>

                {/* Detalhes */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className={`font-bold text-xs sm:text-sm leading-tight transition-colors line-clamp-1 ${
                      isCombo ? 'text-purple-100 group-hover:text-purple-300' : 'text-slate-100 group-hover:text-amber-400'
                    }`}>
                      {prod.nome}
                    </h3>
                    
                    {/* Pills de itens inclusos no combo */}
                    {isCombo && itensCombo.length > 0 && (
                      <div className="flex flex-wrap gap-1 my-1">
                        {itensCombo.slice(0, 2).map((it, idx) => (
                          <span
                            key={idx}
                            className="bg-purple-950/90 text-purple-200 border border-purple-500/30 text-[9px] font-bold px-1 py-0.5 rounded"
                          >
                            <b className="text-amber-400">{it.quantidade}x</b> {it.nome}
                          </span>
                        ))}
                        {itensCombo.length > 2 && (
                          <span className="text-[9px] text-purple-300 font-bold self-center">
                            +{itensCombo.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {prod.descricao && (!isCombo || itensCombo.length === 0) && (
                      <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                        {prod.descricao}
                      </p>
                    )}
                  </div>

                  {/* Preço e Stepper Interativo ou Botão Adicionar */}
                  <div className="mt-2 pt-1.5 border-t border-slate-700/50 flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      {isCombo && somaAvulso > prod.preco && (
                        <span className="text-[9px] text-slate-400 line-through font-mono block leading-none">
                          {formatPrice(somaAvulso)}
                        </span>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="font-black text-xs sm:text-base text-amber-400 font-mono tracking-tight block truncate">
                          {formatPrice(prod.preco)}
                        </span>
                      </div>
                    </div>

                    {/* Stepper interativo direto no card para aumentar/diminuir sem abrir gaveta */}
                    {qtyInCart > 0 ? (
                      <div 
                        className="flex items-center bg-amber-500 text-slate-950 rounded-lg p-0.5 shadow-md shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleDecrement(e, prod)}
                          className="w-6 h-6 flex items-center justify-center font-black hover:bg-amber-600 rounded active:scale-90"
                          title="Diminuir"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-black text-xs px-1 select-none">
                          {qtyInCart}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleIncrement(e, prod)}
                          className="w-6 h-6 flex items-center justify-center font-black hover:bg-amber-600 rounded active:scale-90"
                          title="Aumentar"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                        isCombo
                          ? 'bg-purple-600/30 group-hover:bg-purple-600 text-purple-300 group-hover:text-white'
                          : 'bg-emerald-600/20 group-hover:bg-emerald-600 text-emerald-400 group-hover:text-white'
                      }`}>
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    )}
                  </div>

                  {/* Opções Rápidas de Combos com Preços Diferentes */}
                  {combos.length > 0 && (
                    <div 
                      className="mt-1.5 pt-1.5 border-t border-slate-700/40 flex flex-wrap gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {combos.map((combo, cIdx) => (
                        <button
                          key={combo.id || cIdx}
                          type="button"
                          onClick={() => onAddToCart({
                            ...prod,
                            cart_id: `${prod.id}_combo_${combo.id || cIdx}`,
                            nome: `${prod.nome} (${combo.titulo || `${combo.quantidade}x`})`,
                            preco: parseFloat(combo.preco),
                            preco_custo: parseFloat(combo.preco_custo || 0),
                            quantidade_unidades: combo.quantidade || 1,
                            combo_info: combo
                          })}
                          className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded text-[9px] font-black transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                          title={`Adicionar ${combo.titulo}: ${combo.quantidade} un por ${formatPrice(combo.preco)}`}
                        >
                          <span>🎁 {combo.titulo || `${combo.quantidade}x`}:</span>
                          <span className="font-mono">{formatPrice(combo.preco)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================================= */
        /* MODO LISTA RÁPIDA: ULTRA COMPACTO, VELOCIDADE MÁXIMA PARA GARÇOM / PDV */
        /* ========================================================================= */
        <div className="flex flex-col gap-2">
          {filteredProducts.map((prod) => {
            const cartItem = getCartItem(prod.id);
            const qtyInCart = cartItem ? cartItem.quantidade : 0;
            const combos = getProductCombos(prod);
            const isCombo = Boolean(prod.is_combo || prod.categoria_nome?.toLowerCase() === 'combos');
            const itensCombo = getParsedItensCombo(prod);
            const somaAvulso = itensCombo.reduce((acc, it) => acc + (parseFloat(it.preco || 0) * (it.quantidade || 1)), 0);
            const economia = Math.max(0, somaAvulso - parseFloat(prod.preco || 0));

            return (
              <div
                key={prod.id}
                onClick={() => onAddToCart(prod)}
                className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99] ${
                  qtyInCart > 0
                    ? 'bg-slate-800 border-amber-500/80 shadow-md ring-1 ring-amber-500/50'
                    : isCombo
                      ? 'bg-purple-950/20 hover:bg-purple-950/40 border-purple-500/30'
                      : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800'
                }`}
              >
                {/* Miniatura ou Ícone */}
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700/60 overflow-hidden flex items-center justify-center shrink-0">
                  {prod.foto_url ? (
                    <img src={prod.foto_url} alt={prod.nome} className="w-full h-full object-cover" />
                  ) : isCombo ? (
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Utensils className="w-5 h-5 text-emerald-500/70" />
                  )}
                </div>

                {/* Informações Centrais */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                      {prod.nome}
                    </span>
                    {isCombo && (
                      <span className="bg-purple-900/80 text-purple-200 border border-purple-500/40 text-[9px] font-black px-1.5 py-0.2 rounded">
                        COMBO
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-black text-xs sm:text-sm text-amber-400 font-mono">
                      {formatPrice(prod.preco)}
                    </span>
                    {isCombo && economia > 0 && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1 py-0.2 rounded border border-amber-500/40">
                        Eco {formatPrice(economia)}
                      </span>
                    )}
                    {prod.descricao && (!isCombo || itensCombo.length === 0) && (
                      <span className="text-[10px] text-slate-400 truncate hidden xs:inline">
                        • {prod.descricao}
                      </span>
                    )}
                  </div>

                  {/* Variações de Combo Rápidas */}
                  {combos.length > 0 && (
                    <div 
                      className="flex flex-wrap gap-1 mt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {combos.map((combo, cIdx) => (
                        <button
                          key={combo.id || cIdx}
                          type="button"
                          onClick={() => onAddToCart({
                            ...prod,
                            cart_id: `${prod.id}_combo_${combo.id || cIdx}`,
                            nome: `${prod.nome} (${combo.titulo || `${combo.quantidade}x`})`,
                            preco: parseFloat(combo.preco),
                            preco_custo: parseFloat(combo.preco_custo || 0),
                            quantidade_unidades: combo.quantidade || 1,
                            combo_info: combo
                          })}
                          className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded text-[9px] font-black transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                        >
                          <span>🎁 {combo.titulo || `${combo.quantidade}x`}:</span>
                          <span className="font-mono">{formatPrice(combo.preco)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stepper ou Botão de Adição no lado direito */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {qtyInCart > 0 ? (
                    <div className="flex items-center bg-amber-500 text-slate-950 rounded-xl p-0.5 shadow-md">
                      <button
                        type="button"
                        onClick={(e) => handleDecrement(e, prod)}
                        className="w-7 h-7 flex items-center justify-center font-black hover:bg-amber-600 rounded-lg active:scale-90"
                        title="Diminuir"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-mono font-black text-xs px-2 select-none">
                        {qtyInCart}x
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleIncrement(e, prod)}
                        className="w-7 h-7 flex items-center justify-center font-black hover:bg-amber-600 rounded-lg active:scale-90"
                        title="Aumentar"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddToCart(prod)}
                      className="w-8 h-8 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 flex items-center justify-center transition-colors active:scale-95 shadow"
                      title="Adicionar ao pedido"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
