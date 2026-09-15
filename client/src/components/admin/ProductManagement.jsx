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
  DollarSign 
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
    foto_url: '',
    ordem: 0
  });
  const [isUploading, setIsUploading] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [tempPrice, setTempPrice] = useState('');

  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormData({
      categoria_id: categories[0]?.id || '',
      nome: '',
      descricao: '',
      preco: '',
      foto_url: '',
      ordem: 0
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
      foto_url: prod.foto_url || '',
      ordem: prod.ordem || 0
    });
    setIsModalOpen(true);
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
        preco: parseFloat(formData.preco)
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
                <th className="p-3.5">Preço (R$)</th>
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
                    <div className="font-bold text-slate-100 text-sm">{prod.nome}</div>
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

                  {/* Preço (com edição inline) */}
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
                        className="group flex items-center gap-1.5 font-bold font-mono text-amber-400 hover:text-amber-300 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-amber-500/50 transition-all"
                      >
                        <span>{formatPrice(prod.preco)}</span>
                        <DollarSign className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                      </button>
                    )}
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
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100">
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              
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

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
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

              <div className="pt-2 flex justify-end gap-2">
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
                  Salvar Produto
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
