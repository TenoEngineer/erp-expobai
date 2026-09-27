import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Tags, 
  Sliders, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import ProductManagement from '../components/admin/ProductManagement';
import CategoryManagement from '../components/admin/CategoryManagement';
import ComboManagement from '../components/admin/ComboManagement';
import ConfigManagement from '../components/admin/ConfigManagement';
import { getCategoriasAdmin, getProdutosAdmin } from '../services/api';

export default function AdminPage({ config, onRefreshConfig }) {
  const [activeSubTab, setActiveSubTab] = useState('produtos'); // 'produtos', 'categorias', 'relatorios', 'config'
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        getCategoriasAdmin(),
        getProdutosAdmin()
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Erro ao carregar dados admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Sub-navegação do Admin com Rolagem Fluida no Mobile */}
      <div 
        className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto touch-pan-x flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          onClick={() => setActiveSubTab('produtos')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeSubTab === 'produtos'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950 border border-emerald-400/40'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produtos & Preços</span>
        </button>

        <button
          onClick={() => setActiveSubTab('combos')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeSubTab === 'combos'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950 border border-purple-400/40'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Combos 🎁</span>
        </button>

        <button
          onClick={() => setActiveSubTab('categorias')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeSubTab === 'categorias'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 border border-amber-400/40'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Tags className="w-4 h-4" />
          <span>Categorias</span>
        </button>

        <button
          onClick={() => setActiveSubTab('config')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeSubTab === 'config'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950 border border-indigo-400/40'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Sistema & Impressora</span>
        </button>
      </div>

      {/* Conteúdo da Sub-Aba Ativa */}
      {loading && products.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
          <p>Carregando painel de gestão...</p>
        </div>
      ) : (
        <>
          {activeSubTab === 'produtos' && (
            <ProductManagement
              products={products}
              categories={categories}
              onRefresh={loadAdminData}
            />
          )}

          {activeSubTab === 'combos' && (
            <ComboManagement
              products={products}
              categories={categories}
              onRefresh={loadAdminData}
            />
          )}

          {activeSubTab === 'categorias' && (
            <CategoryManagement
              categories={categories}
              onRefresh={loadAdminData}
            />
          )}

          {activeSubTab === 'config' && (
            <ConfigManagement
              config={config}
              onRefresh={onRefreshConfig}
              onNavigateToCombos={() => setActiveSubTab('combos')}
            />
          )}
        </>
      )}

    </div>
  );
}
