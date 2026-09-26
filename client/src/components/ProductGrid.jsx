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
      return localStorage.getItem('pos_view_mode') || 'list';
    } catch {
      return 'list';
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
      {/* Barra de Busca Grande e Alternador de Visualização */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar produto (espetinho, chopp, refri)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border-2 border-slate-700/80 rounded-2xl pl-11 pr-10 py-3 text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-full font-bold"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Alternador de Modo (Lista Rápida / Teclas Grandes) */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 shrink-0 shadow-sm h-12">
          <button
            type="button"
            onClick={() => handleSetViewMode('list')}
            className={`h-full px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Visualização em Lista Rápida (Foco em velocidade)"
          >
            <List className="w-4 h-4" />
            <span className="hidden xs:inline">Lista</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode('grid')}
            className={`h-full px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 ${
              viewMode === 'grid'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Visualização em Teclas Grandes (Teclado PDV)"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden xs:inline">Teclas</span>
          </button>
        </div>
      </div>

      {/* Se não houver produtos */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-800 text-center">
          <Utensils className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-200 font-extrabold text-base">Nenhum produto encontrado</p>
          <p className="text-slate-500 text-sm mt-1">Tente outra busca ou selecione outra categoria acima.</p>
        </div>
      ) : viewMode === 'list' ? (
        /* ========================================================================= */
        /* MODO LISTA RÁPIDA (PADRÃO MOBILE): SEM FOTOS, LETRAS GRANDES, BOTÕES GIGANTES */
        /* ========================================================================= */
        <div className="flex flex-col gap-2.5">
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
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer select-none active:scale-[0.99] shadow-md ${
                  qtyInCart > 0
                    ? 'bg-gradient-to-r from-amber-950/40 via-slate-800 to-slate-800 border-amber-500 shadow-xl shadow-amber-950/40'
                    : isCombo
                      ? 'bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border-purple-500/50 hover:border-purple-400'
                      : 'bg-slate-900/95 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  
                  {/* Informações: Nome Grande e Preço Destacado */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-base sm:text-lg text-white leading-tight">
                        {prod.nome}
                      </h3>
                      {isCombo && (
                        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md shadow-sm border border-purple-400/50 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>COMBO</span>
                        </span>
                      )}
                      {qtyInCart > 0 && (
                        <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full shadow">
                          {qtyInCart}x no pedido
                        </span>
                      )}
                    </div>

                    {/* Descrição / Itens inclusos */}
                    {isCombo && itensCombo.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {itensCombo.map((it, idx) => (
                          <span
                            key={idx}
                            className="bg-purple-950/90 text-purple-200 border border-purple-500/40 text-xs font-bold px-2 py-0.5 rounded-lg"
                          >
                            <b className="text-amber-400 font-mono">{it.quantidade}x</b> {it.nome}
                          </span>
                        ))}
                      </div>
                    ) : prod.descricao ? (
                      <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-1 font-normal">
                        {prod.descricao}
                      </p>
                    ) : null}

                    {/* Preço em Destaque */}
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="font-black text-xl sm:text-2xl text-amber-400 font-mono tracking-tight">
                        {formatPrice(prod.preco)}
                      </span>
                      {isCombo && economia > 0 && (
                        <span className="text-xs bg-emerald-950/90 text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-emerald-500/40 font-mono">
                          Economiza {formatPrice(economia)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controles de Toque Grandes (Touch-Friendly para Polegar) */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {qtyInCart > 0 ? (
                      <div className="flex items-center bg-slate-950 border-2 border-amber-500 rounded-2xl p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={(e) => handleDecrement(e, prod)}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-900 active:bg-amber-600 text-amber-400 active:text-slate-950 flex items-center justify-center transition-all border border-slate-700 active:scale-90"
                          title="Diminuir"
                        >
                          <Minus className="w-6 h-6 stroke-[3]" />
                        </button>
                        
                        <span className="min-w-[44px] sm:min-w-[50px] text-center font-mono font-black text-2xl sm:text-3xl text-amber-400 select-none">
                          {qtyInCart}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleIncrement(e, prod)}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-amber-500 active:bg-amber-400 text-slate-950 flex items-center justify-center transition-all shadow-md active:scale-90"
                          title="Aumentar"
                        >
                          <Plus className="w-6 h-6 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddToCart(prod)}
                        className="h-12 sm:h-14 px-4 sm:px-5 rounded-2xl bg-emerald-600/25 active:bg-emerald-500 text-emerald-300 active:text-slate-950 border-2 border-emerald-500/60 flex items-center gap-2 font-black text-sm sm:text-base uppercase tracking-wider transition-all active:scale-95 shadow"
                        title="Adicionar ao pedido"
                      >
                        <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                        <span>Adicionar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Variações de Combo / Preços Rápidos em Botões Grandes */}
                {combos.length > 0 && (
                  <div 
                    className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-2"
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
                        className="py-2.5 px-3.5 bg-amber-500/15 active:bg-amber-500 text-amber-300 active:text-slate-950 border-2 border-amber-500/40 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 flex items-center gap-1.5 shadow"
                      >
                        <span>🎁 {combo.titulo || `${combo.quantidade}x`}:</span>
                        <span className="font-mono text-white">{formatPrice(combo.preco)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================================= */
        /* MODO TECLAS GRANDES (TECLADO PDV 2 COLUNAS): SEM FOTOS, TOQUE RÁPIDO */
        /* ========================================================================= */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {filteredProducts.map((prod) => {
            const cartItem = getCartItem(prod.id);
            const qtyInCart = cartItem ? cartItem.quantidade : 0;
            const combos = getProductCombos(prod);
            const isCombo = Boolean(prod.is_combo || prod.categoria_nome?.toLowerCase() === 'combos');

            return (
              <div
                key={prod.id}
                onClick={() => onAddToCart(prod)}
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between min-h-[140px] cursor-pointer select-none active:scale-[0.98] shadow-md ${
                  qtyInCart > 0
                    ? 'bg-slate-800 border-amber-500 shadow-xl shadow-amber-950/40'
                    : isCombo
                      ? 'bg-purple-950/30 border-purple-500/50 hover:border-purple-400'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    {isCombo ? (
                      <span className="bg-purple-900/80 text-purple-200 border border-purple-400/40 text-[9px] font-black px-1.5 py-0.5 rounded">
                        COMBO
                      </span>
                    ) : <span />}
                    {qtyInCart > 0 && (
                      <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full shadow">
                        {qtyInCart}x
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-sm sm:text-base text-slate-100 leading-snug line-clamp-2">
                    {prod.nome}
                  </h3>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between gap-1">
                  <span className="font-black text-base sm:text-lg text-amber-400 font-mono tracking-tight">
                    {formatPrice(prod.preco)}
                  </span>

                  {qtyInCart > 0 ? (
                    <div 
                      className="flex items-center bg-slate-950 border border-amber-500 rounded-xl p-0.5 shadow shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleDecrement(e, prod)}
                        className="w-8 h-8 rounded-lg bg-slate-900 active:bg-amber-600 text-amber-400 active:text-slate-950 flex items-center justify-center active:scale-90 font-black"
                      >
                        <Minus className="w-4 h-4 stroke-[3]" />
                      </button>
                      <span className="font-mono font-black text-sm px-1.5 text-amber-400">
                        {qtyInCart}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleIncrement(e, prod)}
                        className="w-8 h-8 rounded-lg bg-amber-500 active:bg-amber-400 text-slate-950 flex items-center justify-center active:scale-90 font-black"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 flex items-center justify-center font-black shrink-0">
                      <Plus className="w-5 h-5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Combos Rápidos no modo grade */}
                {combos.length > 0 && (
                  <div className="mt-2 pt-1 border-t border-slate-800/60 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
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
                        className="px-2 py-1 bg-amber-500/20 active:bg-amber-500 text-amber-300 active:text-slate-950 border border-amber-500/40 rounded-lg text-[10px] font-black"
                      >
                        {combo.titulo || `${combo.quantidade}x`} ({formatPrice(combo.preco)})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
