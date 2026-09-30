import React, { useState, useEffect } from 'react';
import { ShoppingCart, Settings, Clock, Sparkles, Users, Lock, TrendingUp } from 'lucide-react';
import Logo from './Logo';

export default function Navbar({ activeTab, setActiveTab, config, cartCount = 0 }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR'));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 sticky top-0 z-30 px-4 py-2.5 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Logo & Info */}
        <Logo 
          boothName={config?.nome_estande || config?.nome_sistema || 'ExpoERP'}
          subtitle={config?.nome_evento || 'ExpoERP'}
          size={44}
        />

        {/* Center: Live Clock & Quick Status */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* 1. PDV / Caixa */}
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
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

          {/* 2. Fechamento Caixa */}
          <button
            onClick={() => setActiveTab('fechamento')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'fechamento'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-900/40 border border-teal-400/50'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
            <span className="hidden sm:inline">Fechamento Caixa</span>
            <span className="inline sm:hidden">Caixa</span>
          </button>

          {/* 3. Análise & Rateio */}
          <button
            onClick={() => setActiveTab('analise')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'analise'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-lg shadow-purple-900/40 border border-purple-400/50'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300" />
            <span className="hidden sm:inline">Análise & Rateio</span>
            <span className="inline sm:hidden">Análise</span>
          </button>

          {/* 4. Configurações */}
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'configuracoes'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-900/40 border border-amber-500/40'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
            <span className="hidden sm:inline">Configurações</span>
            <span className="inline sm:hidden">Config</span>
          </button>
        </div>

      </div>
    </header>
  );
}
