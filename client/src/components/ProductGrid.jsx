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
  const [mobileViewMode, setMobileViewMode] = useState(() => {
    try {
      return localStorage.getItem('pos_mobile_view_mode') || 'list';
    } catch {
      return 'list';
    }
  });

  const handleSetMobileViewMode = (mode) => {
    setMobileViewMode(mode);
    try {
      localStorage.setItem('pos_mobile_view_mode', mode);
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
    return Number(value || 0).toLocaleString('pt-BR', {
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
    <>
      {/* ========================================================================= */}
      {/* MODO DESKTOP / NOTEBOOK: LAYOUT ORIGINAL COM FOTOS, CARDS COMPACTOS E GRID */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-col gap-4 flex-1 min-w-0">
        {/* Barra de Busca Desktop Original */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar produto (ex: espetinho, chopp, suco)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded-full"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Grid de Produtos Desktop com Fotos */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-center">
            <Utensils className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-slate-300 font-semibold text-base">Nenhum produto encontrado</p>
            <p className="text-slate-500 text-xs mt-1">Tente outra busca ou selecione outra categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                  className={`group relative border rounded-2xl p-2.5 sm:p-3 text-left transition-all duration-150 flex flex-col justify-between shadow-lg active:scale-[0.99] select-none cursor-pointer overflow-hidden ${
                    isCombo
                      ? 'bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-900 border-purple-500/40 hover:border-purple-400 hover:shadow-purple-950/40'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/70 hover:border-amber-500/50 hover:shadow-amber-950/20'
                  }`}
                >
                  {/* Badge de quantidade no carrinho */}
                  {qtyInCart > 0 && (
                    <div className="absolute top-2 right-2 z-10 bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 animate-pulse">
                      <span>{qtyInCart}x</span>
                    </div>
                  )}

                  {/* Badge de Combo */}
                  {isCombo && (
                    <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[9px] px-2 py-0.5 rounded-md shadow-md flex items-center gap-1 border border-purple-400/50">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      <span>COMBO</span>
                    </div>
                  )}

                  {/* Imagem do Produto Original */}
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 mb-2.5 relative flex items-center justify-center border border-slate-700/50">
                    {prod.foto_url ? (
                      <img
                        src={prod.foto_url}
                        alt={prod.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-full h-full flex items-center justify-center ${
                        isCombo ? 'bg-gradient-to-br from-purple-950/80 to-slate-900' : 'bg-gradient-to-br from-emerald-950/80 to-slate-900'
                      } ${prod.foto_url ? 'hidden' : 'flex'}`}
                    >
                      {isCombo ? (
                        <Sparkles className="w-8 h-8 text-amber-400" />
                      ) : (
                        <Utensils className="w-8 h-8 text-emerald-500/60" />
                      )}
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className={`font-bold text-sm leading-tight transition-colors line-clamp-1 ${
                        isCombo ? 'text-purple-100 group-hover:text-purple-300' : 'text-slate-100 group-hover:text-amber-400'
                      }`}>
                        {prod.nome}
                      </h3>
                      
                      {/* Pills de itens inclusos no combo */}
                      {isCombo && itensCombo.length > 0 && (
                        <div className="flex flex-wrap gap-1 my-1.5">
                          {itensCombo.map((it, idx) => (
                            <span
                              key={idx}
                              className="bg-purple-950/90 text-purple-200 border border-purple-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            >
                              <b className="text-amber-400">{it.quantidade}x</b> {it.nome}
                            </span>
                          ))}
                        </div>
                      )}

                      {prod.descricao && (!isCombo || itensCombo.length === 0) && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                          {prod.descricao}
                        </p>
                      )}
                    </div>

                    {/* Preço e Botão de Adicionar */}
                    <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                      <div>
                        {isCombo && somaAvulso > prod.preco ? (
                          <span className="text-[10px] text-slate-400 line-through font-mono block">
                            De: {formatPrice(somaAvulso)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block font-sans">
                            {isCombo ? 'Preço Combo' : 'Unitário'}
                          </span>
                        )}
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-black text-sm sm:text-base text-amber-400 font-mono tracking-tight block">
                            {formatPrice(prod.preco)}
                          </span>
                          {isCombo && economia > 0 && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/40">
                              Economiza {formatPrice(economia)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isCombo
                          ? 'bg-purple-600/30 group-hover:bg-purple-600 text-purple-300 group-hover:text-white'
                          : 'bg-emerald-600/20 group-hover:bg-emerald-600 text-emerald-400 group-hover:text-white'
                      }`}>
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Opções Rápidas de Combos com Preços Diferentes */}
                    {combos.length > 0 && (
                      <div 
                        className="mt-2 pt-2 border-t border-slate-700/40 flex flex-wrap gap-1"
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
                            className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded-lg text-[10px] font-black transition-all active:scale-95 flex items-center gap-1 shadow-sm"
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
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODO MOBILE: BOTÕES TOUCH GRANDES, SEM FOTOS, MODO LISTA / TECLAS PDV */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex flex-col gap-3 flex-1 min-w-0">
        {/* Barra de Busca Grande e Alternador de Modo Mobile */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 bg-slate-900 border-2 border-slate-700/80 rounded-2xl pl-12 pr-12 text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all shadow-inner font-bold"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs bg-slate-800 text-slate-300 hover:text-white px-3 py-1 rounded-xl font-bold"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Alternador de Modo Mobile (Lista Rápida / Teclas Grandes) */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 shrink-0 shadow-sm h-14">
            <button
              type="button"
              onClick={() => handleSetMobileViewMode('list')}
              className={`h-full px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                mobileViewMode === 'list'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Lista Rápida"
            >
              <List className="w-5 h-5" />
              <span className="hidden xs:inline">Lista</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetMobileViewMode('grid')}
              className={`h-full px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                mobileViewMode === 'grid'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Teclas Grandes"
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="hidden xs:inline">Teclas</span>
            </button>
          </div>
        </div>

        {/* Produtos Mobile */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-800 text-center">
            <Utensils className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-slate-200 font-extrabold text-base">Nenhum produto encontrado</p>
            <p className="text-slate-500 text-xs mt-1">Tente outra busca ou selecione outra categoria acima.</p>
          </div>
        ) : mobileViewMode === 'list' ? (
          /* MODO LISTA RÁPIDA MOBILE */
          <div className="flex flex-col gap-3">
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
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer select-none active:scale-[0.99] shadow-md ${
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
                        <h3 className="font-black text-lg sm:text-xl text-white leading-tight">
                          {prod.nome}
                        </h3>
                        {isCombo && (
                          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black px-2.5 py-0.5 rounded-md shadow-sm border border-purple-400/50 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>COMBO</span>
                          </span>
                        )}
                        {qtyInCart > 0 && (
                          <span className="bg-amber-500 text-slate-950 font-black text-xs sm:text-sm px-3 py-0.5 rounded-full shadow">
                            {qtyInCart}x no pedido
                          </span>
                        )}
                      </div>

                      {/* Itens do Combo */}
                      {isCombo && itensCombo.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {itensCombo.map((it, idx) => (
                            <span
                              key={idx}
                              className="bg-purple-950/90 text-purple-200 border border-purple-500/40 text-xs sm:text-sm font-bold px-2.5 py-1 rounded-xl"
                            >
                              <b className="text-amber-400 font-mono">{it.quantidade}x</b> {it.nome}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Preço em Destaque */}
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="font-black text-2xl sm:text-3xl text-amber-400 font-mono tracking-tight">
                          {formatPrice(prod.preco)}
                        </span>
                        {isCombo && economia > 0 && (
                          <span className="text-xs sm:text-sm bg-emerald-950/90 text-emerald-300 font-bold px-2.5 py-0.5 rounded-xl border border-emerald-500/40 font-mono">
                            Economiza {formatPrice(economia)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Controles de Toque Grandes para Polegar */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {qtyInCart > 0 ? (
                        <div className="flex items-center bg-slate-950 border-2 border-amber-500 rounded-2xl p-1 shadow-lg">
                          <button
                            type="button"
                            onClick={(e) => handleDecrement(e, prod)}
                            className="w-14 h-14 rounded-xl bg-slate-900 active:bg-amber-600 text-amber-400 active:text-slate-950 flex items-center justify-center transition-all border border-slate-700 active:scale-90"
                            title="Diminuir"
                          >
                            <Minus className="w-7 h-7 stroke-[3]" />
                          </button>
                          
                          <span className="min-w-[48px] sm:min-w-[52px] text-center font-mono font-black text-2xl sm:text-3xl text-amber-400 select-none">
                            {qtyInCart}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleIncrement(e, prod)}
                            className="w-14 h-14 rounded-xl bg-amber-500 active:bg-amber-400 text-slate-950 flex items-center justify-center transition-all shadow-md active:scale-90"
                            title="Aumentar"
                          >
                            <Plus className="w-7 h-7 stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddToCart(prod)}
                          className="h-14 px-5 sm:px-6 rounded-2xl bg-emerald-600/30 active:bg-emerald-500 text-emerald-300 active:text-slate-950 border-2 border-emerald-500/70 flex items-center gap-2 font-black text-base uppercase tracking-wider transition-all active:scale-95 shadow"
                          title="Adicionar ao pedido"
                        >
                          <Plus className="w-6 h-6 stroke-[3]" />
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
          /* MODO TECLAS GRANDES MOBILE (TECLADO PDV 2 COLUNAS SEM FOTO) */
          <div className="grid grid-cols-2 gap-2.5">
            {filteredProducts.map((prod) => {
              const cartItem = getCartItem(prod.id);
              const qtyInCart = cartItem ? cartItem.quantidade : 0;
              const combos = getProductCombos(prod);
              const isCombo = Boolean(prod.is_combo || prod.categoria_nome?.toLowerCase() === 'combos');

              return (
                <div
                  key={prod.id}
                  onClick={() => onAddToCart(prod)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between min-h-[160px] cursor-pointer select-none active:scale-[0.98] shadow-md ${
                    qtyInCart > 0
                      ? 'bg-slate-800 border-amber-500 shadow-xl shadow-amber-950/40'
                      : isCombo
                        ? 'bg-purple-950/30 border-purple-500/50 hover:border-purple-400'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      {isCombo ? (
                        <span className="bg-purple-900/80 text-purple-200 border border-purple-400/40 text-xs font-black px-2 py-0.5 rounded-lg">
                          COMBO
                        </span>
                      ) : <span />}
                      {qtyInCart > 0 && (
                        <span className="bg-amber-500 text-slate-950 font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-full shadow">
                          {qtyInCart}x
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-base sm:text-lg text-slate-100 leading-snug line-clamp-2">
                      {prod.nome}
                    </h3>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-1.5">
                    <span className="font-black text-lg sm:text-xl text-amber-400 font-mono tracking-tight">
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
                          className="w-10 h-10 rounded-lg bg-slate-900 active:bg-amber-600 text-amber-400 active:text-slate-950 flex items-center justify-center active:scale-90 font-black"
                        >
                          <Minus className="w-5 h-5 stroke-[3]" />
                        </button>
                        <span className="font-mono font-black text-base px-2 text-amber-400">
                          {qtyInCart}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleIncrement(e, prod)}
                          className="w-10 h-10 rounded-lg bg-amber-500 active:bg-amber-400 text-slate-950 flex items-center justify-center active:scale-90 font-black"
                        >
                          <Plus className="w-5 h-5 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 flex items-center justify-center font-black shrink-0">
                        <Plus className="w-6 h-6 stroke-[3]" />
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
    </>
  );
}
