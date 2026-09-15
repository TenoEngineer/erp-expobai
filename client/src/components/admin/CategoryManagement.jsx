import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { saveCategoria, deleteCategoria } from '../../services/api';

const AVAILABLE_ICONS = [
  'beef', 'cup-soda', 'cake', 'utensils', 'flame', 'coffee', 'wine', 'pizza', 'sandwich'
];

export default function CategoryManagement({ categories = [], onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    icone: 'utensils',
    cor: '#2D6A4F',
    ordem: 0
  });

  const handleOpenNew = () => {
    setEditingCat(null);
    setFormData({
      nome: '',
      icone: 'utensils',
      cor: '#2D6A4F',
      ordem: categories.length + 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCat(cat);
    setFormData({
      nome: cat.nome,
      icone: cat.icone || 'utensils',
      cor: cat.cor || '#2D6A4F',
      ordem: cat.ordem || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome) {
      alert('Nome da categoria é obrigatório');
      return;
    }
    try {
      await saveCategoria({
        ...formData,
        id: editingCat?.id
      });
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      alert('Erro ao salvar categoria: ' + err.message);
    }
  };

  const handleDelete = async (id, nome) => {
    if (confirm(`Excluir a categoria "${nome}"? Atenção: isso poderá impactar os produtos cadastrados nela.`)) {
      try {
        await deleteCategoria(id);
        onRefresh();
      } catch (err) {
        alert('Erro ao excluir categoria: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-4">
      
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-slate-100">Categorias de Produtos</h3>
          <p className="text-xs text-slate-400">
            Adicione e organize as abas de categorias que aparecem no caixa
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Categoria</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow"
                style={{ backgroundColor: cat.cor || '#2D6A4F' }}
              >
                🏷️
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">{cat.nome}</h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Ordem: {cat.ordem} | Ícone: {cat.icone}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenEdit(cat)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(cat.id, cat.nome)}
                className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100">
                {editingCat ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Porções"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Ícone
                </label>
                <select
                  value={formData.icone}
                  onChange={(e) => setFormData({ ...formData, icone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {AVAILABLE_ICONS.map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Cor Tema
                  </label>
                  <input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded-xl p-1 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    value={formData.ordem}
                    onChange={(e) => setFormData({ ...formData, ordem: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl text-xs font-black uppercase shadow-lg"
                >
                  Salvar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
