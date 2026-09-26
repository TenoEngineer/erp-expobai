import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  DollarSign, 
  Package, 
  Tag, 
  Power, 
  Upload, 
  ImageIcon, 
  TrendingUp, 
  Percent,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  createProduto, 
  updateProduto, 
  deleteProduto, 
  toggleAtivoProduto, 
  uploadFotoProduto 
} from '../../services/api';

export default function ComboManagement({ products = [], categories = [], onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Categoria de combos
  const comboCategory = categories.find(c => c.nome.toLowerCase() === 'combos') || categories[0] || { id: 1 };

  // Produtos que NÃO são combos (para usar como ingredientes dos combos)
  const standaloneProducts = products.filter(p => !p.is_combo && p.categoria_nome?.toLowerCase() !== 'combos');

  // Combos existentes
  const parseJsonField = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  };

  const combosList = products.filter(p => 
    p.is_combo || 
    p.categoria_nome?.toLowerCase() === 'combos' || 
    (parseJsonField(p.itens_combo).length > 0)
  );

  // Estado do formulário
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    preco_custo: '',
    foto_url: '',
    ativo: 1,
    ordem: 0,
    itens_combo: []
  });

  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Cálculos financeiros do combo em edição
  const precoAvulsoTotal = (formData.itens_combo || []).reduce((acc, it) => {
    return acc + (parseFloat(it.preco || 0) * (parseInt(it.quantidade, 10) || 1));
  }, 0);

  const custoTotalCalculado = (formData.itens_combo || []).reduce((acc, it) => {
    return acc + (parseFloat(it.preco_custo || 0) * (parseInt(it.quantidade, 10) || 1));
  }, 0);

  const precoComboNum = parseFloat(formData.preco) || 0;
  const economiaCliente = Math.max(0, precoAvulsoTotal - precoComboNum);
  const economiaPct = precoAvulsoTotal > 0 ? ((economiaCliente / precoAvulsoTotal) * 100).toFixed(1) : 0;
  const lucroBruto = Math.max(0, precoComboNum - custoTotalCalculado);
  const margemPct = precoComboNum > 0 ? ((lucroBruto / precoComboNum) * 100).toFixed(1) : 0;

  // Abrir Modal para Novo Combo
  const handleOpenNew = () => {
    setEditingCombo(null);
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      preco_custo: '',
      foto_url: '',
      ativo: 1,
      ordem: 0,
      itens_combo: []
    });
    setIsModalOpen(true);
  };

  // Abrir Modal para Edição
  const handleOpenEdit = (combo) => {
    setEditingCombo(combo);
    const parsedItens = parseJsonField(combo.itens_combo);
    setFormData({
      nome: combo.nome,
      descricao: combo.descricao || '',
      preco: combo.preco,
      preco_custo: combo.preco_custo || '',
      foto_url: combo.foto_url || '',
      ativo: combo.ativo !== undefined ? combo.ativo : 1,
      ordem: combo.ordem || 0,
      itens_combo: parsedItens
    });
    setIsModalOpen(true);
  };

  // Adicionar produto ao combo
  const handleAddProductToCombo = (prodId) => {
    const prod = products.find(p => p.id === Number(prodId));
    if (!prod) return;

    setFormData(prev => {
      const existing = (prev.itens_combo || []).find(i => i.produto_id === prod.id);
      let updated;
      if (existing) {
        updated = prev.itens_combo.map(i => 
          i.produto_id === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      } else {
        updated = [
          ...(prev.itens_combo || []),
          {
            produto_id: prod.id,
            nome: prod.nome,
            quantidade: 1,
            preco: parseFloat(prod.preco) || 0,
            preco_custo: parseFloat(prod.preco_custo) || 0,
            categoria_nome: prod.categoria_nome || ''
          }
        ];
      }

      // Sugere descrição automática se estiver vazia
      const autoDesc = updated.map(i => `${i.quantidade}x ${i.nome}`).join(' + ');

      return {
        ...prev,
        itens_combo: updated,
        descricao: prev.descricao ? prev.descricao : `Inclui: ${autoDesc}`
      };
    });
  };

  // Alterar quantidade de um produto dentro do combo
  const handleUpdateItemQty = (prodId, delta) => {
    setFormData(prev => {
      const updated = (prev.itens_combo || []).map(it => {
        if (it.produto_id === prodId) {
          const newQty = Math.max(1, it.quantidade + delta);
          return { ...it, quantidade: newQty };
        }
        return it;
      });
      return { ...prev, itens_combo: updated };
    });
  };

  // Remover produto do combo
  const handleRemoveItem = (prodId) => {
    setFormData(prev => ({
      ...prev,
      itens_combo: (prev.itens_combo || []).filter(i => i.produto_id !== prodId)
    }));
  };

  // Sugestões de desconto rápido
  const handleApplyDiscountSuggestion = (percent) => {
    if (precoAvulsoTotal <= 0) return;
    const suggestedPrice = (precoAvulsoTotal * (1 - (percent / 100))).toFixed(2);
    setFormData(prev => ({ ...prev, preco: suggestedPrice }));
  };

  // Upload de Foto
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await uploadFotoProduto(file);
      setFormData(prev => ({ ...prev, foto_url: res.url }));
    } catch (err) {
      alert('Erro no upload de foto: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Salvar Combo (Criar ou Atualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      alert('Por favor, informe o nome do combo.');
      return;
    }
    if (!formData.itens_combo || formData.itens_combo.length === 0) {
      alert('Selecione pelo menos um produto para compor o combo.');
      return;
    }
    if (parseFloat(formData.preco) <= 0 || isNaN(parseFloat(formData.preco))) {
      alert('Por favor, informe um preço de venda válido para o combo.');
      return;
    }

    try {
      const payload = {
        categoria_id: comboCategory?.id || 5,
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim(),
        preco: parseFloat(formData.preco),
        preco_custo: custoTotalCalculado,
        foto_url: formData.foto_url || '',
        ordem: formData.ordem || 0,
        is_combo: true,
        itens_combo: formData.itens_combo,
        combos: []
      };

      if (editingCombo) {
        await updateProduto(editingCombo.id, payload);
      } else {
        await createProduto(payload);
      }

      setIsModalOpen(false);
      setSaveSuccessMsg(editingCombo ? 'Combo atualizado com sucesso!' : 'Novo combo criado com sucesso!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      onRefresh();
    } catch (err) {
      alert('Erro ao salvar combo: ' + (err.response?.data?.error || err.message));
    }
  };

  // Alternar Ativo/Esgotado
  const handleToggleAtivo = async (id) => {
    try {
      await toggleAtivoProduto(id);
      onRefresh();
    } catch (err) {
      alert('Erro ao alterar status do combo: ' + err.message);
    }
  };

  // Excluir Combo
  const handleDeleteCombo = async (id, nome) => {
    if (confirm(`Tem certeza que deseja excluir o combo "${nome}"?`)) {
      try {
        await deleteProduto(id);
        onRefresh();
      } catch (err) {
        alert('Erro ao excluir combo: ' + err.message);
      }
    }
  };

  // Combos filtrados pela busca
  const filteredCombos = combosList.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const matchName = c.nome.toLowerCase().includes(term);
    const matchDesc = c.descricao && c.descricao.toLowerCase().includes(term);
    const itens = parseJsonField(c.itens_combo);
    const matchItens = itens.some(i => i.nome.toLowerCase().includes(term));
    return matchName || matchDesc || matchItens;
  });

  return (
    <div className="space-y-6">
      
      {/* Banner de Notificação de Sucesso */}
      {saveSuccessMsg && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 p-3.5 rounded-2xl flex items-center justify-between shadow-xl text-emerald-200 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg('')} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DA SEÇÃO DE COMBOS PRÉ-PRONTOS                                */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-purple-950/60 shrink-0">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-100 flex items-center gap-2">
              <span>Combos & Promoções Pré-Prontas</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/30">
                {combosList.length} cadastrados
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Crie pacotes prontos combinando produtos do cardápio com preços fixos para venda rápida em 1 clique no PDV
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-950/50 border border-purple-400/40 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Combo Pré-Pronto</span>
        </button>
      </div>

      {/* Barra de Busca de Combos */}
      {combosList.length > 0 && (
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl">
          <Search className="w-4 h-4 text-slate-400 ml-1.5" />
          <input
            type="text"
            placeholder="Buscar combo por nome ou produto incluso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
            >
              Limpar
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GRID DE COMBOS PRÉ-CONFIGURADOS                                        */}
      {/* ========================================================================= */}
      {combosList.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl space-y-3">
          <div className="w-16 h-16 rounded-full bg-purple-950/60 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
            <Sparkles className="w-8 h-8 text-amber-300" />
          </div>
          <h4 className="font-bold text-slate-200 text-base">Nenhum combo pré-pronto cadastrado</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Combos pré-prontos facilitam a venda no balcão: você junta 1 Salgado + 1 Refrigerante (ou 3 unidades com desconto) e no caixa é só filtrar por "Combos" e clicar para vender!
          </p>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow border border-purple-400/30 inline-flex items-center gap-1.5 cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeiro Combo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCombos.map((combo) => {
            const itens = parseJsonField(combo.itens_combo);
            const somaAvulso = itens.reduce((acc, it) => acc + (parseFloat(it.preco || 0) * (it.quantidade || 1)), 0);
            const precoCombo = parseFloat(combo.preco) || 0;
            const economia = Math.max(0, somaAvulso - precoCombo);
            const custo = parseFloat(combo.preco_custo) || 0;
            const lucro = Math.max(0, precoCombo - custo);
            const margem = precoCombo > 0 ? ((lucro / precoCombo) * 100).toFixed(1) : 0;

            return (
              <div 
                key={combo.id}
                className="bg-slate-900 border border-purple-500/30 hover:border-purple-400/60 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3 transition-all relative overflow-hidden group"
              >
                {/* Faixa decorativa topo */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-500"></div>

                <div>
                  {/* Topo do Card com Nome, Foto e Status */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-purple-500/40 flex items-center justify-center shrink-0">
                        {combo.foto_url ? (
                          <img src={combo.foto_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Sparkles className="w-6 h-6 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-sm text-slate-100 group-hover:text-purple-300 transition-colors">
                            {combo.nome}
                          </span>
                        </div>
                        {combo.descricao && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {combo.descricao}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleAtivo(combo.id)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 transition-all shrink-0 ${
                        combo.ativo === 1
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      <Power className="w-2.5 h-2.5" />
                      <span>{combo.ativo === 1 ? 'Ativo' : 'Esgotado'}</span>
                    </button>
                  </div>

                  {/* Lista de Produtos Inclusos */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                      Itens Inclusos no Combo:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {itens.length === 0 ? (
                        <span className="text-[11px] text-slate-500 italic">Nenhum item configurado</span>
                      ) : (
                        itens.map((it, idx) => (
                          <span
                            key={idx}
                            className="bg-purple-950/70 border border-purple-500/40 text-purple-200 text-xs px-2 py-0.5 rounded-lg font-bold flex items-center gap-1"
                          >
                            <b className="text-amber-400 font-mono">{it.quantidade}x</b> {it.nome}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Preços, Desconto e Margem */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-end justify-between">
                    <div>
                      {somaAvulso > precoCombo && (
                        <span className="text-[11px] text-slate-400 line-through font-mono block">
                          Avulso: {formatPrice(somaAvulso)}
                        </span>
                      )}
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-black text-xl text-emerald-400 font-mono">
                          {formatPrice(precoCombo)}
                        </span>
                        {economia > 0 && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/40">
                            -{formatPrice(economia)} ({((economia / somaAvulso) * 100).toFixed(0)}% OFF)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-[11px] font-mono">
                      <span className="text-slate-400 block">
                        Custo Total: <b className="text-slate-300">{formatPrice(custo)}</b>
                      </span>
                      <span className="text-slate-400 block">
                        Lucro: <b className="text-emerald-400">{formatPrice(lucro)}</b> ({margem}%)
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(combo)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCombo(combo.id, combo.nome)}
                      className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL DE CADASTRO / EDIÇÃO DE COMBO PRÉ-PRONTO                         */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header Modal */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-950 border border-purple-500/40 text-purple-400">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    {editingCombo ? 'Editar Combo Pré-Pronto' : 'Criar Novo Combo Pré-Pronto'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecione os produtos que entram no combo e defina o valor final da promoção
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* 1. Nome do Combo */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nome do Combo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Combo 1: Pastel de Carne + Coca-Cola Lata"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* 2. Seleção dos Produtos Inclusos */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span>Produtos que compõem este Combo *</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {(formData.itens_combo || []).length} produto(s) selecionado(s)
                  </span>
                </div>

                {/* Dropdown para escolher produto do cardápio */}
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddProductToCombo(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full bg-slate-900 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>+ Clique para escolher um produto do cardápio e adicionar ao combo...</option>
                    {standaloneProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} — Venda: {formatPrice(p.preco)} (Custo: {formatPrice(p.preco_custo || 0)}) [{p.categoria_nome || 'Geral'}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lista de Produtos já adicionados ao combo */}
                {(!formData.itens_combo || formData.itens_combo.length === 0) ? (
                  <div className="p-4 bg-slate-900/60 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                    Nenhum produto adicionado ainda. Escolha os produtos no seletor acima.
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    {formData.itens_combo.map((it) => (
                      <div 
                        key={it.produto_id}
                        className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-100 block truncate">
                            {it.nome}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Avulso: {formatPrice(it.preco)} &bull; Custo: {formatPrice(it.preco_custo || 0)} cada
                          </span>
                        </div>

                        {/* Controle de Quantidade */}
                        <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(it.produto_id, -1)}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-amber-400 w-6 text-center">
                            {it.quantidade}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(it.produto_id, 1)}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal do item */}
                        <div className="text-right font-mono min-w-[70px]">
                          <span className="text-xs text-slate-200 font-bold block">
                            {formatPrice(parseFloat(it.preco || 0) * it.quantidade)}
                          </span>
                        </div>

                        {/* Botão Remover */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.produto_id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                          title="Remover produto do combo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Definição do Preço do Combo & Sugestões */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Valor do Combo (Preço de Venda) *</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Soma avulsa: <b className="text-slate-200">{formatPrice(precoAvulsoTotal)}</b>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono text-xs">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 20.00"
                      value={formData.preco}
                      onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                      className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl pl-9 pr-3 py-2 text-sm text-emerald-300 font-mono font-black focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  {/* Sugestões de Desconto Rápido */}
                  {precoAvulsoTotal > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold mr-1">Sugestões:</span>
                      {[5, 10, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleApplyDiscountSuggestion(pct)}
                          className="px-2 py-1 bg-slate-900 hover:bg-purple-950 text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold transition-all"
                        >
                          {pct}% OFF
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumo Financeiro em Tempo Real */}
                {precoComboNum > 0 && (
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-[11px] font-mono grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Soma Avulsa:</span>
                      <span className="text-slate-300 font-bold">{formatPrice(precoAvulsoTotal)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Economia Cliente:</span>
                      <span className="text-amber-400 font-bold">{formatPrice(economiaCliente)} ({economiaPct}%)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Custo Total (CMV):</span>
                      <span className="text-slate-300 font-bold">{formatPrice(custoTotalCalculado)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Lucro Bruto:</span>
                      <span className="text-emerald-400 font-bold">{formatPrice(lucroBruto)} ({margemPct}%)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Descrição Opcional */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Descrição do Combo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1 Pastel de Carne crocante + 1 Coca-Cola Lata gelada"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* 5. Foto do Combo */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Foto do Combo (Opcional)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    {formData.foto_url ? (
                      <img src={formData.foto_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer border border-slate-700">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Enviando...' : 'Carregar Foto do Computador'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="Ou cole a URL da imagem aqui"
                      value={formData.foto_url}
                      onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-950/50 border border-purple-400/40 cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCombo ? 'Salvar Alterações' : 'Criar Combo'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
