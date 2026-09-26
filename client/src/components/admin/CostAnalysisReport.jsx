import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Layers, 
  Filter, 
  CheckSquare, 
  Square, 
  Printer, 
  RefreshCw, 
  Search, 
  Percent, 
  ArrowUpDown,
  FileSpreadsheet,
  PieChart,
  Award
} from 'lucide-react';
import { 
  getRelatorioVendas, 
  getCaixaStatus, 
  getCaixaHistorico, 
  getRelatorioPorCaixa 
} from '../../services/api';

export default function CostAnalysisReport({ config }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros de Período
  const [caixaAtivo, setCaixaAtivo] = useState(null);
  const [historicoCaixas, setHistoricoCaixas] = useState([]);
  const [modoFiltro, setModoFiltro] = useState('caixa_atual'); // 'caixa_atual', 'caixa_historico', 'periodo'
  const [caixaSelecionadoId, setCaixaSelecionadoId] = useState(null);
  const [periodo, setPeriodo] = useState('hoje');
  const todayStr = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(todayStr);
  const [horaInicio, setHoraInicio] = useState('');
  const [dataFim, setDataFim] = useState(todayStr);
  const [horaFim, setHoraFim] = useState('');

  // Filtros de Produtos e Categorias
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('todas');
  const [selectedProductNames, setSelectedProductNames] = useState(new Set());
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [searchProductTerm, setSearchProductTerm] = useState('');
  const [sortField, setSortField] = useState('total_faturado'); // 'total_faturado', 'lucro_bruto', 'total_vendido', 'margem_lucro_pct'
  const [sortAsc, setSortAsc] = useState(false);

  // Modo de visualização de impressão A4
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'relatorio_impressao'

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
      let data;

      if (activeModo === 'caixa_atual') {
        const sessao = await loadCaixaData();
        if (sessao && sessao.id) {
          data = await getRelatorioPorCaixa(sessao.id);
        } else {
          data = await getRelatorioVendas({ periodo: 'hoje' });
        }
      } else if (activeModo === 'caixa_historico') {
        const sessaoId = overrideSessaoId !== undefined ? overrideSessaoId : caixaSelecionadoId;
        if (sessaoId) {
          data = await getRelatorioPorCaixa(sessaoId);
        } else {
          data = await getRelatorioVendas({ periodo: 'hoje' });
        }
      } else {
        const p = overridePeriodo !== undefined ? overridePeriodo : periodo;
        const params = {};
        if (p === 'personalizado') {
          const dIni = overrideInicio !== undefined ? overrideInicio : dataInicio;
          const dFim = overrideFim !== undefined ? overrideFim : dataFim;
          if (dIni) params.data_inicio = horaInicio ? `${dIni}T${horaInicio}:00` : `${dIni}T00:00:00`;
          if (dFim) params.data_fim = horaFim ? `${dFim}T${horaFim}:59` : `${dFim}T23:59:59`;
        } else {
          params.periodo = p;
        }
        data = await getRelatorioVendas(params);
      }

      setReport(data);

      // Na primeira carga, seleciona todos os produtos disponíveis
      if (!hasInitializedSelection && data?.ranking_produtos?.length > 0) {
        const allNames = new Set(data.ranking_produtos.map(p => p.nome_produto));
        setSelectedProductNames(allNames);
        setHasInitializedSelection(true);
      }
    } catch (err) {
      console.error('Erro ao carregar relatório analítico de custos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Mudança de filtros de período
  const handleSelectCaixaAtual = () => {
    setModoFiltro('caixa_atual');
    setCaixaSelecionadoId(null);
    fetchReport('caixa_atual', null);
  };

  const handleSelectCaixaHistorico = (sessaoId) => {
    setModoFiltro('caixa_historico');
    setCaixaSelecionadoId(sessaoId);
    fetchReport('caixa_historico', sessaoId);
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
    e.preventDefault();
    handleSelectPeriodo('personalizado');
    fetchReport('periodo', null, 'personalizado', dataInicio, dataFim);
  };

  const getPeriodoDescricao = () => {
    if (modoFiltro === 'caixa_atual') {
      return `Caixa Atual #${caixaAtivo?.id || 1} (Aberto em ${formatDateTimeMS(caixaAtivo?.aberto_em)})`;
    }
    if (modoFiltro === 'caixa_historico') {
      const c = historicoCaixas.find(h => String(h.id) === String(caixaSelecionadoId));
      return c ? `Caixa Fechado #${c.id} (${c.aberto_em_ms} a ${c.fechado_em_ms || 'Hoje'})` : `Caixa #${caixaSelecionadoId}`;
    }
    if (periodo === 'hoje') return 'Hoje (Horário MS)';
    if (periodo === 'ontem') return 'Ontem (Horário MS)';
    if (periodo === 'todos') return 'Histórico Completo';
    return `${dataInicio} ${horaInicio || '00:00'} até ${dataFim} ${horaFim || '23:59'} (MS)`;
  };

  // Ranking completo dos produtos
  const allRankingProducts = report?.ranking_produtos || [];

  // Categorias do relatório
  const categoriesList = report?.categorias || [];

  // Toggle de seleção de produtos individuais
  const handleToggleProduct = (nomeProduto) => {
    setSelectedProductNames(prev => {
      const next = new Set(prev);
      if (next.has(nomeProduto)) {
        next.delete(nomeProduto);
      } else {
        next.add(nomeProduto);
      }
      return next;
    });
  };

  // Selecionar todos os produtos
  const handleSelectAllProducts = () => {
    const all = new Set(allRankingProducts.map(p => p.nome_produto));
    setSelectedProductNames(all);
  };

  // Limpar seleção
  const handleClearAllProducts = () => {
    setSelectedProductNames(new Set());
  };

  // Selecionar todos de uma categoria específica
  const handleSelectCategoryProducts = (catNome) => {
    setSelectedCategoryFilter(catNome);
    if (catNome === 'todas') {
      handleSelectAllProducts();
    } else {
      const matching = allRankingProducts
        .filter(p => p.categoria?.toLowerCase() === catNome.toLowerCase())
        .map(p => p.nome_produto);
      setSelectedProductNames(new Set(matching));
    }
  };

  // Produtos filtrados e ordenados
  const filteredProducts = useMemo(() => {
    return allRankingProducts
      .filter(p => {
        // Filtro de seleção checkbox
        const isSelected = selectedProductNames.has(p.nome_produto);
        // Filtro de busca textual
        const matchesSearch = !searchProductTerm || 
          p.nome_produto.toLowerCase().includes(searchProductTerm.toLowerCase()) ||
          p.categoria.toLowerCase().includes(searchProductTerm.toLowerCase());
        return isSelected && matchesSearch;
      })
      .sort((a, b) => {
        let valA = a[sortField] || 0;
        let valB = b[sortField] || 0;
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [allRankingProducts, selectedProductNames, searchProductTerm, sortField, sortAsc]);

  // Totais calculados dinamicamente com base APENAS nos produtos selecionados
  const dynamicKPIs = useMemo(() => {
    let faturamento = 0;
    let custo = 0;
    let itens = 0;

    filteredProducts.forEach(p => {
      faturamento += parseFloat(p.total_faturado) || 0;
      custo += parseFloat(p.custo_total) || 0;
      itens += parseInt(p.total_vendido, 10) || 0;
    });

    const lucro = faturamento - custo;
    const margem = faturamento > 0 ? ((lucro / faturamento) * 100) : 0;

    return {
      faturamento,
      custo,
      lucro,
      margem: margem.toFixed(1),
      itens,
      totalSelecionados: filteredProducts.length,
      totalDisponiveis: allRankingProducts.length
    };
  }, [filteredProducts, allRankingProducts]);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DO RELATÓRIO ANALÍTICO & FILTROS DE PERÍODO                  */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-400">
                <PieChart className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-black text-lg text-slate-100 flex items-center gap-2">
                  <span>Análise Detalhada de Custos & Lucratividade</span>
                  <span className="text-[10px] bg-purple-900/60 text-purple-300 font-mono font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                    BI & CMV
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Visão executiva isolada de custos por categoria, margem por produto e filtros dinâmicos
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchReport()}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-950/60 border border-purple-400/40 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4 text-purple-200" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros de Período / Caixas */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              Período:
            </span>

            {/* Botão Caixa Atual */}
            <button
              type="button"
              onClick={handleSelectCaixaAtual}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                modoFiltro === 'caixa_atual'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <span>🟢 Caixa Atual (Agora)</span>
            </button>

            {/* Dropdown Caixas Fechados */}
            {historicoCaixas.length > 0 && (
              <select
                value={modoFiltro === 'caixa_historico' ? (caixaSelecionadoId || '') : ''}
                onChange={(e) => {
                  if (e.target.value) handleSelectCaixaHistorico(e.target.value);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-950 border focus:outline-none cursor-pointer ${
                  modoFiltro === 'caixa_historico'
                    ? 'border-purple-500 text-purple-300'
                    : 'border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <option value="">📋 Ver Caixa Específico...</option>
                {historicoCaixas.map((c) => (
                  <option key={c.id} value={c.id}>
                    Caixa #{c.id} ({c.aberto_em_ms} a {c.fechado_em_ms || 'Hoje'}) - {formatPrice(c.faturamento_total)}
                  </option>
                ))}
              </select>
            )}

            {/* Atalhos Rápidos de Datas */}
            <button
              type="button"
              onClick={() => handleSelectPeriodo('hoje')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                modoFiltro === 'periodo' && periodo === 'hoje'
                  ? 'bg-purple-600 text-white shadow-md'
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
                  ? 'bg-purple-600 text-white shadow-md'
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
                  ? 'bg-purple-600 text-white shadow-md'
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
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              🔍 Personalizado
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            {getPeriodoDescricao()}
          </span>
        </div>

        {/* Form Personalizado de Data */}
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
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
            >
              Aplicar Filtro
            </button>
          </form>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMÁRIO EXECUTIVO DINÂMICO (RECALCULADO PELOS PRODUTOS SELECIONADOS)   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Faturamento dos Selecionados */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Faturamento Filtrado
            </span>
            <span className="p-1.5 bg-cyan-950 border border-cyan-500/30 rounded-lg text-cyan-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-black text-slate-100 font-mono block mt-2">
            {formatPrice(dynamicKPIs.faturamento)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {dynamicKPIs.totalSelecionados} de {dynamicKPIs.totalDisponiveis} produtos selecionados
          </span>
        </div>

        {/* Custo Total de Mercadorias (CMV) */}
        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Custo Total (CMV)
            </span>
            <span className="p-1.5 bg-amber-950 border border-amber-500/30 rounded-lg text-amber-400">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-black text-amber-300 font-mono block mt-2">
            {formatPrice(dynamicKPIs.custo)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Gasto direto com insumos e produtos
          </span>
        </div>

        {/* Lucro Bruto Operacional */}
        <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/40 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Lucro Bruto Operacional
            </span>
            <span className="p-1.5 bg-emerald-950 border border-emerald-500/30 rounded-lg text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-black text-emerald-300 font-mono block mt-2">
            {formatPrice(dynamicKPIs.lucro)}
          </span>
          <span className="text-[11px] text-emerald-500/80 mt-1 block font-medium">
            Receita líquida descontado o custo
          </span>
        </div>

        {/* Margem Média dos Selecionados */}
        <div className="bg-slate-900 border border-purple-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Margem de Lucro Média
            </span>
            <span className="p-1.5 bg-purple-950 border border-purple-500/30 rounded-lg text-purple-400">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-black text-purple-300 font-mono block mt-2">
            {dynamicKPIs.margem}%
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {dynamicKPIs.itens} unidades comercializadas
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RELATÓRIO DE CUSTO & LUCRO POR CATEGORIA (RESUMO ESTRUTURADO)          */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h4 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
              1. Relatório de Custo & Lucro por Categoria
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            Clique em <b>Filtrar Categoria</b> para selecionar instantaneamente os produtos
          </span>
        </div>

        {categoriesList.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">Nenhuma categoria com vendas no período.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {categoriesList.map((cat, idx) => {
              const faturado = parseFloat(cat.total_faturado) || 0;
              const custo = parseFloat(cat.custo_total) || 0;
              const lucro = parseFloat(cat.lucro_bruto) || (faturado - custo);
              const margem = cat.margem_lucro_pct !== undefined ? cat.margem_lucro_pct : (faturado > 0 ? ((lucro / faturado) * 100).toFixed(1) : 0);

              const isCatSelected = selectedCategoryFilter?.toLowerCase() === cat.categoria?.toLowerCase();

              return (
                <div 
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isCatSelected
                      ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/40'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.cor || '#a855f7' }}
                        ></span>
                        <h5 className="font-extrabold text-sm text-slate-100">{cat.categoria}</h5>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {cat.total_itens} un
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono pt-1">
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400 font-sans">Faturamento:</span>
                        <span className="font-bold">{formatPrice(faturado)}</span>
                      </div>
                      <div className="flex justify-between text-amber-300">
                        <span className="text-slate-400 font-sans">Custo (CMV):</span>
                        <span className="font-bold">{formatPrice(custo)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-black pt-1 border-t border-slate-800">
                        <span className="text-slate-400 font-sans font-normal">Lucro Bruto:</span>
                        <span>{formatPrice(lucro)}</span>
                      </div>
                      <div className="flex justify-between text-purple-300">
                        <span className="text-slate-400 font-sans">Margem:</span>
                        <span className="font-black">{margem}%</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectCategoryProducts(cat.categoria)}
                    className={`mt-3 w-full py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                      isCatSelected
                        ? 'bg-purple-600 text-white shadow'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span>{isCatSelected ? '✓ Categoria Filtrada' : 'Filtrar Categoria'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. SELETOR INTERATIVO DE PRODUTOS (CHECKBOXES & BUSCA)                     */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>2. Seleção Personalizada de Produtos</span>
            </h4>
            <p className="text-xs text-slate-400">
              Marque ou desmarque produtos para recalcular o relatório de custos sob medida
            </p>
          </div>

          {/* Botões Rápidos de Seleção */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSelectAllProducts}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold border border-slate-700 transition-colors"
            >
              Selecionar Todos
            </button>
            <button
              type="button"
              onClick={handleClearAllProducts}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg text-xs font-bold border border-slate-700 transition-colors"
            >
              Desmarcar Todos
            </button>
            <button
              type="button"
              onClick={() => handleSelectCategoryProducts('todas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                selectedCategoryFilter === 'todas'
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Todas Categorias
            </button>
          </div>
        </div>

        {/* Barra de Busca de Produtos */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome do produto ou categoria (ex: cerveja, água, cookie)..."
              value={searchProductTerm}
              onChange={(e) => setSearchProductTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          {searchProductTerm && (
            <button
              onClick={() => setSearchProductTerm('')}
              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Grade de Checkboxes de Produtos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
          {allRankingProducts
            .filter(p => !searchProductTerm || p.nome_produto.toLowerCase().includes(searchProductTerm.toLowerCase()) || p.categoria.toLowerCase().includes(searchProductTerm.toLowerCase()))
            .map((prod, idx) => {
              const isChecked = selectedProductNames.has(prod.nome_produto);
              const pLucro = parseFloat(prod.lucro_bruto) || (parseFloat(prod.total_faturado) - parseFloat(prod.custo_total));

              return (
                <div
                  key={idx}
                  onClick={() => handleToggleProduct(prod.nome_produto)}
                  className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between gap-2 ${
                    isChecked
                      ? 'bg-purple-950/40 border-purple-500/60 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-60 hover:opacity-100 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={isChecked ? 'text-purple-400' : 'text-slate-600'}>
                      {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-100 block truncate">{prod.nome_produto}</span>
                      <span className="text-[10px] text-slate-400 block truncate font-mono">
                        {prod.categoria} &bull; Custo: {formatPrice(prod.preco_custo || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <span className="font-bold text-xs text-slate-200 block">
                      {formatPrice(prod.total_faturado)}
                    </span>
                    <span className="text-[10px] text-emerald-400 block">
                      Lucro: {formatPrice(pLucro)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. TABELA ANALÍTICA DETALHADA DOS PRODUTOS SELECIONADOS                    */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              <span>3. Relatório Detalhado de Performance & Margens</span>
            </h4>
            <span className="text-xs text-slate-400">
              Exibindo <b>{filteredProducts.length} produtos filtrados</b> com custos e lucros individuais
            </span>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px] px-1 font-bold">Ordenar por:</span>
            <button
              onClick={() => {
                if (sortField === 'total_faturado') setSortAsc(!sortAsc);
                else { setSortField('total_faturado'); setSortAsc(false); }
              }}
              className={`px-2 py-0.5 rounded-lg font-bold ${sortField === 'total_faturado' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Faturamento
            </button>
            <button
              onClick={() => {
                if (sortField === 'lucro_bruto') setSortAsc(!sortAsc);
                else { setSortField('lucro_bruto'); setSortAsc(false); }
              }}
              className={`px-2 py-0.5 rounded-lg font-bold ${sortField === 'lucro_bruto' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Lucro
            </button>
            <button
              onClick={() => {
                if (sortField === 'total_vendido') setSortAsc(!sortAsc);
                else { setSortField('total_vendido'); setSortAsc(false); }
              }}
              className={`px-2 py-0.5 rounded-lg font-bold ${sortField === 'total_vendido' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Qtd
            </button>
            <button
              onClick={() => {
                if (sortField === 'margem_lucro_pct') setSortAsc(!sortAsc);
                else { setSortField('margem_lucro_pct'); setSortAsc(false); }
              }}
              className={`px-2 py-0.5 rounded-lg font-bold ${sortField === 'margem_lucro_pct' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Margem %
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[10px]">
              <tr>
                <th className="p-3 text-center w-8">#</th>
                <th className="p-3 text-left">Produto</th>
                <th className="p-3 text-left">Categoria</th>
                <th className="p-3 text-right">Qtd Vendida</th>
                <th className="p-3 text-right">Preço Médio</th>
                <th className="p-3 text-right">Custo Unit.</th>
                <th className="p-3 text-right">Total Faturado</th>
                <th className="p-3 text-right">Custo Total</th>
                <th className="p-3 text-right">Lucro Bruto</th>
                <th className="p-3 text-center">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredProducts.map((prod, idx) => {
                const faturado = parseFloat(prod.total_faturado) || 0;
                const custo = parseFloat(prod.custo_total) || 0;
                const lucro = parseFloat(prod.lucro_bruto) || (faturado - custo);
                const margem = prod.margem_lucro_pct !== null && prod.margem_lucro_pct !== undefined ? prod.margem_lucro_pct : (faturado > 0 ? ((lucro / faturado) * 100).toFixed(1) : 0);

                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                    <td className="p-3 font-sans font-bold text-slate-100">{prod.nome_produto}</td>
                    <td className="p-3 font-sans text-slate-400 text-[11px]">{prod.categoria}</td>
                    <td className="p-3 text-right font-bold text-cyan-400">{prod.total_vendido} un</td>
                    <td className="p-3 text-right text-slate-400">{formatPrice(prod.preco_medio)}</td>
                    <td className="p-3 text-right text-amber-300">{formatPrice(prod.preco_custo || 0)}</td>
                    <td className="p-3 text-right font-black text-slate-100">{formatPrice(faturado)}</td>
                    <td className="p-3 text-right text-amber-400">{formatPrice(custo)}</td>
                    <td className="p-3 text-right font-black text-emerald-400">{formatPrice(lucro)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        Number(margem) >= 50
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                      }`}>
                        {margem}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-500 italic font-sans">
                    Nenhum produto selecionado ou encontrado para o período.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredProducts.length > 0 && (
              <tfoot className="bg-slate-950 font-black border-t-2 border-slate-700 text-slate-100 font-mono">
                <tr>
                  <td colSpan="3" className="p-3 font-sans uppercase text-xs">
                    TOTAL DOS SELECIONADOS ({filteredProducts.length} itens)
                  </td>
                  <td className="p-3 text-right text-cyan-400">{dynamicKPIs.itens} un</td>
                  <td className="p-3 text-right">-</td>
                  <td className="p-3 text-right">-</td>
                  <td className="p-3 text-right text-sm text-slate-100">{formatPrice(dynamicKPIs.faturamento)}</td>
                  <td className="p-3 text-right text-amber-400">{formatPrice(dynamicKPIs.custo)}</td>
                  <td className="p-3 text-right text-sm text-emerald-400">{formatPrice(dynamicKPIs.lucro)}</td>
                  <td className="p-3 text-center text-purple-300">{dynamicKPIs.margem}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MODO DE IMPRESSÃO A4 (ATIVO DURANTE window.print())                     */}
      {/* ========================================================================= */}
      <div className="hidden print:block text-slate-900 bg-white p-6 font-sans">
        <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">
              🌾 {config?.nome_estande || 'Tenda dos Müller'} &bull; Expobai 2026
            </h1>
            <h2 className="text-sm font-bold text-slate-700 uppercase">
              Relatório Gerencial de Custos, CMV & Lucratividade por Produto
            </h2>
            <p className="text-[11px] text-slate-500">
              Amambai - MS &bull; Pavilhão Gastronômico &bull; Horário Oficial MS (-1h BSB)
            </p>
          </div>
          <div className="text-right text-[11px] font-mono">
            <p><b>Período:</b> {getPeriodoDescricao()}</p>
            <p><b>Emissão:</b> {new Date().toLocaleString('pt-BR', { timeZone: 'America/Campo_Grande' })}</p>
          </div>
        </div>

        {/* Resumo de Indicadores na Impressão */}
        <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
          <div className="border border-slate-300 bg-slate-50 p-2 rounded">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Faturamento Filtrado</span>
            <span className="text-base font-black font-mono block">{formatPrice(dynamicKPIs.faturamento)}</span>
          </div>
          <div className="border border-slate-300 bg-slate-50 p-2 rounded">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Custo de Mercadorias (CMV)</span>
            <span className="text-base font-black font-mono block text-amber-800">{formatPrice(dynamicKPIs.custo)}</span>
          </div>
          <div className="border border-slate-300 bg-slate-50 p-2 rounded">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Lucro Bruto</span>
            <span className="text-base font-black font-mono block text-emerald-800">{formatPrice(dynamicKPIs.lucro)}</span>
          </div>
          <div className="border border-slate-300 bg-slate-50 p-2 rounded">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Margem Média</span>
            <span className="text-base font-black font-mono block">{dynamicKPIs.margem}%</span>
          </div>
        </div>

        {/* Tabela de Categorias na Impressão */}
        <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5 border-b border-slate-300 pb-1">
          1. Custos & Lucro por Categoria
        </h3>
        <table className="w-full text-xs border border-slate-300 border-collapse mb-4">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[9px]">
              <th className="p-1.5 text-left">Categoria</th>
              <th className="p-1.5 text-right">Qtd Itens</th>
              <th className="p-1.5 text-right">Faturamento</th>
              <th className="p-1.5 text-right">Custo Total</th>
              <th className="p-1.5 text-right">Lucro Bruto</th>
              <th className="p-1.5 text-center">Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {categoriesList.map((cat, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="p-1.5 font-bold">{cat.categoria}</td>
                <td className="p-1.5 text-right font-mono">{cat.total_itens} un</td>
                <td className="p-1.5 text-right font-mono font-bold">{formatPrice(cat.total_faturado)}</td>
                <td className="p-1.5 text-right font-mono">{formatPrice(cat.custo_total)}</td>
                <td className="p-1.5 text-right font-mono font-bold text-emerald-800">{formatPrice(cat.lucro_bruto)}</td>
                <td className="p-1.5 text-center font-mono font-bold">{cat.margem_lucro_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tabela de Produtos na Impressão */}
        <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5 border-b border-slate-300 pb-1">
          2. Detalhamento dos Produtos Selecionados ({filteredProducts.length} itens)
        </h3>
        <table className="w-full text-xs border border-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[9px]">
              <th className="p-1.5 text-left">Produto</th>
              <th className="p-1.5 text-left">Categoria</th>
              <th className="p-1.5 text-right">Qtd</th>
              <th className="p-1.5 text-right">Preço Venda</th>
              <th className="p-1.5 text-right">Custo Unit.</th>
              <th className="p-1.5 text-right">Faturamento</th>
              <th className="p-1.5 text-right">Custo Total</th>
              <th className="p-1.5 text-right">Lucro Bruto</th>
              <th className="p-1.5 text-center">Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-[11px]">
            {filteredProducts.map((p, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="p-1.5 font-bold">{p.nome_produto}</td>
                <td className="p-1.5 text-slate-600 text-[10px]">{p.categoria}</td>
                <td className="p-1.5 text-right font-mono">{p.total_vendido} un</td>
                <td className="p-1.5 text-right font-mono">{formatPrice(p.preco_medio)}</td>
                <td className="p-1.5 text-right font-mono">{formatPrice(p.preco_custo || 0)}</td>
                <td className="p-1.5 text-right font-mono font-bold">{formatPrice(p.total_faturado)}</td>
                <td className="p-1.5 text-right font-mono">{formatPrice(p.custo_total)}</td>
                <td className="p-1.5 text-right font-mono font-bold text-emerald-800">{formatPrice(p.lucro_bruto)}</td>
                <td className="p-1.5 text-center font-mono font-bold">{p.margem_lucro_pct}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-400 bg-slate-100 font-black font-mono">
            <tr>
              <td colSpan="2" className="p-1.5 uppercase">TOTAL DOS SELECIONADOS</td>
              <td className="p-1.5 text-right">{dynamicKPIs.itens} un</td>
              <td className="p-1.5 text-right">-</td>
              <td className="p-1.5 text-right">-</td>
              <td className="p-1.5 text-right">{formatPrice(dynamicKPIs.faturamento)}</td>
              <td className="p-1.5 text-right">{formatPrice(dynamicKPIs.custo)}</td>
              <td className="p-1.5 text-right text-emerald-800">{formatPrice(dynamicKPIs.lucro)}</td>
              <td className="p-1.5 text-center">{dynamicKPIs.margem}%</td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}
