import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Clock, 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Flame, 
  RefreshCw,
  Info
} from 'lucide-react';
import { getVazaoCaixa } from '../../services/api';

export default function CashierThroughputReport({ config }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('todos');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getVazaoCaixa({ periodo });
      setData(res);
    } catch (err) {
      console.error('Erro ao buscar vazão do caixa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodo]);

  const ind = data?.indicadores || {};
  const diagnostico = data?.diagnostico_fila || {};
  const rankingHoras = data?.ranking_horas || [];

  return (
    <div className="space-y-6">
      {/* Header do Relatório */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              Velocidade &amp; Vazão do Caixa
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Speed of Service (BI)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Tempo médio de atendimento por pedido, ritmo de fila nos horários de pico e detecção de gargalos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setPeriodo('hoje')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                periodo === 'hoje' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodo('7dias')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                periodo === '7dias' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriodo('todos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                periodo === 'todos' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Total do Evento
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-semibold">Calculando cadência de pedidos e velocidade do caixa...</p>
        </div>
      ) : (
        <>
          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tempo Médio por Pedido
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 flex items-baseline gap-1">
                {ind.tempo_medio_segundos_por_pedido || 0}
                <span className="text-sm font-bold text-slate-400">segundos</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Entre compras consecutivas
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Velocidade do Caixa
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 flex items-baseline gap-1">
                {ind.pedidos_por_minuto_medio || 0}
                <span className="text-sm font-bold text-slate-400">pedidos/min</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                Cadência operacional ativa
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Capacidade Máxima / Hora
              </span>
              <div className="text-2xl sm:text-3xl font-black text-blue-400 flex items-baseline gap-1">
                {ind.capacidade_maxima_hora || 0}
                <span className="text-sm font-bold text-slate-400">clientes/h</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-400" />
                Teto teórico por terminal
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Pico Absoluto de Vazão
              </span>
              <div className="text-2xl sm:text-3xl font-black text-purple-400 flex items-baseline gap-1">
                {ind.pico_vazao?.pedidos || 0}
                <span className="text-sm font-bold text-slate-400">em {ind.pico_vazao?.hora_label || '--:--'}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Flame className="w-3 h-3 text-purple-400" />
                Maior concentração de vendas
              </p>
            </div>
          </div>

          {/* Banner de Diagnóstico de Fila e Recomendações */}
          <div className={`p-4 sm:p-5 rounded-2xl border flex items-start gap-4 ${
            diagnostico.nivel_estresse === 'alto'
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              : diagnostico.nivel_estresse === 'moderado'
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
              : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
          }`}>
            <div className="p-2 rounded-xl bg-slate-950/50 shrink-0 mt-0.5">
              {diagnostico.nivel_estresse === 'alto' ? (
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              )}
            </div>
            <div>
              <h4 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                <span>Diagnóstico Operacional: Nível de Estresse de Caixa {diagnostico.nivel_estresse?.toUpperCase()}</span>
              </h4>
              <p className="text-xs sm:text-sm mt-1 text-slate-300 leading-relaxed">
                {diagnostico.recomendacao}
              </p>
            </div>
          </div>

          {/* Tabela do Ciclo de Horários e Pressão de Fila */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-black text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Pressão de Atendimento por Horário da Noite
                </h3>
                <p className="text-xs text-slate-400">
                  Acompanhamento da velocidade de liberação do caixa das 16h até o fim da madrugada (04h).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Horário</th>
                    <th className="py-3 px-4">Pedidos Atendidos</th>
                    <th className="py-3 px-4">Itens Vendidos</th>
                    <th className="py-3 px-4">Tempo Médio / Pedido</th>
                    <th className="py-3 px-4">Vazão (Pedidos/min)</th>
                    <th className="py-3 px-4">Status da Fila</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {rankingHoras.map((row) => (
                    <tr key={row.hora} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-black text-white text-sm">
                        {row.hora_label}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {row.total_pedidos} pedidos
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {row.total_itens} un
                      </td>
                      <td className="py-3 px-4">
                        {row.tempo_medio_segundos > 0 ? (
                          <span className={`font-bold ${
                            row.tempo_medio_segundos <= 45 ? 'text-rose-400 font-black' : row.tempo_medio_segundos <= 90 ? 'text-amber-400' : 'text-slate-300'
                          }`}>
                            {row.tempo_medio_segundos}s
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {row.pedidos_por_minuto > 0 ? (
                          <span className="font-bold text-emerald-400">{row.pedidos_por_minuto} ped/min</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          row.status_fila === 'critico_gargalo'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : row.status_fila === 'alta_demanda'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : row.status_fila === 'moderado'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {row.status_fila === 'critico_gargalo' && <Flame className="w-3 h-3 text-rose-400" />}
                          {row.descricao_fila}
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
