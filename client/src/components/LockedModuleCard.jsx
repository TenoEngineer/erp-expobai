import React from 'react';
import { Lock, Sparkles, CheckCircle2, MessageCircle, ShieldAlert } from 'lucide-react';
import { MODULOS_CATALOGO } from '../constants/modulos';

export default function LockedModuleCard({ moduloId, onContactSupport }) {
  const modulo = MODULOS_CATALOGO.find(m => m.id === moduloId) || {
    nome: 'Módulo Adicional',
    descricao: 'Este recurso faz parte dos módulos avançados do ExpoERP.',
    preco_base: 150.00,
    categoria: 'Recurso Avançado'
  };

  const formatPrice = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Olá! Gostaria de ativar o módulo "${modulo.nome}" no meu plano do ExpoERP.`);
    window.open(`https://wa.me/5567999999999?text=${text}`, '_blank');
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8 p-6 sm:p-10 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden text-center">
      {/* Luz ambiente de fundo */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Ícone com Cadeado */}
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-800 to-slate-900 border border-amber-500/40 flex items-center justify-center shadow-xl shadow-amber-950/40">
          <Lock className="w-10 h-10 text-amber-400" />
        </div>
        <span className="absolute -bottom-2 -right-2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow">
          Upgrade
        </span>
      </div>

      {/* Título & Badge */}
      <div className="space-y-2 mb-6">
        <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
          {modulo.categoria} &bull; Módulo Sob Demanda
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {modulo.nome}
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          {modulo.descricao}
        </p>
      </div>

      {/* Benefícios Inclusos no Módulo */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 mb-8 max-w-xl mx-auto text-left space-y-3">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
          O que você ganha com este módulo:
        </span>
        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Ativação instantânea para todos os dispositivos e caixas da sua tenda.</span>
        </div>
        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Relatórios em tempo real sem comprometer o fluxo de vendas do balcão.</span>
        </div>
        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Suporte operacional prioritário durante os dias da feira.</span>
        </div>
      </div>

      {/* Preço e Botão de Ação */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="text-center sm:text-left">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
            Investimento no Módulo:
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
            {formatPrice(modulo.preco_base)} <span className="text-xs text-slate-400 font-normal">/ feira</span>
          </span>
        </div>

        <button
          onClick={handleWhatsApp}
          className="h-12 px-6 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-[0.98] text-slate-950 font-black rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/60 cursor-pointer transition-all"
        >
          <MessageCircle className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          <span>Solicitar Ativação pelo WhatsApp</span>
        </button>
      </div>
    </div>
  );
}
