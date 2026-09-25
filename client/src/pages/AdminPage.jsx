import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Tags, 
  BarChart3, 
  Sliders, 
  RefreshCw 
} from 'lucide-react';
import ProductManagement from '../components/admin/ProductManagement';
import CategoryManagement from '../components/admin/CategoryManagement';
import SalesReport from '../components/admin/SalesReport';
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
      
      {/* Sub-navegação do Admin */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('produtos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeSubTab === 'produtos'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950 border border-emerald-400/40'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produtos & Preços</span>
        </button>

        <button
          onClick={() => setActiveSubTab('categorias')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeSubTab === 'categorias'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 border border-amber-400/40'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Tags className="w-4 h-4" />
          <span>Categorias</span>
        </button>

        <button
          onClick={() => setActiveSubTab('relatorios')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeSubTab === 'relatorios'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950 border border-cyan-400/40'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Fechamento de Caixa</span>
        </button>

        <button
          onClick={() => setActiveSubTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeSubTab === 'config'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-950 border border-purple-400/40'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Configurações</span>
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

          {activeSubTab === 'categorias' && (
            <CategoryManagement
              categories={categories}
              onRefresh={loadAdminData}
            />
          )}

          {activeSubTab === 'relatorios' && (
            <SalesReport config={config} />
          )}

          {activeSubTab === 'config' && (
            <ConfigManagement
              config={config}
              onRefresh={onRefreshConfig}
            />
          )}
        </>
      )}

    </div>
  );
}
