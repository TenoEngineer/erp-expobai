import React, { useState, useEffect } from 'react';
import { ShoppingCart, Settings, Clock, Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, config, cartCount = 0 }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR'));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 sticky top-0 z-30 px-4 py-3 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Logo & Info */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 via-green-700 to-amber-600 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-500/30">
            <span className="text-2xl">🤠</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-emerald-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                EXPOBAI PDV
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                2026
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">
              {config?.nome_estande || 'Barraca Oficial Expobai'}
            </p>
          </div>
        </div>

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'pos'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/40 border border-emerald-500/40 scale-100'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Frente de Caixa</span>
            {cartCount > 0 && (
              <span className="ml-1 bg-amber-500 text-slate-950 text-xs px-1.5 py-0.2 rounded-full font-black">
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-900/40 border border-amber-500/40'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Gestão / Admin</span>
          </button>
        </div>

      </div>
    </header>
  );
}
