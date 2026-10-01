import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PosPage from './pages/PosPage';
import AdminPage from './pages/AdminPage';
import AnalisePage from './pages/AnalisePage';
import SuperAdminPage from './pages/SuperAdminPage';
import LoginPage from './pages/LoginPage';
import SalesReport from './components/admin/SalesReport';
import { getConfig, getMe } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('expoerp_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('pos'); // 'pos', 'fechamento', 'analise', 'configuracoes', 'tenants'
  const [config, setConfig] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem('expoerp_token');
    localStorage.removeItem('expoerp_user');
    setCurrentUser(null);
    setActiveTab('pos');
    setConfig(null);
  };

  const fetchConfig = async () => {
    try {
      const data = await getConfig();
      setConfig(data);
    } catch (err) {
      console.warn('Erro ao carregar configurações (usando padrões):', err);
    }
  };

  // Validação da sessão atual no backend
  useEffect(() => {
    if (currentUser) {
      getMe()
        .then((user) => {
          if (user) {
            setCurrentUser(user);
            localStorage.setItem('expoerp_user', JSON.stringify(user));
          }
        })
        .catch(() => {
          // Token inválido ou expirado
          handleLogout();
        });
      fetchConfig();
    }
  }, []);

  // Escuta evento global de logout disparado pelo interceptor da API (401)
  useEffect(() => {
    window.addEventListener('expoerp:logout', handleLogout);
    return () => window.removeEventListener('expoerp:logout', handleLogout);
  }, []);

  // Bloqueio Caixa Cego: se o usuário for operador de caixa, força activeTab para 'pos'
  useEffect(() => {
    if (currentUser?.role === 'caixa' && activeTab !== 'pos') {
      setActiveTab('pos');
    }
  }, [currentUser, activeTab]);

  // Se não estiver autenticado, exibe a tela de login
  if (!currentUser) {
    return (
      <LoginPage 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveTab('pos');
          fetchConfig();
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden w-full max-w-full">
      {/* Barra de Navegação Superior com RBAC */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        cartCount={cartCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col overflow-x-hidden w-full max-w-full">
        {activeTab === 'pos' ? (
          <PosPage
            config={config}
            onCartCountChange={setCartCount}
          />
        ) : activeTab === 'fechamento' && (currentUser.role === 'admin' || currentUser.role === 'superadmin') ? (
          <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full">
            <SalesReport 
              config={config}
              onNavigateToCustos={() => setActiveTab('analise')}
            />
          </div>
        ) : activeTab === 'analise' && (currentUser.role === 'admin' || currentUser.role === 'superadmin') ? (
          <AnalisePage config={config} />
        ) : activeTab === 'configuracoes' && (currentUser.role === 'admin' || currentUser.role === 'superadmin') ? (
          <AdminPage
            config={config}
            onRefreshConfig={fetchConfig}
          />
        ) : activeTab === 'tenants' && currentUser.role === 'superadmin' ? (
          <SuperAdminPage />
        ) : (
          <PosPage
            config={config}
            onCartCountChange={setCartCount}
          />
        )}
      </main>

      {/* Footer comercial de rodapé */}
      <footer className="border-t border-slate-900 py-3 px-4 text-center text-xs text-slate-500 bg-slate-950">
        <p>
          ⚡ <b>ExpoERP</b> &bull; Frente de Caixa &amp; Gestão para Feiras, Tendas e Eventos &bull; {currentUser?.tenant_nome ? `${currentUser.tenant_nome} • ` : ''}<i>Alta Performance</i>
        </p>
      </footer>
    </div>
  );
}
