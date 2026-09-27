import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  CreditCard, 
  Banknote, 
  DollarSign, 
  Filter, 
  Copy, 
  Check, 
  Printer, 
  RefreshCw, 
  Search, 
  ShoppingBag, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  Trash2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  getLancamentosPorPagamento, 
  getCaixaStatus, 
  getCaixaHistorico, 
  deletePedido 
} from '../../services/api';
import EditOrderModal from '../EditOrderModal';
import { executeOrderPrint } from '../../services/printManager';

export default function PaymentAuditReport({ config, initialForma = 'todos' }) {
  const [formaPagamento, setFormaPagamento] = useState(initialForma); // 'todos', 'pix', 'debito', 'credito', 'dinheiro'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // Gestão de Caixa & Sessões
  const [caixaAtivo, setCaixaAtivo] = useState(null);
  const [historicoCaixas, setHistoricoCaixas] = useState([]);
  const [modoFiltro, setModoFiltro] = useState('caixa_atual'); // 'caixa_atual', 'caixa_historico', 'periodo'
  const [caixaSelecionadoId, setCaixaSelecionadoId] = useState(null);

  // Filtros de Período Manual
  const [periodo, setPeriodo] = useState('hoje');
  const todayStr = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(todayStr);
  const [horaInicio, setHoraInicio] = useState('');
  const [dataFim, setDataFim] = useState(todayStr);
  const [horaFim, setHoraFim] = useState('');

  // Edição de Lançamento
  const [editingOrder, setEditingOrder] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
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

  const carregarLancamentos = async (overrideModo, overrideSessaoId, overridePeriodo, overrideInicio, overrideFim, overrideForma) => {
    try {
      setLoading(true);
      const activeModo = overrideModo !== undefined ? overrideModo : modoFiltro;
      const targetForma = overrideForma !== undefined ? overrideForma : formaPagamento;
      const params = { forma_pagamento: targetForma };

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

      const res = await getLancamentosPorPagamento(params);
      setData(res);
    } catch (err) {
      console.error('Erro ao buscar lançamentos por pagamento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const activeCaixa = await loadCaixaData();
      if (activeCaixa?.id) {
        setCaixaSelecionadoId(activeCaixa.id);
        carregarLancamentos('caixa_atual', activeCaixa.id);
      } else {
        carregarLancamentos('periodo', null, 'hoje');
      }
    };
    init();
  }, []);

  const handleMudarForma = (novaForma) => {
    setFormaPagamento(novaForma);
    carregarLancamentos(undefined, undefined, undefined, undefined, undefined, novaForma);
  };

  const handleSelectCaixaAtual = () => {
    setModoFiltro('caixa_atual');
    setCaixaSelecionadoId(caixaAtivo?.id || null);
    carregarLancamentos('caixa_atual', caixaAtivo?.id);
  };

  const handleSelectCaixaHistorico = (id) => {
    setModoFiltro('caixa_historico');
    setCaixaSelecionadoId(id);
    carregarLancamentos('caixa_historico', id);
  };

  const handleSelectPeriodo = (p) => {
    setModoFiltro('periodo');
    setPeriodo(p);
    setCaixaSelecionadoId(null);
    if (p !== 'personalizado') {
      carregarLancamentos('periodo', null, p);
    }
  };

  const handleApplyCustomDates = (e) => {
    if (e) e.preventDefault();
    setModoFiltro('periodo');
    setPeriodo('personalizado');
    const start = horaInicio ? `${dataInicio} ${horaInicio}:00` : dataInicio;
    const end = horaFim ? `${dataFim} ${horaFim}:59` : dataFim;
    carregarLancamentos('periodo', null, 'personalizado', start, end);
  };

  const handleDelete = async (id, num) => {
    const confirmMsg = `⚠️ ATENÇÃO: Deseja EXCLUIR DEFINITIVAMENTE o lançamento #${String(num).padStart(3, '0')}?\n\nEsta venda será apagada do banco de dados e estornará os valores imediatamente.`;
    if (confirm(confirmMsg)) {
      try {
        await deletePedido(id);
        alert(`✅ Pedido #${String(num).padStart(3, '0')} excluído com sucesso!`);
        carregarLancamentos();
      } catch (err) {
        alert('Erro ao excluir pedido: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  // Gerar e Copiar Extrato para WhatsApp
  const handleCopyWhatsapp = () => {
    if (!data?.lancamentos) return;

    const formaLabel = formaPagamento === 'pix' ? '📱 PIX (Conta dos Pais)' :
      formaPagamento === 'debito' ? '💳 CARTÃO DE DÉBITO (Alex)' :
      formaPagamento === 'credito' ? '💳 CARTÃO DE CRÉDITO (Alex)' :
      formaPagamento === 'dinheiro' ? '💵 DINHEIRO EM ESPÉCIE (Caixa)' : '🌐 TODOS OS PAGAMENTOS';

    let txt = `📋 *CONFERÊNCIA DE PAGAMENTOS - EXPOBAI 2026*\n`;
    txt += `🏷️ *Método:* ${formaLabel}\n`;
    txt += `💰 *Total Auditado:* ${formatPrice(data.metricas?.valor_filtrado)}\n`;
    txt += `📦 *Transações:* ${data.metricas?.qtd_filtrado} lançamentos\n`;
    txt += `🎯 *Ticket Médio:* ${formatPrice(data.metricas?.ticket_medio_filtrado)}\n`;
    txt += `📌 *Destino:* ${data.conta_destino?.responsavel || 'Caixa'}\n`;
    txt += `━━━━━━━━━━━━━━━━━━━━\n`;
    txt += `🔍 *EXTRATO DETALHADO:*\n\n`;

    filteredLancamentos.forEach((l) => {
      const hora = l.hora_ms || (l.data_hora_ms ? l.data_hora_ms.split(' ')[1] : '');
      const mistoInfo = l.is_misto ? ` (Misto: de ${formatPrice(l.total)})` : '';
      txt += `• *#${String(l.numero_pedido).padStart(3, '0')}* (${hora}) ➜ *${formatPrice(l.valor_efetivo)}*${mistoInfo}\n`;
      txt += `  _${l.itens_resumo}_\n`;
    });

    txt += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    txt += `✅ *Total a bater com o extrato/maquininha: ${formatPrice(data.metricas?.valor_filtrado)}*\n`;

    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Imprimir Extrato Direto
  const handlePrintExtrato = () => {
    window.print();
  };

  // Filtragem Instantânea por busca
  const filteredLancamentos = (data?.lancamentos || []).filter(l => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const num = String(l.numero_pedido || '');
    const numPad = String(l.numero_pedido || '').padStart(3, '0');
    const itens = (l.itens_resumo || '').toLowerCase();
    const obs = (l.observacoes || '').toLowerCase();
    const val = String(l.valor_efetivo || '').replace('.', ',');
    const valTotal = String(l.total || '').replace('.', ',');
    const socios = (l.socios_resumo || '').toLowerCase();

    return num.includes(term) ||
      numPad.includes(term) ||
      itens.includes(term) ||
      obs.includes(term) ||
      val.includes(term) ||
      valTotal.includes(term) ||
      socios.includes(term);
  });

  return (
    <div className="space-y-5">
      
      {/* ========================================================================= */}
      {/* 1. SELETOR DE CONTEXTO / CAIXA / PERÍODO */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Conferência de Lançamentos por Pagamento</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Extrato detalhado centavo por centavo para conciliação direta com PIX (pais), maquininha de cartão (Alex) e dinheiro (caixa).
            </p>
          </div>

          {/* Ações Topo: Copiar WhatsApp & Atualizar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyWhatsapp}
              className={`h-10 px-3.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 shadow border ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-950'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
              }`}
              title="Copiar lista de lançamentos formatada para WhatsApp"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar WhatsApp</span>
                </>
              )}
            </button>

            <button
              onClick={() => carregarLancamentos()}
              disabled={loading}
              className="h-10 px-3.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Recarregar lançamentos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        </div>

        {/* Linha de Filtros de Sessão / Período */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto touch-pan-x flex-nowrap pb-1 w-full sm:w-auto scrollbar-none">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              Sessão:
            </span>

            <button
              type="button"
              onClick={handleSelectCaixaAtual}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                modoFiltro === 'caixa_atual'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              🟢 Caixa Atual
            </button>

            {historicoCaixas.length > 0 && (
              <select
                value={modoFiltro === 'caixa_historico' ? (caixaSelecionadoId || '') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSelectCaixaHistorico(e.target.value);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-950 border focus:outline-none cursor-pointer shrink-0 ${
                  modoFiltro === 'caixa_historico'
                    ? 'border-amber-500 text-amber-300'
                    : 'border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <option value="">📋 Caixas Anteriores...</option>
                {historicoCaixas.map((c) => (
                  <option key={c.id} value={c.id}>
                    Caixa #{c.id} ({c.aberto_em_ms} a {c.fechado_em_ms || 'Agora'}) - {formatPrice(c.faturamento_total)}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => handleSelectPeriodo('hoje')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
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
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
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
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                modoFiltro === 'periodo' && periodo === 'todos'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              Todo o Evento
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SELETOR DE FORMA DE PAGAMENTO (TABS EM DESTAQUE) */}
      {/* ========================================================================= */}
      <div 
        className="flex items-center gap-2 overflow-x-auto touch-pan-x flex-nowrap pb-1.5 scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Todos */}
        <button
          onClick={() => handleMudarForma('todos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shrink-0 shadow-md ${
            formaPagamento === 'todos'
              ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white border border-slate-500 shadow-slate-950'
              : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-slate-300" />
          <span>Todos ({data?.metricas?.total_pedidos || 0})</span>
        </button>

        {/* PIX */}
        <button
          onClick={() => handleMudarForma('pix')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shrink-0 shadow-md ${
            formaPagamento === 'pix'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border border-emerald-400 shadow-emerald-950/60'
              : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span>PIX ({data?.metricas?.qtd_pix || 0})</span>
          {data?.metricas?.total_pix > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              {formatPrice(data.metricas.total_pix)}
            </span>
          )}
        </button>

        {/* DÉBITO */}
        <button
          onClick={() => handleMudarForma('debito')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shrink-0 shadow-md ${
            formaPagamento === 'debito'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white border border-cyan-400 shadow-cyan-950/60'
              : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-cyan-400" />
          <span>Débito ({data?.metricas?.qtd_debito || 0})</span>
          {data?.metricas?.total_debito > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40">
              {formatPrice(data.metricas.total_debito)}
            </span>
          )}
        </button>

        {/* CRÉDITO */}
        <button
          onClick={() => handleMudarForma('credito')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shrink-0 shadow-md ${
            formaPagamento === 'credito'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white border border-purple-400 shadow-purple-950/60'
              : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-purple-400" />
          <span>Crédito ({data?.metricas?.qtd_credito || 0})</span>
          {data?.metricas?.total_credito > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-500/40">
              {formatPrice(data.metricas.total_credito)}
            </span>
          )}
        </button>

        {/* DINHEIRO */}
        <button
          onClick={() => handleMudarForma('dinheiro')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shrink-0 shadow-md ${
            formaPagamento === 'dinheiro'
              ? 'bg-gradient-to-r from-amber-600 to-yellow-700 text-white border border-amber-400 shadow-amber-950/60'
              : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Banknote className="w-4 h-4 text-amber-400" />
          <span>Dinheiro ({data?.metricas?.qtd_dinheiro || 0})</span>
          {data?.metricas?.total_dinheiro > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-500/40">
              {formatPrice(data.metricas.total_dinheiro)}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. BANNER DE CONCILIAÇÃO & DESTINO DA CONTA */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg ${
        formaPagamento === 'pix'
          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
          : formaPagamento === 'debito'
          ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
          : formaPagamento === 'credito'
          ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
          : formaPagamento === 'dinheiro'
          ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          : 'bg-slate-900 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0">
            {formaPagamento === 'pix' ? <QrCode className="w-6 h-6 text-emerald-400" /> :
             formaPagamento === 'debito' || formaPagamento === 'credito' ? <CreditCard className="w-6 h-6 text-cyan-400" /> :
             formaPagamento === 'dinheiro' ? <Banknote className="w-6 h-6 text-amber-400" /> :
             <Layers className="w-6 h-6 text-slate-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm text-white">
                {data?.conta_destino?.titulo || 'Todos os Métodos'}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-slate-200">
                Destino: {data?.conta_destino?.responsavel}
              </span>
            </div>
            <p className="text-xs text-slate-300/90 mt-0.5">
              {data?.conta_destino?.descricao}
            </p>
          </div>
        </div>

        {/* Resumo Rápido da Validação */}
        <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 w-full sm:w-auto">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
            Total a Validar Centavo por Centavo:
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 block">
            {formatPrice(data?.metricas?.valor_filtrado)}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CARDS DE MÉTRICAS DA FORMA SELECIONADA */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Auditado */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total {formaPagamento === 'todos' ? 'Geral' : formaPagamento.toUpperCase()}
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-white mt-1 block">
            {formatPrice(data?.metricas?.valor_filtrado)}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            {data?.metricas?.faturamento_total > 0
              ? `${Math.round(((data.metricas.valor_filtrado || 0) / data.metricas.faturamento_total) * 1000) / 10}% do faturamento`
              : '0%'}
          </span>
        </div>

        {/* Quantidade de Transações */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total de Transações
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-cyan-400 mt-1 block">
            {data?.metricas?.qtd_filtrado || 0}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            de {data?.metricas?.total_pedidos || 0} pedidos no total
          </span>
        </div>

        {/* Ticket Médio */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Ticket Médio
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-1 block">
            {formatPrice(data?.metricas?.ticket_medio_filtrado)}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            por comanda neste método
          </span>
        </div>

        {/* Faturamento Global Comparativo */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Faturamento Geral (Todas as Formas)
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-slate-200 mt-1 block">
            {formatPrice(data?.metricas?.faturamento_total)}
          </span>
          <span className="text-[11px] text-emerald-400 font-mono mt-1 block">
            {data?.metricas?.total_pedidos || 0} vendas concluídas
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. BUSCA RÁPIDA & AUDITORIA DE LANÇAMENTOS */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="font-bold text-sm text-slate-100">
                Auditoria de Lançamentos ({filteredLancamentos.length} de {data?.lancamentos?.length || 0})
              </h4>
              <p className="text-[11px] text-slate-400">
                Horário oficial de Amambai/MS &bull; Cada lançamento reflete o valor creditado
              </p>
            </div>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por comanda (#042), item ou valor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            >
            </input>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* LISTAGEM DE LANÇAMENTOS */}
        {loading && !data ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
            <p className="text-xs">Carregando extrato de lançamentos...</p>
          </div>
        ) : filteredLancamentos.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Nenhum lançamento encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredLancamentos.map((ped) => {
              const isMisto = ped.is_misto;
              const splitText = isMisto && Array.isArray(ped.pagamentos)
                ? ped.pagamentos.map(p => `${p.forma.toUpperCase()} ${formatPrice(p.valor)}`).join(' + ')
                : null;

              return (
                <div
                  key={ped.id}
                  className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    
                    {/* Lado Esquerdo: Comanda, Horário e Pagamento */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-black text-amber-400 text-base">
                        #{String(ped.numero_pedido).padStart(3, '0')}
                      </span>

                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{ped.hora_ms || ped.data_hora_ms}</span>
                      </span>

                      {/* Tag do Método */}
                      {isMisto ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-950/90 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono">
                          ⚡ Misto: {splitText}
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase font-mono ${
                          ped.forma_pagamento === 'pix' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' :
                          ped.forma_pagamento === 'debito' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' :
                          ped.forma_pagamento === 'credito' ? 'bg-purple-950 text-purple-300 border border-purple-500/40' :
                          'bg-amber-950 text-amber-300 border border-amber-500/40'
                        }`}>
                          {ped.forma_pagamento}
                        </span>
                      )}

                      {ped.editado && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-600/40">
                          Editado
                        </span>
                      )}
                    </div>

                    {/* Lado Direito: Valor Alocado e Ações */}
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <span className="font-mono font-black text-emerald-400 text-base block">
                          {formatPrice(ped.valor_efetivo)}
                        </span>
                        {isMisto && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            (Total Comanda: {formatPrice(ped.total)})
                          </span>
                        )}
                      </div>

                      {/* Botões de Ação na Linha */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Re-imprimir Direto sem modal */}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await executeOrderPrint(ped);
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-lg transition-all"
                          title="Re-imprimir comanda na impressora térmica"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Editar Pedido */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOrder(ped);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg transition-all border border-amber-500/30"
                          title="Editar lançamento (forma de pagamento ou itens)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Excluir Pedido */}
                        <button
                          type="button"
                          onClick={() => handleDelete(ped.id, ped.numero_pedido)}
                          className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-400 rounded-lg transition-all border border-rose-800/40"
                          title="Excluir lançamento definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detalhe dos Itens e Sócios */}
                  <div className="pt-2 border-t border-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                    <div className="text-slate-300">
                      <span className="text-slate-500 font-bold mr-1">Itens:</span>
                      <span>{ped.itens_resumo}</span>
                    </div>

                    <div className="text-slate-400 text-[11px] font-mono shrink-0">
                      <span className="text-slate-500 mr-1">Sócios:</span>
                      <span className="text-amber-300 font-bold">{ped.socios_resumo}</span>
                    </div>
                  </div>

                  {ped.observacoes && (
                    <div className="text-[11px] text-amber-400/90 italic bg-amber-950/20 px-2 py-1 rounded border border-amber-900/30">
                      Obs: {ped.observacoes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Edição de Pedido */}
      {isEditModalOpen && editingOrder && (
        <EditOrderModal
          order={editingOrder}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingOrder(null);
          }}
          onOrderUpdated={() => {
            setIsEditModalOpen(false);
            setEditingOrder(null);
            carregarLancamentos();
          }}
        />
      )}

    </div>
  );
}
