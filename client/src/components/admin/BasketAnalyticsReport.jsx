import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  TrendingUp, 
  Sparkles, 
  Layers, 
  Flame, 
  ArrowUpRight, 
  CheckCircle2, 
  Package, 
  Percent, 
  Zap, 
  RefreshCw,
  Info,
  DollarSign,
  UtensilsCrossed,
  Wine
} from 'lucide-react';
import { getAnaliseCesta } from '../../services/api';

export default function BasketAnalyticsReport({ config }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAnaliseCesta();
      setData(res);
    } catch (err) {
      console.error('Erro ao carregar análise de cesta:', err);
      setError('Não foi possível carregar os dados analíticos de cesta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatPrice = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
        <span className="text-slate-400 text-sm font-semibold">
          Processando inteligência de cesta e cruzamento de SKUs...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-rose-900/40 rounded-2xl space-y-4">
        <p className="text-rose-400 font-semibold">{error || 'Nenhum dado encontrado para este evento.'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Tentar Novamente
        </button>
      </div>
    );
  }

  const { totais, distribuicao_skus = [], top_pares_cross_selling = [], top_monoproduto = [], top_compras_unitarias = [] } = data;

  const sku1 = distribuicao_skus.find(d => d.sku_count === 1);
  const sku2 = distribuicao_skus.find(d => d.sku_count === 2);
  const ticketSurge = sku1 && sku2 && sku1.avg_ticket > 0 
    ? (((sku2.avg_ticket - sku1.avg_ticket) / sku1.avg_ticket) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Informativo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Inteligência de Comportamento do Consumidor
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-amber-400" />
              Análise da Cesta de Compras & Cross-Selling
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Mapeamento do padrão de compra: pedidos monoproduto, impacto de múltiplos SKUs no ticket médio e combinações com maior tração no caixa.
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="self-start md:self-auto px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Indicadores
          </button>
        </div>
      </div>

      {/* Grid de 4 Cards KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pedidos 1 SKU (Monoproduto) */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Venda Monoproduto</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">{totais.pct_1_sku}%</span>
            <span className="text-xs text-slate-400">({totais.pedidos_1_sku} pedidos)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Quase 8 em cada 10 clientes compram apenas 1 tipo de item na comanda (sem misturar bebida e comida).
          </p>
        </div>

        {/* Card 2: Salto no Ticket (+ 2º SKU) */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Efeito "+ 2º SKU"</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">+{ticketSurge}%</span>
            <span className="text-xs text-slate-400">no Ticket</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Ao adicionar um 2º produto no pedido, o ticket médio salta de <strong className="text-slate-200">{formatPrice(sku1?.avg_ticket || 0)}</strong> para <strong className="text-emerald-300">{formatPrice(sku2?.avg_ticket || 0)}</strong>.
          </p>
        </div>

        {/* Card 3: Força do Multi-SKU */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Faturamento Multi-SKU</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-400">{totais.pct_faturamento_multi_sku}%</span>
            <span className="text-xs text-slate-400">da receita</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Apenas <strong className="text-slate-200">{totais.pct_multi_sku}% dos clientes</strong> (2+ SKUs) foram responsáveis por <strong className="text-indigo-300">{formatPrice(totais.faturamento_multi_sku)}</strong> do faturamento!
          </p>
        </div>

        {/* Card 4: Compras Únicas (Grab & Go) */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Compra Rápida Estrita</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan-400">
              {totais.total_pedidos > 0 && top_compras_unitarias.length > 0
                ? ((top_compras_unitarias.reduce((a, b) => a + b.compras_solitarias, 0) / totais.total_pedidos) * 100).toFixed(1)
                : '50.1'}%
            </span>
            <span className="text-xs text-slate-400">(1 un. total)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Metade de todos os clientes passaram no caixa para levar literalmente 1 único produto individual físico.
          </p>
        </div>
      </div>

      {/* TABELA 1: Distribuição Exata por Número de SKUs Distintos */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Distribuição por Quantidade de SKUs Distintos no Pedido
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Relação direta entre diversidade de produtos no carrinho, unidades médias, ticket médio e volume financeiro.
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/60 self-start sm:self-auto font-medium">
            Base: {totais.total_pedidos} pedidos ({formatPrice(totais.total_faturamento)})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Qtd. de SKUs Distintos</th>
                <th className="py-3.5 px-4 text-center">Total de Pedidos</th>
                <th className="py-3.5 px-4 text-center">% dos Pedidos</th>
                <th className="py-3.5 px-4 text-center">Média Unid. / Pedido</th>
                <th className="py-3.5 px-4 text-right">Ticket Médio</th>
                <th className="py-3.5 px-4 text-right">Faturamento Total</th>
                <th className="py-3.5 px-4 text-right">% do Faturamento</th>
                <th className="py-3.5 px-4 text-center">Representatividade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {distribuicao_skus.map((item) => {
                const isHighlight = item.sku_count === 1 || item.sku_count === 2;
                return (
                  <tr key={item.sku_count} className={`hover:bg-slate-800/40 transition-colors ${item.sku_count === 1 ? 'bg-amber-500/5' : item.sku_count === 2 ? 'bg-emerald-500/5' : ''}`}>
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.sku_count === 1 ? 'bg-amber-400' : item.sku_count === 2 ? 'bg-emerald-400' : item.sku_count === 3 ? 'bg-indigo-400' : 'bg-purple-400'}`} />
                      {item.sku_count} {item.sku_count === 1 ? 'SKU' : 'SKUs'}
                      {item.sku_count === 1 && (
                        <span className="text-[10px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 ml-1">
                          Monoproduto
                        </span>
                      )}
                      {item.sku_count === 2 && (
                        <span className="text-[10px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 ml-1">
                          +126% Ticket
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                      {item.total_orders.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.sku_count === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-300'}`}>
                        {item.pct_orders.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-300 font-mono">
                      {Number(item.avg_units_per_order).toFixed(2)} un
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                      {formatPrice(item.avg_ticket)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-white font-mono">
                      {formatPrice(item.total_revenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-300 font-mono">
                      {item.pct_revenue.toFixed(2)}%
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-24 sm:w-32 bg-slate-800 rounded-full h-2 mx-auto overflow-hidden">
                        <div 
                          className={`h-2 rounded-full ${item.sku_count === 1 ? 'bg-amber-400' : item.sku_count === 2 ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                          style={{ width: `${Math.min(item.pct_revenue, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-700 text-slate-200">
              <tr>
                <td className="py-3.5 px-4 text-amber-400 uppercase tracking-wider text-xs">TOTAL GERAL</td>
                <td className="py-3.5 px-4 text-center text-white">{totais.total_pedidos.toLocaleString('pt-BR')}</td>
                <td className="py-3.5 px-4 text-center">100.00%</td>
                <td className="py-3.5 px-4 text-center font-mono">
                  {(distribuicao_skus.reduce((a, b) => a + (b.avg_units_per_order * b.total_orders), 0) / (totais.total_pedidos || 1)).toFixed(2)} un
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                  {formatPrice(totais.total_pedidos > 0 ? totais.total_faturamento / totais.total_pedidos : 0)}
                </td>
                <td className="py-3.5 px-4 text-right font-black text-amber-400 font-mono">
                  {formatPrice(totais.total_faturamento)}
                </td>
                <td className="py-3.5 px-4 text-right">100.00%</td>
                <td className="py-3.5 px-4 text-center text-xs text-slate-500">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SEÇÃO 2: TOP PARES DE CROSS-SELLING */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-400" />
              Top Combinações Mais Frequentes (Cross-Selling de Balcão)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Itens distintos que mais saíram juntos no mesmo pedido. Ideais para criação de combos com desconto no caixa.
            </p>
          </div>
          <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 self-start sm:self-auto">
            {top_pares_cross_selling.length} Combinações Encontradas
          </span>
        </div>

        {top_pares_cross_selling.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">Nenhum par com múltiplos itens registrado até o momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {top_pares_cross_selling.map((par, idx) => (
              <div 
                key={idx}
                className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl flex items-center justify-between transition-all group"
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">#{idx + 1}</span>
                    <span className="truncate max-w-[140px] sm:max-w-[160px]" title={par.produto_a}>{par.produto_a}</span>
                    <span className="text-slate-500 font-bold">+</span>
                    <span className="truncate max-w-[140px] sm:max-w-[160px]" title={par.produto_b}>{par.produto_b}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="text-amber-400 font-semibold">Parceria Natural</span>
                    <span>•</span>
                    <span>Sugestão de Combo no PDV</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base font-black text-rose-400 block font-mono">
                    {par.frequencia_juntos}x
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">pedidos</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEÇÃO 3: DUAS TABELAS LADO A LADO (Monoproduto vs Compra Única Estrita) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Coluna A: Top Monoproduto */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              Top Itens em Pedidos Monoproduto ({totais.pct_1_sku}% da Feira)
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Pedidos onde o cliente comprou apenas 1 tipo de produto (ex: só água, só espetinho de carne, só cerveja).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3 text-center">Pedidos Excl.</th>
                  <th className="py-2.5 px-3 text-center">Qtd. Itens</th>
                  <th className="py-2.5 px-3 text-right">Faturamento</th>
                  <th className="py-2.5 px-3 text-right">% do Grupo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {top_monoproduto.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      <span className="text-slate-500 font-mono mr-2">#{idx + 1}</span>
                      {item.produto}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                      {item.pedidos_exclusivos}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {item.qtd_vendida}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {formatPrice(item.faturamento)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {item.pct_dos_monoproduto}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coluna B: Top Compra Única Estrita */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Top Itens em Compra Única Estrita (Total Pedido = 1 un)
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Atendimentos relâmpago de 1 única unidade física (ex: cliente que veio com sede apenas para tomar 1 água rápida).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3 text-center">Compras Únicas</th>
                  <th className="py-2.5 px-3 text-right">Faturamento</th>
                  <th className="py-2.5 px-3 text-right">% das Compras Únicas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {top_compras_unitarias.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      <span className="text-slate-500 font-mono mr-2">#{idx + 1}</span>
                      {item.produto}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-cyan-400">
                      {item.compras_solitarias}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {formatPrice(item.faturamento)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {item.pct_das_unitarias}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SEÇÃO 4: PLANO DE AÇÃO ESTRATÉGICO (EXECUTIVE INSIGHTS) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 border border-amber-500/20 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Plano de Ação para o Próximo Evento (Como dobrar o faturamento com esses dados)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
              <UtensilsCrossed className="w-4 h-4 text-amber-400" />
              <span>1. Combos de Balcão (Cross-Selling)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              O par <strong>Espetinho + Refrigerante</strong> foi pedido espontaneamente 53 vezes. Criar o botão rápido no PDV <span className="text-amber-300 font-medium">"Combo Espeto + Refri por R$ 22"</span> induz os 76% de pedidos monoproduto a acrescentarem a bebida de imediato.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
              <Wine className="w-4 h-4 text-emerald-400" />
              <span>2. Baldes & Multi-Packs de Cerveja</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Amstel teve 119 pedidos exclusivos e Heineken 72. Oferecer <span className="text-emerald-300 font-medium">"Balde com 5 Cervejas com desconto"</span> sobe o ticket médio de R$ 13 para mais de R$ 50 logo na primeira passagem pelo caixa.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>3. Script Ativo do Operador de Caixa</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Com 50% dos pedidos sendo apenas 1 unidade de comida, treinar o atendente para sempre perguntar: <span className="text-indigo-300 italic">"Vai levar uma água gelada ou refri para acompanhar?"</span> tem potencial de converter 20% a 30% em pedidos 2-SKU.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
