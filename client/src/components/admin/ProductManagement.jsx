import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  Check, 
  X, 
  Image as ImageIcon, 
  Power,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Tag
} from 'lucide-react';
import { 
  saveProduto, 
  updatePrecoProduto, 
  toggleAtivoProduto, 
  deleteProduto, 
  uploadFotoProduto 
} from '../../services/api';

export default function ProductManagement({ products = [], categories = [], onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    categoria_id: '',
    nome: '',
    descricao: '',
    preco: '',
    preco_custo: '',
    foto_url: '',
    ordem: 0,
    combos: [],
    is_combo: false,
    itens_combo: []
  });
  const [isUploading, setIsUploading] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [tempPrice, setTempPrice] = useState('');

  const parseJsonField = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  };

  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormData({
      categoria_id: categories[0]?.id || '',
      nome: '',
      descricao: '',
      preco: '',
      preco_custo: '',
      foto_url: '',
      ordem: 0,
      combos: [],
      is_combo: false,
      itens_combo: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormData({
      categoria_id: prod.categoria_id,
      nome: prod.nome,
      descricao: prod.descricao || '',
      preco: prod.preco,
      preco_custo: prod.preco_custo !== undefined ? String(prod.preco_custo) : '',
      foto_url: prod.foto_url || '',
      ordem: prod.ordem || 0,
      combos: parseJsonField(prod.combos),
      is_combo: Boolean(prod.is_combo),
      itens_combo: parseJsonField(prod.itens_combo)
    });
    setIsModalOpen(true);
  };

  const handleAddComboOption = () => {
    const combosAtuais = formData.combos || [];
    const nextQty = combosAtuais.length > 0 ? (combosAtuais[combosAtuais.length - 1].quantidade + 2) : 3;
    const basePreco = parseFloat(formData.preco) || 0;
    const baseCusto = parseFloat(formData.preco_custo) || 0;
    const suggestedPrice = basePreco > 0 ? (basePreco * nextQty * 0.9).toFixed(2) : '';
    const suggestedCost = (baseCusto * nextQty).toFixed(2);

    setFormData(prev => ({
      ...prev,
      combos: [
        ...(prev.combos || []),
        {
          id: 'combo-' + Date.now(),
          titulo: `Combo ${nextQty} unidades`,
          quantidade: nextQty,
          preco: suggestedPrice,
          preco_custo: suggestedCost
        }
      ]
    }));
  };

  const handleUpdateComboOption = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.combos || [])];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantidade' && parseFloat(formData.preco_custo) > 0) {
        updated[index].preco_custo = (parseFloat(formData.preco_custo) * parseInt(value || 1, 10)).toFixed(2);
      }
      return { ...prev, combos: updated };
    });
  };

  const handleRemoveComboOption = (index) => {
    setFormData(prev => ({
      ...prev,
      combos: prev.combos.filter((_, i) => i !== index)
    }));
  };

  const handleAddBundleItem = (prodId) => {
    const prod = products.find(p => p.id === Number(prodId));
    if (!prod) return;
    setFormData(prev => {
      const existing = (prev.itens_combo || []).find(i => i.produto_id === prod.id);
      let newItens;
      if (existing) {
        newItens = prev.itens_combo.map(i => i.produto_id === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      } else {
        newItens = [...(prev.itens_combo || []), { produto_id: prod.id, nome: prod.nome, quantidade: 1, preco: prod.preco, preco_custo: prod.preco_custo }];
      }
      const totalCusto = newItens.reduce((acc, it) => acc + (parseFloat(it.preco_custo || 0) * it.quantidade), 0);
      return {
        ...prev,
        itens_combo: newItens,
        preco_custo: prev.preco_custo ? prev.preco_custo : (totalCusto > 0 ? String(totalCusto) : '')
      };
    });
  };

  const handleRemoveBundleItem = (prodId) => {
    setFormData(prev => ({
      ...prev,
      itens_combo: (prev.itens_combo || []).filter(i => i.produto_id !== prodId)
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await uploadFotoProduto(file);
      setFormData(prev => ({ ...prev, foto_url: res.url }));
    } catch (err) {
      alert('Erro ao fazer upload da imagem: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.preco || !formData.categoria_id) {
      alert('Preencha os campos obrigatórios (Nome, Preço e Categoria)');
      return;
    }
    try {
      await saveProduto({
        ...formData,
        id: editingProduct?.id,
        preco: parseFloat(formData.preco),
        preco_custo: parseFloat(formData.preco_custo) || 0,
        combos: (formData.combos || []).map(c => ({
          ...c,
          quantidade: parseInt(c.quantidade, 10) || 1,
          preco: parseFloat(c.preco) || 0,
          preco_custo: parseFloat(c.preco_custo) || 0
        })),
        is_combo: Boolean(formData.is_combo),
        itens_combo: formData.itens_combo || []
      });
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      alert('Erro ao salvar produto: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleToggleAtivo = async (id) => {
    try {
      await toggleAtivoProduto(id);
      onRefresh();
    } catch (err) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  const handleDelete = async (id, nome) => {
    if (confirm(`Tem certeza que deseja excluir o produto "${nome}"?`)) {
      try {
        await deleteProduto(id);
        onRefresh();
      } catch (err) {
        alert('Erro ao excluir produto: ' + err.message);
      }
    }
  };

  const handleSavePrice = async (id) => {
    try {
      await updatePrecoProduto(id, parseFloat(tempPrice));
      setEditingPriceId(null);
      onRefresh();
    } catch (err) {
      alert('Erro ao alterar preço: ' + err.message);
    }
  };

  const formatPrice = (value) => {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ações Superior */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-slate-100">Cardápio de Produtos</h3>
          <p className="text-xs text-slate-400">
            Gerencie preços, fotos e disponibilidade de cada item
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-16">Foto</th>
                <th className="p-3.5">Nome do Produto</th>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5">Preço Venda</th>
                <th className="p-3.5">Custo Unit.</th>
                <th className="p-3.5 text-center">Margem Est.</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                  
                  {/* Foto */}
                  <td className="p-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                      {prod.foto_url ? (
                        <img src={prod.foto_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                  </td>

                  {/* Nome e Descrição */}
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-100 text-sm">{prod.nome}</span>
                      {prod.is_combo && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-950 text-purple-300 border border-purple-500/40">
                          KIT MISTO
                        </span>
                      )}
                      {(Array.isArray(prod.combos) ? prod.combos.length : parseJsonField(prod.combos).length) > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-950 text-amber-300 border border-amber-500/40">
                          🎁 {(Array.isArray(prod.combos) ? prod.combos : parseJsonField(prod.combos)).length} COMBOS
                        </span>
                      )}
                    </div>
                    {prod.descricao && (
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{prod.descricao}</div>
                    )}
                  </td>

                  {/* Categoria */}
                  <td className="p-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                      {prod.categoria_nome || 'Sem Categoria'}
                    </span>
                  </td>

                  {/* Preço de Venda */}
                  <td className="p-3">
                    {editingPriceId === prod.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          className="w-20 bg-slate-950 border border-amber-500 rounded px-2 py-1 text-xs text-white font-mono"
                        />
                        <button
                          onClick={() => handleSavePrice(prod.id)}
                          className="p-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingPriceId(null)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPriceId(prod.id);
                          setTempPrice(prod.preco);
                        }}
                        title="Clique para alterar preço"
                        className="group flex items-center gap-1.5 font-bold font-mono text-emerald-400 hover:text-emerald-300 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-emerald-500/50 transition-all"
                      >
                        <span>{formatPrice(prod.preco)}</span>
                        <DollarSign className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                      </button>
                    )}
                  </td>

                  {/* Preço de Custo */}
                  <td className="p-3 font-mono text-slate-300">
                    {formatPrice(prod.preco_custo || 0)}
                  </td>

                  {/* Margem */}
                  <td className="p-3 text-center">
                    {(() => {
                      const pv = parseFloat(prod.preco) || 0;
                      const pc = parseFloat(prod.preco_custo) || 0;
                      if (pv <= 0) return <span className="text-slate-600">-</span>;
                      const margem = ((pv - pc) / pv) * 100;
                      const isGood = margem >= 40;
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          isGood ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        }`}>
                          {margem.toFixed(1)}%
                        </span>
                      );
                    })()}
                  </td>

                  {/* Status Ativo/Inativo */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggleAtivo(prod.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 transition-all ${
                        prod.ativo === 1
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      <span>{prod.ativo === 1 ? 'Ativo' : 'Esgotado'}</span>
                    </button>
                  </td>

                  {/* Ações */}
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title="Editar produto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id, prod.nome)}
                        className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 rounded-lg transition-colors"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span>{editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Espetinho de Picanha"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formData.categoria_id}
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1">
                    Preço de Venda Unit. (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1">
                    Preço de Custo Unit. (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.preco_custo}
                    onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Indicador de Margem Projetada */}
              {formData.preco && (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] flex items-center justify-between font-mono">
                  <span className="text-slate-400">
                    Lucro Bruto Unitário: <b className="text-emerald-400">{formatPrice(Math.max(0, (parseFloat(formData.preco) || 0) - (parseFloat(formData.preco_custo) || 0)))}</b>
                  </span>
                  <span className="text-slate-400">
                    Margem Projetada:{' '}
                    <b className="text-amber-400">
                      {parseFloat(formData.preco) > 0 
                        ? (((parseFloat(formData.preco) - (parseFloat(formData.preco_custo) || 0)) / parseFloat(formData.preco)) * 100).toFixed(1) + '%' 
                        : '0%'}
                    </b>
                  </span>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SEÇÃO DE COMBOS & PREÇOS PROMOCIONAIS POR QUANTIDADE                      */}
              {/* ========================================================================= */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Combos & Preços Promocionais</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Cadastre preços especiais por quantidade (Ex: 3 unidades por R$ 25,00)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddComboOption}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Opção de Combo</span>
                  </button>
                </div>

                {(!formData.combos || formData.combos.length === 0) ? (
                  <div className="p-3 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                    Nenhum combo configurado para este item. Clique em "Adicionar Opção de Combo" acima para cadastrar promoções.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formData.combos.map((combo, idx) => {
                      const cPreco = parseFloat(combo.preco) || 0;
                      const cCusto = parseFloat(combo.preco_custo) || 0;
                      const cLucro = Math.max(0, cPreco - cCusto);
                      const cMargem = cPreco > 0 ? ((cLucro / cPreco) * 100).toFixed(1) : '0';

                      return (
                        <div key={combo.id || idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                Nome do Combo / Rótulo
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: Combo 3 Unidades"
                                value={combo.titulo}
                                onChange={(e) => handleUpdateComboOption(idx, 'titulo', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                Qtd de Itens
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={combo.quantidade}
                                onChange={(e) => handleUpdateComboOption(idx, 'quantidade', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-emerald-400 mb-0.5">
                                Preço do Combo (R$)
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={combo.preco}
                                  onChange={(e) => handleUpdateComboOption(idx, 'preco', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveComboOption(idx)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Remover opção de combo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Linha de Custo e Margem do Combo */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-900 text-[11px] font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">Custo Total:</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={combo.preco_custo}
                                onChange={(e) => handleUpdateComboOption(idx, 'preco_custo', e.target.value)}
                                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-amber-300 font-mono focus:outline-none"
                              />
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-slate-400">
                                Lucro: <b className="text-emerald-400">{formatPrice(cLucro)}</b>
                              </span>
                              <span className="text-amber-400 font-bold">
                                Margem: {cMargem}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* SEÇÃO KIT / COMBO MISTO (MÚLTIPLOS ITENS DIFERENTES)                      */}
              {/* ========================================================================= */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_combo}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_combo: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-300">
                    Este item é um Combo / Kit com múltiplos produtos diferentes (ex: 1 Cookie + 1 Refri)
                  </span>
                </label>

                {formData.is_combo && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 animate-in fade-in">
                    <p className="text-[11px] text-slate-400">
                      Selecione quais produtos do cardápio fazem parte deste combo:
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddBundleItem(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>+ Incluir produto no kit...</option>
                        {products.filter(p => p.id !== editingProduct?.id).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nome} - {formatPrice(p.preco)} (Custo: {formatPrice(p.preco_custo || 0)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {(formData.itens_combo || []).length > 0 && (
                      <div className="space-y-1 pt-1">
                        {formData.itens_combo.map((it) => (
                          <div key={it.produto_id} className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-xs">
                            <span className="font-bold text-slate-200">
                              {it.quantidade}x {it.nome}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 font-mono text-[11px]">
                                Custo acumulado: {formatPrice((parseFloat(it.preco_custo || 0) * it.quantidade))}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveBundleItem(it.produto_id)}
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Descrição ou Acompanhamentos
                </label>
                <input
                  type="text"
                  placeholder="Ex: Acompanha mandioca e farofa especial"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Upload ou Link da Foto */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Foto do Produto
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold transition-colors">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isUploading ? 'Enviando...' : 'Fazer Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-500">ou cole uma URL abaixo</span>
                  </div>

                  <input
                    type="url"
                    placeholder="https://exemplo.com/foto.jpg"
                    value={formData.foto_url}
                    onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg"
                >
                  Salvar Produto & Combos
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
