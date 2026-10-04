import React, { useState } from 'react';
import { DollarSign, User, FileText, Check, X, Sparkles, AlertCircle } from 'lucide-react';
import { abrirCaixa } from '../../services/api';

export default function AbrirCaixaModal({ isOpen, onClose, onSuccess, currentUser }) {
  const [valorAbertura, setValorAbertura] = useState('100.00');
  const [operador, setOperador] = useState(currentUser?.nome || 'Operador Caixa');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const presets = [0, 50, 100, 150, 200, 300];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const val = parseFloat(valorAbertura);
    if (isNaN(val) || val < 0) {
      setError('Por favor, informe um valor válido para o fundo de troco.');
      return;
    }

    try {
      setLoading(true);
      const res = await abrirCaixa({
        operador: operador.trim() || 'Operador Caixa',
        valor_abertura: val,
        observacoes: observacoes.trim()
      });

      if (onSuccess) {
        onSuccess(res?.sessao);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao abrir o caixa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-750 rounded-3xl max-w-md w-full p-6 shadow-2xl shadow-emerald-950/30 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-white text-base uppercase tracking-wider">
                Abertura de Caixa
              </h3>
              <p className="text-xs text-slate-400">
                Início de turno &amp; conferência de troco
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          {/* Fundo de Troco Inicial */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Fundo de Troco em Dinheiro (R$)</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Valor em gaveta</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorAbertura}
                onChange={(e) => setValorAbertura(e.target.value)}
                required
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-xl font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                placeholder="0.00"
              />
            </div>

            {/* Botões Rápidos de Troco */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setValorAbertura(preset.toFixed(2))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    parseFloat(valorAbertura) === preset
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
                  }`}
                >
                  {preset === 0 ? 'Sem Troco' : `R$ ${preset}`}
                </button>
              ))}
            </div>
          </div>

          {/* Nome do Operador */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Operador Responsável</span>
            </label>
            <input
              type="text"
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-emerald-500"
              placeholder="Ex: Heitor Müller"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Observações (Opcional)</span>
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              placeholder="Ex: Início do turno noite de sábado"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>{loading ? 'Abrindo...' : 'Abrir Caixa Agora'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
