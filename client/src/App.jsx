import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PosPage from './pages/PosPage';
import AdminPage from './pages/AdminPage';
import { getConfig } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' ou 'admin'
  const [config, setConfig] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  const fetchConfig = async () => {
    try {
      const data = await getConfig();
      setConfig(data);
    } catch (err) {
      console.warn('Erro ao carregar configurações (usando padrões):', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Barra de Navegação Superior */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        cartCount={cartCount}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'pos' ? (
          <PosPage
            config={config}
            onCartCountChange={setCartCount}
          />
        ) : (
          <AdminPage
            config={config}
            onRefreshConfig={fetchConfig}
          />
        )}
      </main>

      {/* Footer simples de rodapé */}
      <footer className="border-t border-slate-900 py-3 px-4 text-center text-xs text-slate-500 bg-slate-950">
        <p>
          🌾 <b>Tenda dos Müller</b> &bull; Expobai 2026 &bull; Frente de Caixa Ágil &bull; <i>"Onde a cidade é + agro"</i>
        </p>
      </footer>
    </div>
  );
}
