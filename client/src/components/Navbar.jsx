import React, { useState, useEffect } from 'react';
import { ShoppingCart, Settings, Clock, Users, Lock, TrendingUp, ShieldCheck, LogOut, Store } from 'lucide-react';
import Logo from './Logo';

export default function Navbar({ activeTab, setActiveTab, config, cartCount = 0, currentUser, onLogout }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR'));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isCaixa = currentUser?.role === 'caixa';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const isSuperAdmin = currentUser?.role === 'superadmin';

  return (
    <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 sticky top-0 z-30 px-3 sm:px-4 py-2.5 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Logo & Info */}
        <Logo 
          boothName={currentUser?.tenant_nome || config?.nome_estande || config?.nome_sistema || 'ExpoERP'}
          subtitle={config?.nome_evento || 'ExpoERP'}
          size={42}
        />

        {/* Center: Live Clock & Quick Status (Desktop) */}
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">Online</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-200">{time}</span>
          </div>
        </div>

        {/* Navigation Tabs (RBAC Restrito) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* 1. PDV / Caixa (Sempre visível para todos) */}
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/40 border border-emerald-500/40'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">PDV / Caixa</span>
            <span className="inline sm:hidden">PDV</span>
            {cartCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-black">
                {cartCount}
              </span>
            )}
          </button>

          {/* 2. Fechamento Caixa (Apenas Admin e SuperAdmin) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('fechamento')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'fechamento'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-900/40 border border-teal-400/50'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
              <span className="hidden sm:inline">Fechamento</span>
              <span className="inline sm:hidden">Caixa</span>
            </button>
          )}

          {/* 3. Análise & Rateio (Apenas Admin e SuperAdmin) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('analise')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'analise'
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-lg shadow-purple-900/40 border border-purple-400/50'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300" />
              <span className="hidden sm:inline">Análise</span>
              <span className="inline sm:hidden">Gráficos</span>
            </button>
          )}

          {/* 4. Configurações (Apenas Admin e SuperAdmin) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('configuracoes')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'configuracoes'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-900/40 border border-amber-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
              <span className="hidden md:inline">Config</span>
            </button>
          )}

          {/* 5. Tendas (Exclusivo Super Admin) */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('tenants')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'tenants'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-900/40 border border-blue-400/50'
                  : 'bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60'
              }`}
              title="Painel Mestre de Gestão de Tendas (Super Admin)"
            >
              <Store className="w-3.5 h-3.5 text-blue-300" />
              <span className="hidden lg:inline">Tendas</span>
            </button>
          )}

          {/* Perfil & Logout */}
          <div className="flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-slate-800">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[11px] font-bold text-white truncate max-w-[110px]">
                {currentUser?.nome || 'Usuário'}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                isSuperAdmin ? 'text-amber-400' : isCaixa ? 'text-emerald-400' : 'text-blue-400'
              }`}>
                {isSuperAdmin ? '👑 Super Admin' : isCaixa ? '🧑‍💼 Caixa' : '⭐ Dono'}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-rose-950/70 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Sair do sistema (Logout seguro)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
