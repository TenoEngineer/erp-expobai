import React, { useState } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Lock, 
  ShoppingBag, 
  Zap, 
  CreditCard, 
  Flame, 
  ShieldAlert 
} from 'lucide-react';
import RateioPage from './RateioPage';
import PaymentAuditReport from '../components/admin/PaymentAuditReport';
import CostAnalysisReport from '../components/admin/CostAnalysisReport';
import HourlyAnalysisReport from '../components/admin/HourlyAnalysisReport';
import BasketAnalyticsReport from '../components/admin/BasketAnalyticsReport';
import CashierThroughputReport from '../components/admin/CashierThroughputReport';
import CardFeeLeakageReport from '../components/admin/CardFeeLeakageReport';
import BurnRateForecastReport from '../components/admin/BurnRateForecastReport';
import LossPreventionAuditReport from '../components/admin/LossPreventionAuditReport';
import LockedModuleCard from '../components/LockedModuleCard';
import { isModuleEnabled } from '../constants/modulos';

export default function AnalisePage({ config, currentUser, initialSubTab = 'horarios' }) {
  const [activeTab, setActiveTab] = useState(initialSubTab);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const modulos = currentUser?.modulos || currentUser?.tenant_modulos || [];

  const hasHorarios = isSuperAdmin || isModuleEnabled(modulos, 'mod_bi_horarios');
  const hasRateio = isSuperAdmin || isModuleEnabled(modulos, 'mod_rateio_socios');
  const hasCustos = isSuperAdmin || isModuleEnabled(modulos, 'mod_custos_cmv');
  const hasConferencia = isSuperAdmin || isModuleEnabled(modulos, 'mod_custos_cmv') || isModuleEnabled(modulos, 'mod_rateio_socios');

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 w-full">
      
      {/* Sub-navegação da Aba Análise com Rolagem Fluida no Mobile */}
      <div 
        className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto touch-pan-x flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* 1. Vendas por Horário & Dias (BI) */}
        <button
          onClick={() => setActiveTab('horarios')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'horarios'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-950 border border-amber-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Clock className={`w-4 h-4 ${activeTab === 'horarios' ? 'text-slate-950 stroke-[2.5]' : 'text-amber-400'}`} />
          <span>Vendas por Horário & Dias</span>
          {!hasHorarios && <Lock className="w-3 h-3 text-amber-400 ml-0.5" />}
        </button>

        {/* 2. Análise SKU & Cross-Selling (BI) */}
        <button
          onClick={() => setActiveTab('cesta')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'cesta'
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-black shadow-lg shadow-indigo-950 border border-indigo-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <ShoppingBag className={`w-4 h-4 ${activeTab === 'cesta' ? 'text-white stroke-[2.5]' : 'text-indigo-400'}`} />
          <span>Análise SKU & Cross-Selling</span>
          {!hasHorarios && <Lock className="w-3 h-3 text-amber-400 ml-0.5" />}
        </button>

        {/* 3. Velocidade & Vazão do Caixa (BI) */}
        <button
          onClick={() => setActiveTab('vazao')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'vazao'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black shadow-lg shadow-amber-950 border border-amber-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Zap className={`w-4 h-4 ${activeTab === 'vazao' ? 'text-slate-950 stroke-[2.5]' : 'text-yellow-400'}`} />
          <span>Vazão do Caixa</span>
          {!hasHorarios && <Lock className="w-3 h-3 text-amber-400 ml-0.5" />}
        </button>

        {/* 4. Previsão de Esgotamento & Queima (BI) */}
        <button
          onClick={() => setActiveTab('esgotamento')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'esgotamento'
              ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white font-black shadow-lg shadow-rose-950 border border-rose-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Flame className={`w-4 h-4 ${activeTab === 'esgotamento' ? 'text-white stroke-[2.5]' : 'text-rose-400'}`} />
          <span>Ritmo de Queima</span>
          {!hasHorarios && <Lock className="w-3 h-3 text-amber-400 ml-0.5" />}
        </button>

        {/* 5. Dreno de Taxas de Cartão & Economia PIX (Custos) */}
        <button
          onClick={() => setActiveTab('dreno_taxas')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'dreno_taxas'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black shadow-lg shadow-emerald-950 border border-emerald-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <CreditCard className={`w-4 h-4 ${activeTab === 'dreno_taxas' ? 'text-white stroke-[2.5]' : 'text-emerald-400'}`} />
          <span>Dreno de Taxas & PIX</span>
          {!hasCustos && <Lock className="w-3 h-3 text-amber-400 ml-0.5" />}
        </button>

        {/* 6. Análise de Custos & CMV (Custos) */}
        <button
          onClick={() => setActiveTab('custos')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'custos'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-950 border border-purple-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-purple-300" />
          <span>Custos & CMV Real</span>
          {!hasCustos && <Lock className="w-3 h-3 text-amber-400 ml-0.5" />}
        </button>

        {/* 7. Auditoria de Cancelamentos & Perdas (Custos) */}
        <button
          onClick={() => setActiveTab('auditoria_perdas')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'auditoria_perdas'
              ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white font-black shadow-lg shadow-red-950 border border-red-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <ShieldAlert className={`w-4 h-4 ${activeTab === 'auditoria_perdas' ? 'text-white stroke-[2.5]' : 'text-rose-400'}`} />
          <span>Auditoria & Perdas</span>
          {!hasCustos && <Lock className="w-3 h-3 text-amber-400 ml-0.5" />}
        </button>

        {/* 8. Conferência de Pagamentos */}
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
          {!hasConferencia && <Lock className="w-3 h-3 text-amber-400 ml-0.5" />}
        </button>

        {/* 9. Rateio dos Sócios */}
        <button
          onClick={() => setActiveTab('rateio')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
            activeTab === 'rateio'
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-lg shadow-purple-950 border border-purple-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-purple-300" />
          <span>Rateio dos Sócios</span>
          {!hasRateio && <Lock className="w-3 h-3 text-amber-400 ml-0.5" />}
        </button>
      </div>

      {/* Conteúdo com Gating Modular */}
      {activeTab === 'horarios' && (
        hasHorarios ? (
          <HourlyAnalysisReport config={config} />
        ) : (
          <LockedModuleCard moduloId="mod_bi_horarios" />
        )
      )}

      {activeTab === 'cesta' && (
        hasHorarios ? (
          <BasketAnalyticsReport config={config} />
        ) : (
          <LockedModuleCard moduloId="mod_bi_horarios" />
        )
      )}

      {activeTab === 'vazao' && (
        hasHorarios ? (
          <CashierThroughputReport config={config} />
        ) : (
          <LockedModuleCard moduloId="mod_bi_horarios" />
        )
      )}

      {activeTab === 'esgotamento' && (
        hasHorarios ? (
          <BurnRateForecastReport config={config} />
        ) : (
          <LockedModuleCard moduloId="mod_bi_horarios" />
        )
      )}

      {activeTab === 'dreno_taxas' && (
        hasCustos ? (
          <CardFeeLeakageReport config={config} />
        ) : (
          <LockedModuleCard moduloId="mod_custos_cmv" />
        )
      )}

      {activeTab === 'custos' && (
        hasCustos ? (
          <CostAnalysisReport config={config} />
        ) : (
          <LockedModuleCard moduloId="mod_custos_cmv" />
        )
      )}

      {activeTab === 'auditoria_perdas' && (
        hasCustos ? (
          <LossPreventionAuditReport config={config} />
        ) : (
          <LockedModuleCard moduloId="mod_custos_cmv" />
        )
      )}

      {activeTab === 'conferencia' && (
        hasConferencia ? (
          <PaymentAuditReport config={config} initialForma="todos" />
        ) : (
          <LockedModuleCard moduloId="mod_custos_cmv" />
        )
      )}

      {activeTab === 'rateio' && (
        hasRateio ? (
          <RateioPage />
        ) : (
          <LockedModuleCard moduloId="mod_rateio_socios" />
        )
      )}

    </div>
  );
}
