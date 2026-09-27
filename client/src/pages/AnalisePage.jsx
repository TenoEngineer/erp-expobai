import React, { useState } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  QrCode, 
  CreditCard, 
  Banknote,
  Sparkles
} from 'lucide-react';
import RateioPage from './RateioPage';
import PaymentAuditReport from '../components/admin/PaymentAuditReport';
import CostAnalysisReport from '../components/admin/CostAnalysisReport';

export default function AnalisePage({ config, initialSubTab = 'rateio' }) {
  const [activeTab, setActiveTab] = useState(initialSubTab); // 'rateio', 'conferencia', 'custos'

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 w-full">
      
      {/* Sub-navegação da Aba Análise com Rolagem Fluida no Mobile */}
      <div 
        className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto touch-pan-x flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          onClick={() => setActiveTab('rateio')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'rateio'
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-lg shadow-purple-950 border border-purple-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-amber-300" />
          <span>Rateio dos Sócios</span>
        </button>

        <button
          onClick={() => setActiveTab('conferencia')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'conferencia'
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-950 border border-emerald-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-300" />
          <span>Conferência de Pagamentos</span>
        </button>

        <button
          onClick={() => setActiveTab('custos')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'custos'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-950 border border-purple-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-purple-300" />
          <span>Análise de Custos & CMV</span>
        </button>
      </div>

      {/* Conteúdo da Sub-Aba Ativa */}
      {activeTab === 'rateio' && (
        <RateioPage />
      )}

      {activeTab === 'conferencia' && (
        <PaymentAuditReport config={config} initialForma="todos" />
      )}

      {activeTab === 'custos' && (
        <CostAnalysisReport config={config} />
      )}

    </div>
  );
}
