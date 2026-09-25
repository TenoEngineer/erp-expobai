import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  QrCode, 
  Banknote, 
  CreditCard, 
  Printer, 
  RefreshCw,
  Ban,
  Calendar,
  Filter
} from 'lucide-react';
import { getFechamento, cancelPedido } from '../../services/api';

export default function SalesReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros de Período
  const [periodo, setPeriodo] = useState('hoje'); // 'hoje', 'ontem', '7dias', 'mes', 'todos', 'personalizado'
  const todayStr = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(todayStr);
  const [dataFim, setDataFim] = useState(todayStr);

  const fetchReport = async (overridePeriodo, overrideInicio, overrideFim) => {
    try {
      setLoading(true);
      const activePeriodo = overridePeriodo !== undefined ? overridePeriodo : periodo;
      const params = {};

      if (activePeriodo === 'personalizado') {
        params.data_inicio = overrideInicio || dataInicio;
        params.data_fim = overrideFim || dataFim;
      } else {
        params.periodo = activePeriodo;
      }

      const data = await getFechamento(params);
      setReport(data);
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport('hoje');
  }, []);

  const handleSelectPeriodo = (p) => {
    setPeriodo(p);
    if (p !== 'personalizado') {
      fetchReport(p);
    }
  };

  const handleApplyCustomDates = (e) => {
    if (e) e.preventDefault();
    setPeriodo('personalizado');
    fetchReport('personalizado', dataInicio, dataFim);
  };

  const handleCancel = async (id, num) => {
    if (confirm(`Deseja cancelar o pedido #${String(num).padStart(3, '0')}?`)) {
      try {
        await cancelPedido(id);
        fetchReport();
      } catch (err) {
        alert('Erro ao cancelar pedido: ' + err.message);
      }
    }
  };

  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getPeriodoDescricao = () => {
    if (periodo === 'hoje') return 'Hoje';
    if (periodo === 'ontem') return 'Ontem';
    if (periodo === '7dias') return 'Últimos 7 Dias';
    if (periodo === 'mes') return 'Este Mês';
    if (periodo === 'todos') return 'Todos os Dias (Histórico Completo)';
    if (periodo === 'personalizado') {
      if (dataInicio === dataFim) return `Dia ${dataInicio.split('-').reverse().join('/')}`;
      return `${dataInicio.split('-').reverse().join('/')} até ${dataFim.split('-').reverse().join('/')}`;
    }
    return 'Geral';
  };

  const pag = report?.por_forma_pagamento || {};

  return (
    <div className="space-y-6">
      
      {/* Header do Relatório */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
            <span>Fechamento de Caixa & Vendas</span>
            <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-medium">
              {getPeriodoDescricao()}
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Resumo financeiro, conciliação por método de pagamento e itens vendidos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReport()}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Imprimir Fechamento</span>
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS DE DATA / PERÍODO */}
      <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-lg space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800/80">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>Filtrar Período do Caixa</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Filtre por hoje, ontem, mês ou selecione o dia específico desejado
          </span>
        </div>

        {/* Botões Rápidos de Período */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectPeriodo('hoje')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodo === 'hoje'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            📅 Hoje
          </button>

          <button
            type="button"
            onClick={() => handleSelectPeriodo('ontem')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodo === 'ontem'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            ⏪ Ontem
          </button>

          <button
            type="button"
            onClick={() => handleSelectPeriodo('7dias')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodo === '7dias'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            📊 Últimos 7 Dias
          </button>

          <button
            type="button"
            onClick={() => handleSelectPeriodo('mes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodo === 'mes'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            🗓️ Este Mês
          </button>

          <button
            type="button"
            onClick={() => handleSelectPeriodo('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodo === 'todos'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            🌐 Todos os Dias (Geral)
          </button>

          <button
            type="button"
            onClick={() => handleSelectPeriodo('personalizado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodo === 'personalizado'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            🔍 Escolher Data / Período
          </button>
        </div>

        {/* Inputs de Data quando Personalizado */}
        {periodo === 'personalizado' && (
          <form onSubmit={handleApplyCustomDates} className="pt-2 flex flex-wrap items-center gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-bold">De:</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-bold">Até:</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all active:scale-[0.98]"
            >
              Filtrar
            </button>
          </form>
        )}
      </div>

      {loading && (
        <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
          <p className="text-xs">Atualizando dados do período selecionado...</p>
        </div>
      )}

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/40 p-4 rounded-2xl shadow-lg">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
            Faturamento Total
          </span>
          <span className="font-black text-3xl text-white font-mono mt-1 block">
            {formatPrice(report?.faturamento_total)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Vendas confirmadas
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total de Pedidos
          </span>
          <span className="font-black text-3xl text-amber-400 font-mono mt-1 block">
            {report?.total_pedidos || 0}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Comandas emitidas
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Ticket Médio
          </span>
          <span className="font-black text-3xl text-slate-100 font-mono mt-1 block">
            {formatPrice(report?.ticket_medio)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Por cliente
          </span>
        </div>
      </div>

      {/* Divisão por Forma de Pagamento */}
      <div>
        <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">
          Conciliação por Forma de Pagamento
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* PIX */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between shadow">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>PIX</span>
              <QrCode className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="font-black text-lg text-emerald-400 font-mono block">
                {formatPrice(pag.pix?.valor)}
              </span>
              <span className="text-[11px] text-slate-500">
                {pag.pix?.quantidade || 0} transações
              </span>
            </div>
          </div>

          {/* Dinheiro */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between shadow">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>Dinheiro</span>
              <Banknote className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="font-black text-lg text-amber-400 font-mono block">
                {formatPrice(pag.dinheiro?.valor)}
              </span>
              <span className="text-[11px] text-slate-500">
                {pag.dinheiro?.quantidade || 0} transações
              </span>
            </div>
          </div>

          {/* Débito */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between shadow">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>Débito</span>
              <CreditCard className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2">
              <span className="font-black text-lg text-cyan-400 font-mono block">
                {formatPrice(pag.debito?.valor)}
              </span>
              <span className="text-[11px] text-slate-500">
                {pag.debito?.quantidade || 0} transações
              </span>
            </div>
          </div>

          {/* Crédito */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between shadow">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>Crédito</span>
              <CreditCard className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2">
              <span className="font-black text-lg text-purple-400 font-mono block">
                {formatPrice(pag.credito?.valor)}
              </span>
              <span className="text-[11px] text-slate-500">
                {pag.credito?.quantidade || 0} transações
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Duas Colunas: Produtos Mais Vendidos & Últimos Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Top Produtos */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <h4 className="font-bold text-sm text-slate-100 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Mais Vendidos</span>
          </h4>

          {(report?.top_produtos || []).length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Nenhuma venda registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {(report?.top_produtos || []).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-200">{p.nome_produto}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-amber-400 font-mono">{p.total_vendido} un.</span>
                    <span className="text-slate-500 text-[10px] block">{formatPrice(p.total_faturado)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos Pedidos */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <h4 className="font-bold text-sm text-slate-100 mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Últimos Pedidos Emitidos</span>
          </h4>

          {(report?.ultimos_pedidos || []).length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Nenhum pedido recente.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {(report?.ultimos_pedidos || []).map((ped) => (
                <div key={ped.id} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl text-xs">
                  <div>
                    <span className="font-black text-amber-400 font-mono text-sm">
                      #{String(ped.numero_pedido).padStart(3, '0')}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300 uppercase">
                      {ped.forma_pagamento}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {new Date(ped.data_hora).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-black text-sm text-emerald-400 font-mono">
                      {formatPrice(ped.total)}
                    </span>
                    <button
                      onClick={() => handleCancel(ped.id, ped.numero_pedido)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                      title="Cancelar pedido"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
