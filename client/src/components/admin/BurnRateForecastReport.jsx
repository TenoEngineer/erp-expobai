import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Package, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  ArrowUpRight,
  TrendingUp,
  Sliders
} from 'lucide-react';
import { getPrevisaoEsgotamento } from '../../services/api';

export default function BurnRateForecastReport({ config }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [estoqueInput, setEstoqueInput] = useState({}); // { [produtoId]: number }

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getPrevisaoEsgotamento();
      setData(res);

      // Preenche estoques iniciais sugeridos se não houver preenchimento
      if (res?.produtos) {
        const initial = {};
        res.produtos.forEach(p => {
          // Estoque padrão sugerido para demonstração = 1.5x a sugestão mínima
          initial[p.id] = Math.max(20, Math.round(p.sugestao_estoque_minimo_noite * 0.8));
        });
        setEstoqueInput(prev => ({ ...initial, ...prev }));
      }
    } catch (err) {
      console.error('Erro ao buscar previsão de esgotamento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEstoqueChange = (id, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setEstoqueInput(prev => ({ ...prev, [id]: num }));
  };

  const produtos = (data?.produtos || []).map(p => {
    const estoqueAtual = estoqueInput[p.id] !== undefined ? estoqueInput[p.id] : p.sugestao_estoque_minimo_noite;
    const velocidadeHora = p.velocidade_queima_pico_hora > 0 ? p.velocidade_queima_pico_hora : 1;
    const horasRestantes = Number((estoqueAtual / velocidadeHora).toFixed(1));

    let status = 'seguro';
    let statusLabel = 'Estoque Confortável';
    if (horasRestantes <= 2) {
      status = 'critico';
      statusLabel = 'Risco Iminente de Sold Out';
    } else if (horasRestantes <= 4) {
      status = 'alerta';
      statusLabel = 'Atenção: Reabastecer';
    }

    // Calcula horário previsto de término (a partir de agora)
    const now = new Date();
    const previsto = new Date(now.getTime() + horasRestantes * 3600 * 1000);
    const previstoFmt = previsto.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return {
      ...p,
      estoque_atual: estoqueAtual,
      horas_restantes: horasRestantes,
      horario_previsto: previstoFmt,
      status,
      statusLabel
    };
  });

  const criticosCount = produtos.filter(p => p.status === 'critico').length;
  const alertaCount = produtos.filter(p => p.status === 'alerta').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              Velocidade de Queima &amp; Previsão de Esgotamento
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                Stockout Prevention
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Cadência de consumo por hora nos horários nobres de show e alarme de esgotamento prematuro.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all self-start sm:self-auto"
          title="Recalcular queima"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-sm font-semibold">Cruzando histórico de consumo e calculando ritmo de queima...</p>
        </div>
      ) : (
        <>
          {/* Alertas Rápidos de Estoque Crítico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border ${
              criticosCount > 0 ? 'bg-rose-950/40 border-rose-500/50 text-rose-200' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">Itens em Risco Crítico</span>
                <AlertTriangle className={`w-5 h-5 ${criticosCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-2">
                {criticosCount} produto(s)
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Esgotam em menos de 2 horas no ritmo de pico
              </p>
            </div>

            <div className={`p-4 rounded-2xl border ${
              alertaCount > 0 ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">Atenção para Reposição</span>
                <Clock className={`w-5 h-5 ${alertaCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-2">
                {alertaCount} produto(s)
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Autonomia entre 2 e 4 horas restantes
              </p>
            </div>

            <div className="p-4 rounded-2xl border bg-slate-900 border-slate-800 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">Produtos Monitorados</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-2 text-white">
                {produtos.length} SKUs ativos
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Atualização em tempo real por venda
              </p>
            </div>
          </div>

          {/* Tabela de Produtos, Velocidade de Queima e Runway */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-rose-400" />
                  Painel de Queima e Previsão de Esgotamento
                </h3>
                <p className="text-xs text-slate-400">
                  Edite o campo "Estoque Atual" para simular exatamente quando o produto vai acabar.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4">Consumo Pico</th>
                    <th className="py-3 px-4 w-32">Estoque no Balcão</th>
                    <th className="py-3 px-4">Autonomia (Runway)</th>
                    <th className="py-3 px-4">Previsão Sold Out</th>
                    <th className="py-3 px-4">Status de Risco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {produtos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-black text-white text-sm">{p.nome}</div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{p.categoria}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-amber-400 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-rose-500" />
                          <span>{p.velocidade_queima_pico_hora} un/hora</span>
                        </div>
                        <span className="text-[10px] text-slate-400">no show (20h-02h)</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-750 rounded-xl px-2.5 py-1">
                          <input
                            type="number"
                            min="0"
                            value={p.estoque_atual}
                            onChange={(e) => handleEstoqueChange(p.id, e.target.value)}
                            className="w-16 bg-transparent text-white font-black text-sm outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-bold uppercase">un</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className={`font-black text-sm ${
                          p.status === 'critico' ? 'text-rose-400' : p.status === 'alerta' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {p.horas_restantes} horas
                        </div>
                        <span className="text-[10px] text-slate-400">em ritmo contínuo</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Esgota às {p.horario_previsto}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.status === 'critico'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : p.status === 'alerta'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {p.status === 'critico' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                          {p.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
