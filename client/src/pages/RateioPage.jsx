import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Clock, 
  Sparkles, 
  Beef, 
  CupSoda, 
  Cake, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Layers,
  ChevronRight,
  Edit2,
  Settings,
  UserPlus,
  X
} from 'lucide-react';
import { 
  getRateio, 
  getCustosEvento, 
  createCustoEvento, 
  updateCustoEvento, 
  deleteCustoEvento,
  getProdutosSocios,
  updateProdutoSocio,
  autoAtribuirSocios,
  getSociosLista,
  saveSociosLista
} from '../services/api';

export default function RateioPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [periodo, setPeriodo] = useState('todos'); // 'todos', 'hoje', 'ontem'
  const [activeSubTab, setActiveSubTab] = useState('resumo'); // 'resumo', 'custos', 'produtos', 'itens'
  const [copied, setCopied] = useState(false);

  // Sócios Dinâmicos do Tenant
  const [sociosLista, setSociosLista] = useState([]);
  const [isSociosModalOpen, setIsSociosModalOpen] = useState(false);
  const [editingSociosLista, setEditingSociosLista] = useState([]);
  const [savingSocios, setSavingSocios] = useState(false);

  // Estados do Modal de Novo/Editar Custo
  const [isCustoModalOpen, setIsCustoModalOpen] = useState(false);
  const [editingCusto, setEditingCusto] = useState(null);
  const [custoForm, setCustoForm] = useState({
    descricao: '',
    valor: '',
    divisao: 'todos',
    pago_por: 'caixa',
    observacoes: ''
  });

  // Produtos e Sócios para a aba de atribuição
  const [produtosSocios, setProdutosSocios] = useState([]);
  const [savingProductId, setSavingProductId] = useState(null);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [res, sociosRes] = await Promise.all([
        getRateio({ periodo }),
        getSociosLista().catch(() => [])
      ]);
      setData(res);
      const socios = sociosRes && sociosRes.length > 0 ? sociosRes : (res?.socios_lista || []);
      setSociosLista(socios);

      if (activeSubTab === 'produtos') {
        const prods = await getProdutosSocios();
        setProdutosSocios(prods);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do rateio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [periodo, activeSubTab]);

  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleCopyWhatsapp = () => {
    if (!data?.texto_whatsapp) return;
    navigator.clipboard.writeText(data.texto_whatsapp).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleOpenNewCusto = () => {
    setEditingCusto(null);
    setCustoForm({
      descricao: '',
      valor: '',
      divisao: 'alex_heitor',
      pago_por: 'caixa',
      observacoes: ''
    });
    setIsCustoModalOpen(true);
  };

  const handleOpenEditCusto = (custo) => {
    setEditingCusto(custo);
    setCustoForm({
      descricao: custo.descricao,
      valor: String(custo.valor),
      divisao: custo.divisao || 'alex_heitor',
      pago_por: custo.pago_por || 'caixa',
      observacoes: custo.observacoes || ''
    });
    setIsCustoModalOpen(true);
  };

  const handleSaveCusto = async (e) => {
    e.preventDefault();
    try {
      if (editingCusto) {
        await updateCustoEvento(editingCusto.id, custoForm);
      } else {
        await createCustoEvento(custoForm);
      }
      setIsCustoModalOpen(false);
      carregarDados();
    } catch (err) {
      alert('Erro ao salvar custo: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteCusto = async (id, descricao) => {
    if (!confirm(`Deseja realmente excluir o custo "${descricao}"?`)) return;
    try {
      await deleteCustoEvento(id);
      carregarDados();
    } catch (err) {
      alert('Erro ao excluir custo: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenSociosModal = () => {
    setEditingSociosLista(JSON.parse(JSON.stringify(sociosLista)));
    setIsSociosModalOpen(true);
  };

  const handleAddSocio = () => {
    const newId = `socio_${Date.now()}`;
    const colors = ['#a855f7', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4', '#f97316'];
    const nextColor = colors[editingSociosLista.length % colors.length];
    setEditingSociosLista([
      ...editingSociosLista,
      {
        id: newId,
        nome: `Sócio ${editingSociosLista.length + 1}`,
        papel: 'Geral',
        recebe_por: 'nenhum',
        cor: nextColor,
        icone: 'users'
      }
    ]);
  };

  const handleRemoveSocio = (index) => {
    if (editingSociosLista.length <= 1) {
      alert('É necessário manter ao menos 1 sócio cadastrado.');
      return;
    }
    const target = editingSociosLista[index];
    if (!confirm(`Remover o sócio "${target.nome}"? Os produtos vinculados a ele precisarão ser reatribuídos.`)) return;
    setEditingSociosLista(editingSociosLista.filter((_, idx) => idx !== index));
  };

  const handleUpdateEditingSocio = (index, field, value) => {
    setEditingSociosLista(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveSocios = async (e) => {
    e.preventDefault();
    try {
      setSavingSocios(true);
      const updated = await saveSociosLista(editingSociosLista);
      setSociosLista(updated);
      setIsSociosModalOpen(false);
      await carregarDados();
    } catch (err) {
      alert('Erro ao salvar sócios: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingSocios(false);
    }
  };

  const handleChangeProductSocio = async (prodId, newSocio) => {
    try {
      setSavingProductId(prodId);
      await updateProdutoSocio(prodId, newSocio);
      setProdutosSocios(prev => prev.map(p => p.id === prodId ? { ...p, socio: newSocio } : p));
      // Recarregar cálculo
      const res = await getRateio({ periodo });
      setData(res);
    } catch (err) {
      alert('Erro ao atualizar sócio do produto');
    } finally {
      setSavingProductId(null);
    }
  };

  const handleAutoAtribuir = async () => {
    if (!confirm('Deseja restaurar a atribuição padrão? (Espetinhos -> Alex, Bebidas/Pão de Queijo -> Heitor, Cookies -> Pais)')) return;
    try {
      setLoading(true);
      await autoAtribuirSocios();
      await carregarDados();
      alert('Atribuição padrão restaurada com sucesso!');
    } catch (err) {
      alert('Erro ao reatribuir sócios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-5 pb-24">
      
      {/* ========================================================================= */}
      {/* CABEÇALHO DA PÁGINA COM FILTROS & AÇÕES */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-950/50">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                Rateio & Divisão de Sócios
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Gestão de rateio e conciliação financeira entre sócios e despesas operacionais
              </p>
            </div>
          </div>
        </div>

        {/* Filtro de Período & Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Período */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex items-center">
            <button
              onClick={() => setPeriodo('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                periodo === 'todos' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Toda a Feira
            </button>
            <button
              onClick={() => setPeriodo('hoje')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                periodo === 'hoje' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodo('ontem')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                periodo === 'ontem' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ontem
            </button>
          </div>

          {/* Botão Copiar WhatsApp */}
          <button
            onClick={handleCopyWhatsapp}
            className={`h-10 px-3.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 shadow border ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-950'
                : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
            }`}
            title="Copiar resumo completo formatado para colar no grupo do WhatsApp"
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

          {/* Botão Gerenciar Sócios */}
          <button
            onClick={handleOpenSociosModal}
            className="h-10 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow border bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/40 hover:border-purple-400"
            title="Adicionar, editar e organizar os sócios do evento"
          >
            <Users className="w-4 h-4" />
            <span>Sócios ({sociosLista.length})</span>
          </button>

          {/* Botão Atualizar */}
          <button
            onClick={carregarDados}
            disabled={loading}
            className="h-10 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Recarregar vendas em tempo real"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVEGAÇÃO DE SUB-ABAS (Resumo & Acerto | Custos da Tenda | Produtos por Sócio) */}
      {/* ========================================================================= */}
      <div 
        className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto touch-pan-x scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          onClick={() => setActiveSubTab('resumo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all shadow-sm ${
            activeSubTab === 'resumo'
              ? 'bg-amber-500 text-slate-950 shadow-amber-950/40'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Balanço & Acerto de Contas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('custos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all shadow-sm ${
            activeSubTab === 'custos'
              ? 'bg-amber-500 text-slate-950 shadow-amber-950/40'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Custos da Tenda ({formatPrice(data?.totais_gerais?.custo_total_evento || 2050)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('produtos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all shadow-sm ${
            activeSubTab === 'produtos'
              ? 'bg-amber-500 text-slate-950 shadow-amber-950/40'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Atribuição dos Produtos</span>
        </button>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-400">
          <RefreshCw className="w-10 h-10 animate-spin text-amber-500 mb-3" />
          <p className="font-bold text-slate-300">Calculando divisão e conciliação de contas...</p>
        </div>
      ) : activeSubTab === 'resumo' ? (
        <>
          {/* ========================================================================= */}
          {/* 1. CARDS DE RESUMO GERAL DO EVENTO */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Geral */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Faturamento Total
              </span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                {formatPrice(data?.totais_gerais?.faturamento_total)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                {data?.totais_gerais?.total_pedidos} pedidos
              </span>
            </div>

            {/* Maquininha Alex (Débito + Crédito) */}
            <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-3.5 flex flex-col justify-between shadow">
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
                <span>Maquininha Alex</span>
                <CreditCard className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-purple-300 font-mono mt-1">
                {formatPrice(data?.totais_gerais?.total_cartao)}
              </span>
              <span className="text-[10px] text-purple-400/80 mt-1">
                Déb: {formatPrice(data?.totais_gerais?.total_debito)} &bull; Créd: {formatPrice(data?.totais_gerais?.total_credito)}
              </span>
            </div>

            {/* PIX Pais */}
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-3.5 flex flex-col justify-between shadow">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                <span>PIX Pais</span>
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono mt-1">
                {formatPrice(data?.totais_gerais?.total_pix)}
              </span>
              <span className="text-[10px] text-emerald-400/80 mt-1">
                Recebido direto na conta
              </span>
            </div>

            {/* Dinheiro Gaveta */}
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col justify-between shadow">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                <span>Dinheiro Gaveta</span>
                <Banknote className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1">
                {formatPrice(data?.totais_gerais?.total_dinheiro)}
              </span>
              <span className="text-[10px] text-amber-400/80 mt-1">
                Disponível para acertos
              </span>
            </div>

            {/* Custos Tenda */}
            <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-3.5 flex flex-col justify-between shadow">
              <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">
                Custos Tenda
              </span>
              <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono mt-1">
                -{formatPrice(data?.totais_gerais?.custo_total_evento)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                Estande + Net + Estac.
              </span>
            </div>

            {/* Lucro Líquido Geral */}
            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/50 rounded-2xl p-3.5 flex flex-col justify-between shadow">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                Lucro Líquido Tenda
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                {formatPrice(data?.totais_gerais?.lucro_liquido_total)}
              </span>
              <span className="text-[10px] text-emerald-500/80 mt-1">
                Após quitar custos fixos
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. SÓCIOS DO EVENTO: RAIO-X INDIVIDUAL */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.socios_lista || []).map((socio, idx) => {
              const borderCor = socio.id === 'alex' ? 'border-purple-500/40' : socio.id === 'pais' ? 'border-amber-500/40' : socio.id === 'heitor' ? 'border-emerald-500/40' : idx % 3 === 0 ? 'border-purple-500/40' : idx % 3 === 1 ? 'border-emerald-500/40' : 'border-amber-500/40';
              const textCor = socio.id === 'alex' ? 'text-purple-400' : socio.id === 'pais' ? 'text-amber-400' : socio.id === 'heitor' ? 'text-emerald-400' : idx % 3 === 0 ? 'text-purple-400' : idx % 3 === 1 ? 'text-emerald-400' : 'text-amber-400';
              const bgCor = socio.id === 'alex' ? 'bg-purple-950' : socio.id === 'pais' ? 'bg-amber-950' : socio.id === 'heitor' ? 'bg-emerald-950' : idx % 3 === 0 ? 'bg-purple-950' : idx % 3 === 1 ? 'bg-emerald-950' : 'bg-amber-950';

              return (
                <div key={socio.id} className={`bg-slate-900/95 border-2 ${borderCor} rounded-3xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden`}>
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl ${bgCor} border border-slate-700/60 flex items-center justify-center ${textCor}`}>
                          {socio.icone === 'beef' ? <Beef className="w-5 h-5" /> :
                           socio.icone === 'cupsoda' || socio.icone === 'cup-soda' ? <CupSoda className="w-5 h-5" /> :
                           socio.icone === 'cake' ? <Cake className="w-5 h-5" /> :
                           <Users className="w-5 h-5" />}
                        </div>
                        <div>
                          <h2 className="font-black text-lg text-white">{socio.nome}</h2>
                          <span className={`text-xs font-bold ${textCor}`}>{socio.papel || 'Sócio'}</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 ${bgCor}/90 ${textCor} border border-slate-700/60 rounded-full font-mono font-bold`}>
                        {socio.quantidade_itens || 0} un
                      </span>
                    </div>

                    <div className="space-y-2 mt-4 text-xs font-mono">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Vendas Brutas:</span>
                        <span className="font-bold text-white font-sans text-sm">
                          {formatPrice(socio.vendas_brutas)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-rose-400">
                        <span>Custos Atribuídos:</span>
                        <span>-{formatPrice(socio.custos_atribuidos)}</span>
                      </div>
                      {socio.adiantamentos > 0 && (
                        <div className="flex items-center justify-between text-blue-400">
                          <span>Adiantamentos (Reembolso):</span>
                          <span>+{formatPrice(socio.adiantamentos)}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between font-bold text-sm">
                        <span className="text-slate-300">Direito Líquido:</span>
                        <span className="text-emerald-400 font-black">
                          {formatPrice(socio.direito_liquido)}
                        </span>
                      </div>
                    </div>

                    {/* O que caiu na conta dele */}
                    <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Recebido em Conta ({socio.recebe_por === 'cartao' ? 'Cartão' : socio.recebe_por === 'pix' ? 'PIX' : socio.recebe_por === 'todos' ? 'Cartão + PIX' : 'Nenhum'}):</span>
                        <span className={`font-mono font-bold ${textCor}`}>
                          {formatPrice(socio.posse_em_conta)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status do Balanço */}
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    {socio.saldo_balanco > 0.05 ? (
                      <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-rose-400 block">
                            Diferença a Repassar
                          </span>
                          <p className="text-xs text-rose-300 font-medium">
                            Recebeu a mais na conta
                          </p>
                        </div>
                        <span className="text-base font-black text-rose-400 font-mono">
                          Repassa {formatPrice(socio.saldo_balanco)}
                        </span>
                      </div>
                    ) : socio.saldo_balanco < -0.05 ? (
                      <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 block">
                            Saldo a Receber
                          </span>
                          <p className="text-xs text-emerald-300 font-medium">
                            Tem crédito a receber
                          </p>
                        </div>
                        <span className="text-base font-black text-emerald-400 font-mono">
                          Recebe {formatPrice(Math.abs(socio.saldo_balanco))}
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-center text-xs text-emerald-300 font-bold">
                        ✓ Contas 100% quitadas
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* 3. DESTAQUE SUPREMO: PLANO DE ACERTO DE CONTAS (PASSO A PASSO DA LIQUIDAÇÃO) */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/30 pb-3">
              <div>
                <span className="text-xs uppercase font-black tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Instruções de Acerto Financeiro
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  Como Liquidar e Dividir os Valores Corretamente
                </h3>
              </div>

              <span className="text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                Gaveta Caixa: <b className="text-amber-400 font-mono">{formatPrice(data?.posse_caixa?.dinheiro_gaveta)}</b>
              </span>
            </div>

            {/* Lista dos Passos */}
            {data?.passos_liquidacao && data.passos_liquidacao.length > 0 ? (
              <div className="space-y-3">
                {data.passos_liquidacao.map((passo, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-2xl border flex items-start sm:items-center justify-between gap-3 ${
                      passo.tipo === 'dinheiro_gaveta'
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                        : passo.tipo === 'transferencia_pix'
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 mt-0.5 sm:mt-0 ${
                        passo.tipo === 'dinheiro_gaveta'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500 text-slate-950'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black uppercase tracking-wide bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                            {passo.tipo === 'dinheiro_gaveta' ? '💵 Dinheiro em Espécie' : '📱 Transferência PIX'}
                          </span>
                          <span className="font-bold text-white text-xs">
                            {passo.de} &rarr; {passo.para}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-slate-200 mt-1">
                          {passo.descricao}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-lg sm:text-xl font-mono text-white block">
                        {formatPrice(passo.valor)}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-2.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    Após concluir esses repasses, os custos da tenda estarão 100% quitados e cada um terá recebido exatamente o lucro de suas vendas!
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="font-bold text-slate-200 text-base">As contas já estão 100% equilibradas!</p>
                <p className="text-xs text-slate-500 mt-1">Nenhum repasse ou transferência pendente no momento.</p>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 4. ITENS VENDIDOS POR SÓCIO */}
          {/* ========================================================================= */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="font-black text-base text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Detalhamento de Itens Vendidos por Sócio
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {data?.itens_detalhados && data.itens_detalhados.map((it, idx) => (
                <div 
                  key={idx}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-white block truncate">{it.nome}</span>
                    <span className="text-[10px] font-black uppercase text-amber-400">
                      👤 {it.socio_nome || it.socio}
                    </span>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className="text-slate-400 block">{it.quantidade}x</span>
                    <span className="font-bold text-amber-300">{formatPrice(it.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : activeSubTab === 'custos' ? (
        /* ========================================================================= */
        /* ABA: GESTÃO FLEXÍVEL DE CUSTOS DA TENDA */
        /* ========================================================================= */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-white">Custos de Exposição da Tenda</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Custos operacionais e despesas compartilhadas entre os sócios.
              </p>
            </div>

            <button
              onClick={handleOpenNewCusto}
              className="h-11 px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Adicionar Despesa</span>
            </button>
          </div>

          {/* Tabela de Custos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider">
                  <th className="py-3 px-3">Despesa / Descrição</th>
                  <th className="py-3 px-3 text-right">Valor Total</th>
                  <th className="py-3 px-3">Divisão</th>
                  <th className="py-3 px-3">Pago Por</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {data?.custos_evento && data.custos_evento.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-3 font-black text-sm text-white">
                      {c.descricao}
                      {c.observacoes && (
                        <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                          {c.observacoes}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-base text-rose-400 font-mono">
                      {formatPrice(c.valor)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-500/40 text-[11px] font-bold">
                        {c.divisao === 'todos' ? '👥 Todos os Sócios' :
                         c.divisao === 'alex_heitor' ? '🤝 Alex & Heitor (50% cada)' :
                         typeof c.divisao === 'string' && c.divisao.startsWith('somente_') ? `👤 Somente ${sociosLista.find(s => s.id === c.divisao.replace('somente_', ''))?.nome || c.divisao.replace('somente_', '')}` :
                         `👤 ${sociosLista.find(s => s.id === c.divisao)?.nome || c.divisao}`}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-medium">
                      {c.pago_por === 'caixa' ? '💵 Gaveta do Caixa' :
                       `👤 ${sociosLista.find(s => s.id === c.pago_por)?.nome || c.pago_por}`}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditCusto(c)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                          title="Editar despesa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCusto(c.id, c.descricao)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/40"
                          title="Excluir despesa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ABA: ATRIBUIÇÃO DOS PRODUTOS AOS SÓCIOS */
        /* ========================================================================= */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-white">Quem é o Dono de Cada Produto?</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina qual sócio recebe o faturamento de cada item vendido.
              </p>
            </div>

            <button
              onClick={handleAutoAtribuir}
              className="h-10 px-3.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-xs font-bold transition-all"
            >
              Restaurar Padrão Automático
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {produtosSocios.map((prod) => (
              <div 
                key={prod.id}
                className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-sm text-white truncate">{prod.nome}</h4>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {formatPrice(prod.preco)}
                  </span>
                </div>

                <div className="shrink-0">
                  <select
                    value={prod.socio || sociosLista[0]?.id || 'socio_1'}
                    disabled={savingProductId === prod.id}
                    onChange={(e) => handleChangeProductSocio(prod.id, e.target.value)}
                    className="text-xs font-black px-3 py-2 rounded-xl border bg-slate-900 border-slate-700 text-white focus:outline-none"
                  >
                    {sociosLista.map((s) => (
                      <option key={s.id} value={s.id}>
                        👤 {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE ADICIONAR / EDITAR CUSTO DA TENDA */}
      {/* ========================================================================= */}
      {isCustoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-lg text-white">
              {editingCusto ? 'Editar Custo da Tenda' : 'Adicionar Nova Despesa'}
            </h3>

            <form onSubmit={handleSaveCusto} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Descrição da Despesa:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gelo, Carvão, Guardanapos..."
                  value={custoForm.descricao}
                  onChange={(e) => setCustoForm({ ...custoForm, descricao: e.target.value })}
                  className="w-full h-11 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-sm text-white font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Valor Total (R$):
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={custoForm.valor}
                  onChange={(e) => setCustoForm({ ...custoForm, valor: e.target.value })}
                  className="w-full h-11 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-amber-400 font-mono font-black focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Como deve ser dividido?
                </label>
                <select
                  value={custoForm.divisao}
                  onChange={(e) => setCustoForm({ ...custoForm, divisao: e.target.value })}
                  className="w-full h-11 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                >
                  <option value="todos">👥 Todos os Sócios (Divisão Igualitária)</option>
                  {sociosLista.map(s => (
                    <option key={s.id} value={`somente_${s.id}`}>👤 Somente {s.nome} (100%)</option>
                  ))}
                  {sociosLista.some(s => s.id === 'alex') && sociosLista.some(s => s.id === 'heitor') && (
                    <option value="alex_heitor">🤝 Alex & Heitor (50% cada - Legado)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Quem pagou / adiantou essa despesa?
                </label>
                <select
                  value={custoForm.pago_por}
                  onChange={(e) => setCustoForm({ ...custoForm, pago_por: e.target.value })}
                  className="w-full h-11 bg-slate-950 border border-slate-700 rounded-xl px-3 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                >
                  <option value="caixa">💵 Saiu da Gaveta do Caixa (Dinheiro)</option>
                  {sociosLista.map(s => (
                    <option key={s.id} value={s.id}>👤 Adiantado por {s.nome} do próprio bolso</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Observações (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Compra urgente no mercado..."
                  value={custoForm.observacoes}
                  onChange={(e) => setCustoForm({ ...custoForm, observacoes: e.target.value })}
                  className="w-full h-10 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustoModalOpen(false)}
                  className="h-11 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-11 px-5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl font-black text-xs shadow-lg"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE GERENCIAMENTO DE SÓCIOS */}
      {/* ========================================================================= */}
      {isSociosModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-purple-500/60 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">Gerenciar Sócios</h3>
                  <p className="text-xs text-slate-400">Adicione, edite ou remova sócios e defina onde recebem</p>
                </div>
              </div>
              <button
                onClick={() => setIsSociosModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {editingSociosLista.map((s, idx) => (
                <div key={s.id || idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                      Sócio #{idx + 1}
                    </span>
                    {editingSociosLista.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSocio(idx)}
                        className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/40 text-xs flex items-center gap-1"
                        title="Remover sócio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Nome do Sócio:
                      </label>
                      <input
                        type="text"
                        required
                        value={s.nome}
                        onChange={(e) => handleUpdateEditingSocio(idx, 'nome', e.target.value)}
                        placeholder="Ex: Mateus, Alex, etc."
                        className="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-2.5 text-xs text-white font-bold focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Papel / Produtos:
                      </label>
                      <input
                        type="text"
                        value={s.papel || ''}
                        onChange={(e) => handleUpdateEditingSocio(idx, 'papel', e.target.value)}
                        placeholder="Ex: Espetinhos, Bebidas..."
                        className="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Onde recebe vendas?
                      </label>
                      <select
                        value={s.recebe_por || 'nenhum'}
                        onChange={(e) => handleUpdateEditingSocio(idx, 'recebe_por', e.target.value)}
                        className="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-2 text-xs text-white font-bold focus:border-purple-500 focus:outline-none"
                      >
                        <option value="nenhum">Nenhum (Recebe no acerto final)</option>
                        <option value="cartao">Cartão (Débito + Crédito na maquininha)</option>
                        <option value="pix">PIX (Chave direta na conta)</option>
                        <option value="todos">Todos (Cartão + PIX)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Cor de Destaque:
                      </label>
                      <div className="flex items-center gap-1.5 h-9">
                        {['#a855f7', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4'].map((cor) => (
                          <button
                            key={cor}
                            type="button"
                            onClick={() => handleUpdateEditingSocio(idx, 'cor', cor)}
                            style={{ backgroundColor: cor }}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              s.cor === cor ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddSocio}
                className="w-full py-2.5 rounded-xl border border-dashed border-purple-500/50 hover:border-purple-400 hover:bg-purple-950/20 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Adicionar Mais Um Sócio</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSociosModalOpen(false)}
                className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingSocios}
                onClick={handleSaveSocios}
                className="h-10 px-5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-xl font-black text-xs shadow-lg flex items-center gap-1.5"
              >
                {savingSocios && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Salvar Sócios</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
