import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  TrendingUp, 
  Calendar, 
  Package, 
  Smartphone, 
  Monitor, 
  Filter, 
  Flame, 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight, 
  Sparkles,
  Info,
  DollarSign,
  Receipt,
  Eye
} from 'lucide-react';
import { getComparativoHorarios } from '../../services/api';

export default function HourlyAnalysisReport({ config }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('todos');
  const [selectedOrigem, setSelectedOrigem] = useState('todos'); // 'todos', 'desktop', 'mobile'
  const [metricMode, setMetricMode] = useState('qtd_itens'); // 'qtd_itens', 'faturamento', 'qtd_pedidos'
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [activeCellTooltip, setActiveCellTooltip] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getComparativoHorarios({
        produto_id: selectedProduct !== 'todos' ? selectedProduct : undefined,
        origem: selectedOrigem !== 'todos' ? selectedOrigem : undefined
      });
      setData(res);
    } catch (err) {
      console.error('Erro ao carregar comparativo de horários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProduct, selectedOrigem]);

  const formatPrice = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <Clock className="w-8 h-8 text-amber-400 animate-spin" />
        <span className="text-slate-400 text-sm font-semibold">
          Compilando matriz comparativa de vendas por horário...
        </span>
      </div>
    );
  }

  const { dias = [], produtos = [], matriz_horas = [], picos = {}, dispositivos = {} } = data || {};

  // Calcular valor máximo da matriz para gerar o gradiente térmico de calor
  let maxMetricValue = 1;
  matriz_horas.forEach((row) => {
    dias.forEach((d) => {
      const cell = row.valores_por_dia[d.data];
      if (cell) {
        const val = metricMode === 'qtd_itens' 
          ? cell.qtd_itens 
          : metricMode === 'faturamento' 
            ? cell.faturamento 
            : cell.qtd_pedidos;
        if (val > maxMetricValue) maxMetricValue = val;
      }
    });
  });

  // Função para calcular cor de intensidade térmica (Heatmap)
  const getHeatmapClass = (val) => {
    if (!val || val === 0) return 'bg-slate-950/40 text-slate-600 border-slate-800/40';
    const ratio = val / maxMetricValue;
    if (ratio >= 0.75) {
      return 'bg-rose-500/25 border-rose-500/60 text-rose-300 font-black shadow-sm shadow-rose-950';
    }
    if (ratio >= 0.45) {
      return 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold';
    }
    if (ratio >= 0.20) {
      return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-medium';
    }
    return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';
  };

  // Totais de cada dia para o rodapé da tabela
  const totaisDias = {};
  let totalGeralColuna = 0;
  dias.forEach((d) => {
    let sum = 0;
    matriz_horas.forEach((row) => {
      const cell = row.valores_por_dia[d.data];
      if (cell) {
        sum += metricMode === 'qtd_itens' 
          ? cell.qtd_itens 
          : metricMode === 'faturamento' 
            ? cell.faturamento 
            : cell.qtd_pedidos;
      }
    });
    totaisDias[d.data] = sum;
    totalGeralColuna += sum;
  });

  // Encontrar o produto selecionado
  const prodObj = produtos.find(p => String(p.id) === String(selectedProduct));

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* 1. HEADER DO RELATÓRIO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Inteligência de Vendas
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-400" />
              Comparativo de Vendas por Horário
            </h2>
          </div>

          {/* Quick Metrics no Header */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-right">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Pico Geral da Feira</span>
              <span className="text-base font-black text-amber-400 font-mono">
                {picos?.geral_faturamento?.hora_label || '23:00'}
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-right">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Faturamento Pico</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                {formatPrice(picos?.geral_faturamento?.total_faturamento || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CARDS DE DESTAQUE DOS PICOS POR DIA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {dias.map((d) => {
          const picoDia = picos?.por_dia?.[d.data];
          return (
            <div 
              key={d.data}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1 relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">{d.label}</span>
                <span className="text-[10px] text-slate-400">{d.dia_semana}</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Horário de Pico:</span>
                  <span className="text-lg font-black text-amber-300 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {picoDia?.hora_pico || '-'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Volume do Pico:</span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    {picoDia?.pedidos_pico || 0} pedidos
                  </span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Total do Dia:</span>
                <span className="text-emerald-400 font-bold">{formatPrice(d.faturamento)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. BARRA DE FILTROS E MODO DE VISUALIZAÇÃO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Seletor de Métrica */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setMetricMode('qtd_itens')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                metricMode === 'qtd_itens'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Qtd. Produtos</span>
            </button>

            <button
              onClick={() => setMetricMode('faturamento')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                metricMode === 'faturamento'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Faturamento (R$)</span>
            </button>

            <button
              onClick={() => setMetricMode('qtd_pedidos')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                metricMode === 'qtd_pedidos'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Nº Pedidos</span>
            </button>
          </div>

          {/* Filtros de Produto e Dispositivo */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Dropdown de Produto */}
            <div className="flex-1 sm:flex-initial min-w-[200px]">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:border-amber-500 focus:outline-none"
              >
                <option value="todos">📦 Todos os Produtos (Visão Geral)</option>
                <optgroup label="Filtrar por Produto Específico:">
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.qtd_total} un vendidas)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Dropdown de Dispositivo */}
            <div className="flex-1 sm:flex-initial min-w-[170px]">
              <select
                value={selectedOrigem}
                onChange={(e) => setSelectedOrigem(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:border-amber-500 focus:outline-none"
              >
                <option value="todos">🌐 Todos Dispositivos</option>
                <option value="desktop">🖥️ Caixa (Notebook)</option>
                <option value="mobile">📱 Móvel (Celular / Tablet)</option>
              </select>
            </div>
          </div>

        </div>

        {/* Indicador do Filtro Ativo */}
        {selectedProduct !== 'todos' && prodObj && (
          <div className="bg-amber-950/40 border border-amber-500/40 p-2 rounded-xl flex items-center justify-between text-xs">
            <span className="text-amber-300 font-semibold flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Filtrando pelo produto: <b>{prodObj.nome}</b>
            </span>
            <button
              onClick={() => setSelectedProduct('todos')}
              className="text-[11px] text-amber-400 underline hover:text-amber-200"
            >
              Limpar filtro (Ver todos)
            </button>
          </div>
        )}
      </div>

      {/* 4. MATRIZ TÉRMICA COMPARATIVA (HORAS X DIAS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              Matriz Horária & Distribuição Noturna
            </h3>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span>Baixo</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded bg-slate-800" />
              <div className="w-3 h-3 rounded bg-cyan-500/40" />
              <div className="w-3 h-3 rounded bg-emerald-500/60" />
              <div className="w-3 h-3 rounded bg-amber-500/80" />
              <div className="w-3 h-3 rounded bg-rose-500" />
            </div>
            <span>Pico Máximo</span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-left border-collapse min-w-[620px]">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 bg-slate-950/80 rounded-tl-xl w-24">Horário</th>
                {dias.map((d) => (
                  <th key={d.data} className="py-2.5 px-3 text-center bg-slate-950/40">
                    <div>{d.label}</div>
                    <span className="text-[9px] font-normal text-slate-500 lowercase">{d.dia_semana}</span>
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right bg-slate-950/80 rounded-tr-xl w-36">
                  Total Horário
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
              {matriz_horas.map((row) => {
                const totalHoraVal = metricMode === 'qtd_itens' 
                  ? row.total_itens 
                  : metricMode === 'faturamento' 
                    ? row.total_faturamento 
                    : row.total_pedidos;

                const isPicoHora = row.hora === picos?.geral_faturamento?.hora;

                return (
                  <tr 
                    key={row.hora} 
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isPicoHora ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Coluna Horário */}
                    <td className="py-2 px-3 font-bold text-slate-200 flex items-center gap-1.5">
                      <span>{row.hora_label}</span>
                      {isPicoHora && (
                        <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" title="Horário de maior faturamento da feira" />
                      )}
                    </td>

                    {/* Colunas de Cada Dia */}
                    {dias.map((d) => {
                      const cell = row.valores_por_dia[d.data];
                      const val = cell 
                        ? (metricMode === 'qtd_itens' ? cell.qtd_itens : metricMode === 'faturamento' ? cell.faturamento : cell.qtd_pedidos)
                        : 0;
                      const heatClass = getHeatmapClass(val);

                      return (
                        <td key={d.data} className="py-1.5 px-2 text-center">
                          <div 
                            className={`py-1.5 px-2 rounded-lg border text-center transition-all ${heatClass}`}
                            title={cell?.top_produtos?.length > 0 
                              ? `Top produtos às ${row.hora_label}:\n` + cell.top_produtos.map(p => `• ${p.qtd}x ${p.nome}`).join('\n')
                              : undefined}
                          >
                            <span className="block font-bold">
                              {metricMode === 'faturamento' ? formatPrice(val) : (val > 0 ? `${val}` : '-')}
                            </span>
                            
                            {/* Destaque do Top Produto da Hora */}
                            {selectedProduct === 'todos' && cell?.top_produtos?.[0] && val > 0 && (
                              <span className="block text-[9px] text-slate-400 font-sans truncate max-w-[110px] mx-auto opacity-75">
                                {cell.top_produtos[0].nome}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Coluna Total do Horário */}
                    <td className="py-2 px-3 text-right font-black">
                      <div className="flex flex-col items-end">
                        <span className={`text-xs ${isPicoHora ? 'text-amber-400' : 'text-slate-200'}`}>
                          {metricMode === 'faturamento' ? formatPrice(totalHoraVal) : `${totalHoraVal}`}
                        </span>
                        {/* Barra proporcional visual */}
                        <div className="w-24 bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              isPicoHora ? 'bg-amber-400' : 'bg-cyan-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, Math.round((totalHoraVal / (maxMetricValue * dias.length || 1)) * 100))}%` 
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Rodapé com Totais do Dia */}
            <tfoot>
              <tr className="border-t-2 border-slate-700 font-black text-xs bg-slate-950/90 text-slate-200">
                <td className="py-3 px-3 uppercase text-slate-400 text-[10px]">
                  Total Geral:
                </td>
                {dias.map((d) => (
                  <td key={d.data} className="py-3 px-2 text-center text-emerald-400 font-mono">
                    {metricMode === 'faturamento' ? formatPrice(totaisDias[d.data]) : `${totaisDias[d.data]}`}
                  </td>
                ))}
                <td className="py-3 px-3 text-right text-amber-300 font-mono text-sm">
                  {metricMode === 'faturamento' ? formatPrice(totalGeralColuna) : `${totalGeralColuna}`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. AUDITORIA ESPECIAL: VENDAS FORA DA TENDA (CELULAR VS TABLET) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Auditoria de Vendas Móveis (Celular vs Tablet)</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                  {(dispositivos?.mobile_timeline || []).length} Vendas
                </span>
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMobileDetails(!showMobileDetails)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors shrink-0"
          >
            <span>{showMobileDetails ? 'Ocultar Linha do Tempo' : 'Ver Linha do Tempo das Vendas'}</span>
            {showMobileDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Explicação Técnica e Conclusão Clara */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total de Vendas Móveis:</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-purple-300 font-mono">
                {(dispositivos?.mobile_timeline || []).length} pedidos
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight pt-1">
              Pedidos realizados via celular ou tablet portátil fora do ponto fixo do caixa.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Dispositivos Conectados:</span>
            <span className="text-xl font-black text-amber-300 font-mono">Mobile & Desktop</span>
            <p className="text-[11px] text-slate-400 leading-tight pt-1">
              Rastreamento automático da origem dos pedidos pelo tamanho de tela do aparelho.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Auditoria de Vendas:</span>
            <span className="text-base font-bold text-cyan-300 flex items-center gap-1 mt-0.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              Detecção Unificada
            </span>
            <p className="text-[11px] text-slate-400 leading-tight pt-1">
              Visualize abaixo os pedidos em tempo real ordenados por horário e forma de pagamento.
            </p>
          </div>
        </div>

        {/* Tabela da Linha do Tempo das Vendas Móveis */}
        {showMobileDetails && (
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-slate-300">Linha do Tempo Cronológica dos Pedidos Móveis:</span>
              <span>Horário oficial de MS</span>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/80">
              {(dispositivos?.mobile_timeline || []).map((m) => (
                <div 
                  key={m.id}
                  className="p-2.5 bg-slate-950/60 hover:bg-slate-800/40 flex items-center justify-between gap-3 text-xs font-mono transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-purple-300 font-bold text-[10px]">
                      #{String(m.numero_pedido).padStart(3, '0')}
                    </span>
                    <span className="text-slate-400 text-[11px]">{m.horario_ms}</span>
                    <span className="text-slate-200 truncate font-sans text-xs ml-1">
                      {m.itens || '-'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 uppercase">
                      {m.forma_pagamento}
                    </span>
                    <span className="font-bold text-emerald-400 text-xs">
                      {formatPrice(m.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
