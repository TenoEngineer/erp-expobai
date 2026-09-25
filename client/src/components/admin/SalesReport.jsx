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
  Filter,
  FileText,
  Clock,
  Layers,
  Award,
  Eye,
  LayoutDashboard,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  X
} from 'lucide-react';
import { 
  getFechamento, 
  cancelPedido, 
  deletePedido,
  getCaixaStatus,
  fecharCaixa,
  getCaixaHistorico
} from '../../services/api';
import ExecutiveReportPrintView from './ExecutiveReportPrintView';

export default function SalesReport({ config }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' ou 'relatorio_executivo'
  
  // Gestão de Caixa Flexível
  const [caixaAtivo, setCaixaAtivo] = useState(null);
  const [historicoCaixas, setHistoricoCaixas] = useState([]);
  const [modoFiltro, setModoFiltro] = useState('caixa_atual'); // 'caixa_atual', 'caixa_historico', 'periodo'
  const [caixaSelecionadoId, setCaixaSelecionadoId] = useState(null);

  // Modal Fechamento de Caixa
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [obsFechamento, setObsFechamento] = useState('');
  const [fechandoLoading, setFechandoLoading] = useState(false);

  // Filtros de Período (Caso use o modo calendário)
  const [periodo, setPeriodo] = useState('hoje'); 
  const todayStr = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(todayStr);
  const [horaInicio, setHoraInicio] = useState('');
  const [dataFim, setDataFim] = useState(todayStr);
  const [horaFim, setHoraFim] = useState('');

  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDateTimeMS = (dt) => {
    if (!dt) return '-';
    return new Date(dt).toLocaleString('pt-BR', {
      timeZone: 'America/Campo_Grande',
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  const getTempoDecorrido = (abertoEm) => {
    if (!abertoEm) return '';
    const diffMs = Math.max(0, new Date() - new Date(abertoEm));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours >= 24) {
      const days = Math.floor(diffHours / 24);
      const remHours = diffHours % 24;
      return `${days}d ${remHours}h`;
    }
    return `${diffHours}h ${diffMins}min`;
  };

  const loadCaixaData = async () => {
    try {
      const [statusRes, histRes] = await Promise.all([
        getCaixaStatus(),
        getCaixaHistorico(30)
      ]);
      setCaixaAtivo(statusRes?.sessao || null);
      setHistoricoCaixas(histRes || []);
      return statusRes?.sessao;
    } catch (err) {
      console.error('Erro ao carregar dados do caixa:', err);
      return null;
    }
  };

  const fetchReport = async (overrideModo, overrideSessaoId, overridePeriodo, overrideInicio, overrideFim) => {
    try {
      setLoading(true);
      const activeModo = overrideModo !== undefined ? overrideModo : modoFiltro;
      const params = {};

      if (activeModo === 'caixa_atual') {
        let activeId = overrideSessaoId !== undefined ? overrideSessaoId : caixaSelecionadoId;
        if (!activeId) {
          const c = caixaAtivo || await loadCaixaData();
          activeId = c?.id;
        }
        if (activeId) {
          params.sessao_id = activeId;
        } else {
          params.periodo = 'hoje';
        }
      } else if (activeModo === 'caixa_historico') {
        params.sessao_id = overrideSessaoId !== undefined ? overrideSessaoId : caixaSelecionadoId;
      } else {
        const activePeriodo = overridePeriodo !== undefined ? overridePeriodo : periodo;
        if (activePeriodo === 'personalizado') {
          const start = overrideInicio || (horaInicio ? `${dataInicio} ${horaInicio}:00` : dataInicio);
          const end = overrideFim || (horaFim ? `${dataFim} ${horaFim}:59` : dataFim);
          params.data_inicio = start;
          params.data_fim = end;
        } else {
          params.periodo = activePeriodo;
        }
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
    const init = async () => {
      const activeCaixa = await loadCaixaData();
      if (activeCaixa?.id) {
        setCaixaSelecionadoId(activeCaixa.id);
        fetchReport('caixa_atual', activeCaixa.id);
      } else {
        fetchReport('periodo', null, 'hoje');
      }
    };
    init();
  }, []);

  const handleSelectCaixaAtual = () => {
    setModoFiltro('caixa_atual');
    setCaixaSelecionadoId(caixaAtivo?.id || null);
    fetchReport('caixa_atual', caixaAtivo?.id);
  };

  const handleSelectCaixaHistorico = (id) => {
    setModoFiltro('caixa_historico');
    setCaixaSelecionadoId(id);
    fetchReport('caixa_historico', id);
  };

  const handleSelectPeriodo = (p) => {
    setModoFiltro('periodo');
    setPeriodo(p);
    setCaixaSelecionadoId(null);
    if (p !== 'personalizado') {
      fetchReport('periodo', null, p);
    }
  };

  const handleApplyCustomDates = (e) => {
    if (e) e.preventDefault();
    setModoFiltro('periodo');
    setPeriodo('personalizado');
    const start = horaInicio ? `${dataInicio} ${horaInicio}:00` : dataInicio;
    const end = horaFim ? `${dataFim} ${horaFim}:59` : dataFim;
    fetchReport('periodo', null, 'personalizado', start, end);
  };

  const handleConfirmFecharCaixa = async (e) => {
    e.preventDefault();
    try {
      setFechandoLoading(true);
      const res = await fecharCaixa({ observacoes: obsFechamento });
      setShowFecharModal(false);
      setObsFechamento('');
      
      const sessaoFechada = res?.resultado?.sessao_fechada;
      alert(`🎉 Caixa #${sessaoFechada?.id || ''} encerrado com sucesso!\nUm novo caixa foi iniciado automaticamente para as próximas vendas.`);

      // Recarrega dados do caixa e histórico
      await loadCaixaData();

      // Visualiza o relatório do caixa que acabou de ser fechado
      if (sessaoFechada?.id) {
        handleSelectCaixaHistorico(sessaoFechada.id);
      } else {
        handleSelectCaixaAtual();
      }
    } catch (err) {
      alert('Erro ao fechar caixa: ' + (err.response?.data?.error || err.message));
    } finally {
      setFechandoLoading(false);
    }
  };

  const handleCancel = async (id, num) => {
    if (confirm(`Deseja marcar como CANCELADO o pedido #${String(num).padStart(3, '0')}?`)) {
      try {
        await cancelPedido(id);
        await loadCaixaData();
        fetchReport();
      } catch (err) {
        alert('Erro ao cancelar pedido: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleDelete = async (id, num) => {
    const confirmMsg = `⚠️ ATENÇÃO: Deseja EXCLUIR DEFINITIVAMENTE o lançamento do pedido #${String(num).padStart(3, '0')}?\n\nEsta venda foi feita errada e será apagada do banco de dados, estornando os valores do caixa e relatórios imediatamente.`;
    if (confirm(confirmMsg)) {
      try {
        await deletePedido(id);
        alert(`✅ Pedido #${String(num).padStart(3, '0')} excluído com sucesso!`);
        await loadCaixaData();
        fetchReport();
      } catch (err) {
        alert('Erro ao excluir pedido: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  // Disparo da Impressão em Formato A4 / PDF do Relatório Executivo
  const handlePrintExecutiveReport = () => {
    document.body.classList.add('printing-report');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-report');
    }, 1500);
  };

  const getPeriodoDescricao = () => {
    if (modoFiltro === 'caixa_atual') {
      return `Caixa Atual (Aberto em ${formatDateTimeMS(caixaAtivo?.aberto_em)})`;
    }
    if (modoFiltro === 'caixa_historico') {
      const c = historicoCaixas.find(x => String(x.id) === String(caixaSelecionadoId));
      if (c) return `Caixa #${c.id} (${c.aberto_em_ms} a ${c.fechado_em_ms || 'Agora'})`;
      return `Caixa Fechado #${caixaSelecionadoId}`;
    }
    if (periodo === 'hoje') return 'Hoje';
    if (periodo === 'ontem') return 'Ontem';
    if (periodo === '7dias') return 'Últimos 7 Dias';
    if (periodo === 'mes') return 'Este Mês';
    if (periodo === 'todos') return 'Histórico Completo';
    if (periodo === 'personalizado') {
      if (dataInicio === dataFim && !horaInicio && !horaFim) {
        return `Dia ${dataInicio.split('-').reverse().join('/')}`;
      }
      return `${dataInicio.split('-').reverse().join('/')} ${horaInicio} até ${dataFim.split('-').reverse().join('/')} ${horaFim}`.trim();
    }
    return 'Geral';
  };

  const ind = report?.indicadores || {};
  const pag = report?.por_forma_pagamento || {};
  const ranking = report?.ranking_produtos || [];
  const vendasPorHora = report?.vendas_por_hora || [];
  const categorias = report?.categorias || [];

  return (
    <div className="space-y-6">
      
      {/* Header do Relatório & Ações de Impressão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-xl text-slate-100 flex items-center gap-2">
            <span>Relatório Analítico & Fechamento de Caixa</span>
            <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {getPeriodoDescricao()}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Análise aprofundada de vendas, conciliação financeira de tesouraria, horários de pico e curva ABC
          </p>
        </div>

        {/* Botões de Ação & Visualização */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Alternar Visualização: Painel vs Documento A4 */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'dashboard'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Painel</span>
            </button>
            <button
              onClick={() => setViewMode('relatorio_executivo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'relatorio_executivo'
                  ? 'bg-slate-800 text-amber-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver Relatório A4</span>
            </button>
          </div>

          <button
            onClick={() => fetchReport()}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors disabled:opacity-50 border border-slate-700"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* BOTÃO PRINCIPAL DE IMPRESSÃO / PDF */}
          <button
            onClick={handlePrintExecutiveReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950/40 border border-amber-400 transition-all active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-950" />
            <span>📄 Gerar Relatório PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* CARD PRINCIPAL: FECHAMENTO DE CAIXA FLEXÍVEL */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-base text-white">
                  {caixaAtivo?.status === 'aberto' ? '🟢 Caixa Atual em Aberto' : 'Caixa'}
                </h4>
                {caixaAtivo?.aberto_em && (
                  <span className="text-xs bg-emerald-950 text-emerald-300 font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Aberto há {getTempoDecorrido(caixaAtivo.aberto_em)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Aberto em <b className="text-slate-200">{formatDateTimeMS(caixaAtivo?.aberto_em)}</b> &bull; Total acumulado:{' '}
                <span className="text-emerald-400 font-bold font-mono text-sm">{formatPrice(caixaAtivo?.totais?.faturamento_total)}</span>{' '}
                ({caixaAtivo?.totais?.total_pedidos || 0} pedidos)
              </p>
            </div>
          </div>

          {/* Botão de Fechar Caixa */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFecharModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/60 border border-emerald-400/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              title="Encerrar este caixa e iniciar um novo para as próximas vendas"
            >
              <Lock className="w-4 h-4 text-emerald-200" />
              <span>🔒 Fechar Caixa Agora</span>
            </button>
          </div>
        </div>

        {/* SELETOR DE VISUALIZAÇÃO: CAIXA ATUAL / CAIXAS FECHADOS / DATAS */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              Visualizar:
            </span>

            {/* Botão Caixa Atual */}
            <button
              type="button"
              onClick={handleSelectCaixaAtual}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                modoFiltro === 'caixa_atual'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <span>🟢 Caixa Atual (Agora)</span>
            </button>

            {/* Dropdown de Caixas Fechados Anteriores */}
            {historicoCaixas.length > 0 && (
              <select
                value={modoFiltro === 'caixa_historico' ? (caixaSelecionadoId || '') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSelectCaixaHistorico(e.target.value);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-950 border focus:outline-none cursor-pointer ${
                  modoFiltro === 'caixa_historico'
                    ? 'border-amber-500 text-amber-300'
                    : 'border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <option value="">📋 Ver Caixas Anteriores...</option>
                {historicoCaixas.map((c) => (
                  <option key={c.id} value={c.id}>
                    Caixa #{c.id} ({c.aberto_em_ms} a {c.fechado_em_ms || 'Agora'}) - {formatPrice(c.faturamento_total)}
                  </option>
                ))}
              </select>
            )}

            {/* Botões Rápidos por Data (caso prefira ver por dia) */}
            <button
              type="button"
              onClick={() => handleSelectPeriodo('hoje')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                modoFiltro === 'periodo' && periodo === 'hoje'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={() => handleSelectPeriodo('ontem')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                modoFiltro === 'periodo' && periodo === 'ontem'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              Ontem
            </button>

            <button
              type="button"
              onClick={() => handleSelectPeriodo('todos')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                modoFiltro === 'periodo' && periodo === 'todos'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              Histórico Completo
            </button>

            <button
              type="button"
              onClick={() => handleSelectPeriodo('personalizado')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                modoFiltro === 'periodo' && periodo === 'personalizado'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              🔍 Filtrar Data
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Horário Oficial MS (-1h BSB)
          </span>
        </div>

        {/* Form de Data quando Personalizado */}
        {modoFiltro === 'periodo' && periodo === 'personalizado' && (
          <form onSubmit={handleApplyCustomDates} className="pt-2 flex flex-wrap items-center gap-3 animate-in fade-in">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <label className="text-[11px] text-slate-400 font-bold px-1">De:</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none font-mono"
              />
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-0.5 text-xs text-amber-300 font-mono focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <label className="text-[11px] text-slate-400 font-bold px-1">Até:</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none font-mono"
              />
              <input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-0.5 text-xs text-amber-300 font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all active:scale-[0.98]"
            >
              Aplicar Filtro
            </button>
          </form>
        )}
      </div>

      {/* MODAL FECHAR CAIXA */}
      {showFecharModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                <span>Realizar Fechamento de Caixa</span>
              </h3>
              <button 
                onClick={() => setShowFecharModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs mb-4">
              <div className="flex justify-between text-slate-300">
                <span>Início do Caixa:</span>
                <b className="font-mono text-white">{formatDateTimeMS(caixaAtivo?.aberto_em)}</b>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Encerramento:</span>
                <b className="font-mono text-emerald-400">Agora ({new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Campo_Grande' })})</b>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Duração do Caixa:</span>
                <b className="text-amber-300">{getTempoDecorrido(caixaAtivo?.aberto_em)}</b>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-black text-sm text-emerald-300">
                <span>Total Faturado no Caixa:</span>
                <span className="font-mono">{formatPrice(caixaAtivo?.totais?.faturamento_total)}</span>
              </div>
              <div className="text-right text-[11px] text-slate-400 font-mono">
                {caixaAtivo?.totais?.total_pedidos || 0} pedidos faturados
              </div>
            </div>

            <form onSubmit={handleConfirmFecharCaixa} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  value={obsFechamento}
                  onChange={(e) => setObsFechamento(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: Fechamento domingo à noite"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                💡 Ao confirmar, este caixa será encerrado e um novo caixa será iniciado imediatamente para registrar as próximas vendas.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFecharModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={fechandoLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg disabled:opacity-50"
                >
                  {fechandoLoading ? 'Fechando...' : 'Confirmar Fechamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
          <p className="text-xs">Processando dados e métricas analíticas...</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISUALIZAÇÃO 1: MODO DOCUMENTO A4 (PRÉ-VISUALIZAÇÃO DO RELATÓRIO)        */}
      {/* ========================================================================= */}
      {viewMode === 'relatorio_executivo' && !loading && (
        <div className="bg-slate-950 border border-slate-800 p-4 sm:p-8 rounded-3xl shadow-2xl animate-in fade-in duration-200 overflow-x-auto">
          <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-2xl text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 text-xs text-slate-500 no-print">
              <span>👁️ <b>Pré-visualização do Relatório:</b> Exatamente como será gerado em PDF ou impresso na folha A4.</span>
              <button
                onClick={handlePrintExecutiveReport}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>

            <ExecutiveReportPrintView
              report={report}
              periodoDescricao={getPeriodoDescricao()}
              config={config}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISUALIZAÇÃO 2: MODO PAINEL INTERATIVO (DASHBOARD EM MODO DARK)          */}
      {/* ========================================================================= */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Cards de Métricas Principais (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/40 p-4 rounded-2xl shadow-lg">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                Faturamento Total
              </span>
              <span className="font-black text-3xl text-white font-mono mt-1 block">
                {formatPrice(report?.faturamento_total)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Receita bruta liquidada
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
                Comandas geradas no PDV
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
                Média gasta por cliente
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Volume de Itens
              </span>
              <span className="font-black text-3xl text-cyan-400 font-mono mt-1 block">
                {ind.total_itens_vendidos || 0}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {ind.media_itens_por_pedido ? `${ind.media_itens_por_pedido.toFixed(1)} itens/pedido` : 'Densidade de cesta'}
              </span>
            </div>
          </div>

          {/* Destaque de Liquidez e Troco */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                ⚡
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Liquidez Imediata (À Vista):</span>
                <span className="font-extrabold text-base text-emerald-400 font-mono">
                  {formatPrice(ind.faturamento_a_vista)} <span className="text-xs text-slate-400">({ind.pct_a_vista}%)</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 font-bold">
                💳
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Cartões (Débito + Crédito):</span>
                <span className="font-extrabold text-base text-cyan-400 font-mono">
                  {formatPrice(ind.faturamento_cartao)} <span className="text-xs text-slate-400">({ind.pct_cartao}%)</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 font-bold">
                💵
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Troco Total Devolvido:</span>
                <span className="font-extrabold text-base text-amber-400 font-mono">
                  {formatPrice(ind.total_troco_entregue)}
                </span>
              </div>
            </div>
          </div>

          {/* Divisão por Forma de Pagamento */}
          <div>
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Conciliação Financeira por Método de Pagamento</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* PIX */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow hover:border-emerald-500/50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span>PIX</span>
                  <QrCode className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-3">
                  <span className="font-black text-xl text-emerald-400 font-mono block">
                    {formatPrice(pag.pix?.valor)}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>{pag.pix?.quantidade || 0} transações</span>
                    <span className="font-bold text-emerald-500">{pag.pix?.pct_valor || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Dinheiro */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow hover:border-amber-500/50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span>Dinheiro</span>
                  <Banknote className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-3">
                  <span className="font-black text-xl text-amber-400 font-mono block">
                    {formatPrice(pag.dinheiro?.valor)}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>{pag.dinheiro?.quantidade || 0} transações</span>
                    <span className="font-bold text-amber-500">{pag.dinheiro?.pct_valor || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Débito */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow hover:border-cyan-500/50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span>Débito</span>
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-3">
                  <span className="font-black text-xl text-cyan-400 font-mono block">
                    {formatPrice(pag.debito?.valor)}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>{pag.debito?.quantidade || 0} transações</span>
                    <span className="font-bold text-cyan-500">{pag.debito?.pct_valor || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Crédito */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow hover:border-purple-500/50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span>Crédito</span>
                  <CreditCard className="w-4 h-4 text-purple-400" />
                </div>
                <div className="mt-3">
                  <span className="font-black text-xl text-purple-400 font-mono block">
                    {formatPrice(pag.credito?.valor)}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>{pag.credito?.quantidade || 0} transações</span>
                    <span className="font-bold text-purple-500">{pag.credito?.pct_valor || 0}%</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Horários de Pico & Distribuição Temporal */}
          {vendasPorHora.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
              <h4 className="font-bold text-sm text-slate-100 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Horários de Pico & Ritmo de Vendas (Por Hora)</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {vendasPorHora.map((h, i) => (
                  <div key={i} className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-xl text-center">
                    <span className="text-xs font-mono font-bold text-amber-400 block">{h.hora}</span>
                    <span className="text-sm font-mono font-black text-slate-100 block mt-0.5">{formatPrice(h.total_faturado)}</span>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{h.qtd_pedidos} ped. ({h.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duas Colunas: Curva ABC de Produtos & Auditoria de Pedidos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Curva ABC & Ranking Completo de Produtos */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
              <h4 className="font-bold text-sm text-slate-100 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Curva ABC & Mix de Produtos</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-normal">
                  Ranking por faturamento
                </span>
              </h4>

              {ranking.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nenhuma venda registrada ainda.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {ranking.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl text-xs border border-slate-800/60">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 font-black flex items-center justify-center text-xs font-mono">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-200 block">{p.nome_produto}</span>
                          <span className="text-[10px] text-slate-500">{p.categoria} &bull; Médio: {formatPrice(p.preco_medio)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-100 font-mono block">{formatPrice(p.total_faturado)}</span>
                        <span className="text-amber-400 text-[11px] font-bold font-mono">{p.total_vendido} un. ({p.pct_share}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Auditoria de Pedidos com Itens Detalhados */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
              <h4 className="font-bold text-sm text-slate-100 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>Auditoria de Comandas Emitidas</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-normal">
                  {report?.ultimos_pedidos?.length || 0} pedidos listados &bull; Horário MS
                </span>
              </h4>

              {(report?.ultimos_pedidos || []).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nenhum pedido recente.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {(report?.ultimos_pedidos || []).map((ped) => (
                    <div key={ped.id} className="p-2.5 bg-slate-950/60 rounded-xl text-xs border border-slate-800/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-amber-400 font-mono text-sm">
                            #{String(ped.numero_pedido).padStart(3, '0')}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300 uppercase font-mono">
                            {ped.forma_pagamento}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            🕒 {ped.hora_ms || (ped.data_hora_ms ? ped.data_hora_ms.split(' ')[1] : new Date(ped.data_hora).toLocaleTimeString('pt-BR', { timeZone: 'America/Campo_Grande' }))} (MS)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-emerald-400 font-mono">
                            {formatPrice(ped.total)}
                          </span>
                          <button
                            onClick={() => handleCancel(ped.id, ped.numero_pedido)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                            title="Marcar como cancelado"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(ped.id, ped.numero_pedido)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                            title="Excluir lançamento errado definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Resumo dos Itens Consumidos */}
                      <p className="text-[11px] text-slate-400 font-sans truncate">
                        🍽️ {ped.itens_resumo}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Componente Oculto na tela normal, mas ativo durante window.print() */}
      {viewMode !== 'relatorio_executivo' && (
        <div className="hidden print:block">
          <ExecutiveReportPrintView
            report={report}
            periodoDescricao={getPeriodoDescricao()}
            config={config}
          />
        </div>
      )}

    </div>
  );
}
