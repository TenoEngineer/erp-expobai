import React, { useState } from 'react';
import { Search, Plus, Utensils, Sparkles } from 'lucide-react';

export default function ProductGrid({ products = [], onAddToCart, cartItems = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

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

  const getItemQuantityInCart = (productId) => {
    const found = cartItems.find(item => item.id === productId || item.produto_id === productId);
    return found ? found.quantidade : 0;
  };

  const formatPrice = (value) => {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Campo de Busca Rápida */}
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

      {/* Grid de Produtos */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-center">
          <Utensils className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-300 font-semibold text-base">Nenhum produto encontrado</p>
          <p className="text-slate-500 text-xs mt-1">Tente outra busca ou selecione outra categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map((prod) => {
            const qtyInCart = getItemQuantityInCart(prod.id);
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

                {/* Imagem do Produto */}
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 mb-2.5 relative flex items-center justify-center border border-slate-700/50">
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
  );
}
