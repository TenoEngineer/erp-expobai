import React, { useState } from 'react';
import { Lock, DollarSign, AlertCircle, Check, X, Clock, HelpCircle, CheckCircle2 } from 'lucide-react';
import { fecharCaixa } from '../../services/api';

export default function FecharCaixaModal({ isOpen, onClose, onSuccess, caixaAtivo }) {
  const [valorContado, setValorContado] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !caixaAtivo) return null;

  const formatPrice = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totais = caixaAtivo?.totais || {};
  const valorAbertura = parseFloat(caixaAtivo?.valor_abertura) || 0;
  const vendasDinheiro = parseFloat(totais?.total_dinheiro) || 0;
  const saldoEsperado = parseFloat(totais?.saldo_esperado_gaveta) || (valorAbertura + vendasDinheiro);

  const contadoNum = valorContado !== '' ? parseFloat(valorContado) : null;
  const diferenca = contadoNum !== null ? Math.round((contadoNum - saldoEsperado) * 100) / 100 : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await fecharCaixa({
        valor_fechamento_dinheiro: contadoNum,
        observacoes: observacoes.trim()
      });

      if (onSuccess) {
        onSuccess(res?.resultado);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao fechar o caixa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-750 rounded-3xl max-w-lg w-full p-6 shadow-2xl shadow-emerald-950/30 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-white text-base uppercase tracking-wider">
                Fechamento de Caixa #{caixaAtivo.id}
              </h3>
              <p className="text-xs text-slate-400">
                Conferência física &amp; encerramento de turno
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

        {/* Resumo da Sessão */}
        <div className="my-4 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Operador do Turno:</span>
            <span className="font-bold text-white">{caixaAtivo.operador || 'Operador Caixa'}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Fundo de Troco Inicial:</span>
            <span className="font-mono text-white">{formatPrice(valorAbertura)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Vendas em Dinheiro (Espécie):</span>
            <span className="font-mono text-emerald-400">+{formatPrice(vendasDinheiro)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Vendas em PIX / Cartões:</span>
            <span className="font-mono text-blue-400">{formatPrice(totais.total_pix + totais.total_debito + totais.total_credito)}</span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between font-black text-sm text-white">
            <span>Saldo Esperado na Gaveta:</span>
            <span className="font-mono text-emerald-400">{formatPrice(saldoEsperado)}</span>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            * O saldo esperado em dinheiro é a soma do Fundo de Troco inicial + Vendas em Dinheiro.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Valor Físico Contado na Gaveta */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Dinheiro Físico Contado (R$)</span>
              <span className="text-[10px] text-amber-400 font-semibold">Envelope de Fechamento</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorContado}
                onChange={(e) => setValorContado(e.target.value)}
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-xl font-black text-white focus:outline-none focus:border-amber-500"
                placeholder={saldoEsperado.toFixed(2)}
              />
            </div>

            {/* Indicador de Diferença em Tempo Real */}
            {diferenca !== null && (
              <div className={`mt-2 p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                diferenca === 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : diferenca < 0
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <span>{diferenca === 0 ? '✓ Conferência Perfeita (Sem Quebra)' : diferenca < 0 ? '⚠️ Quebra de Caixa (Falta)' : 'ℹ️ Sobra de Dinheiro'}</span>
                <span className="font-mono text-sm">
                  {diferenca === 0 ? 'R$ 0,00' : `${diferenca > 0 ? '+' : ''}${formatPrice(diferenca)}`}
                </span>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Observações do Fechamento
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              placeholder="Ex: Tudo conferido e guardado no envelope"
            />
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            💡 <b>Atenção:</b> Ao fechar, o caixa ficará <b>fechado</b>. O sistema <b>não</b> abrirá outro caixa automaticamente. O próximo operador deverá abrir o turno informando o fundo de troco inicial.
          </div>

          {/* Botões */}
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
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950/50 transition-all disabled:opacity-50"
            >
              <Lock className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>{loading ? 'Encerrando...' : 'Confirmar e Fechar Caixa'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
