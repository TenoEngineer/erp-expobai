import React, { useState } from 'react';
import { Search, Plus, Utensils, Sparkles } from 'lucide-react';

export default function ProductGrid({ products = [], onAddToCart, cartItems = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.nome.toLowerCase().includes(term) || (p.descricao && p.descricao.toLowerCase().includes(term));
  });

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

            return (
              <button
                key={prod.id}
                onClick={() => onAddToCart(prod)}
                className="group relative bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-amber-500/50 rounded-2xl p-2.5 sm:p-3 text-left transition-all duration-150 flex flex-col justify-between shadow-lg hover:shadow-amber-950/20 active:scale-[0.98] select-none overflow-hidden"
              >
                {/* Badge de quantidade no carrinho */}
                {qtyInCart > 0 && (
                  <div className="absolute top-2 right-2 z-10 bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 animate-pulse">
                    <span>{qtyInCart}x</span>
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
                    className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-950/80 to-slate-900 ${prod.foto_url ? 'hidden' : 'flex'}`}
                  >
                    <Utensils className="w-8 h-8 text-emerald-500/60" />
                  </div>
                </div>

                {/* Detalhes */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm leading-tight group-hover:text-amber-400 transition-colors line-clamp-1">
                      {prod.nome}
                    </h3>
                    {prod.descricao && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                        {prod.descricao}
                      </p>
                    )}
                  </div>

                  {/* Preço e Botão de Adicionar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                    <span className="font-black text-sm sm:text-base text-amber-400 font-mono tracking-tight">
                      {formatPrice(prod.preco)}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-600/20 group-hover:bg-emerald-600 text-emerald-400 group-hover:text-white flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
