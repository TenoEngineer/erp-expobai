import React, { useState, useEffect } from 'react';
import { Save, Check } from 'lucide-react';
import { saveConfig } from '../../services/api';

export default function ConfigManagement({ config = {}, onRefresh }) {
  const [formData, setFormData] = useState({
    nome_estande: '',
    chave_pix: '',
    prefixo_pedido: 'EXP'
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        nome_estande: config.nome_estande || 'Tenda dos Müller',
        chave_pix: config.chave_pix || 'pix@expobai.com.br',
        prefixo_pedido: config.prefixo_pedido || 'EXP'
      });
    }
  }, [config]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveConfig(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onRefresh();
    } catch (err) {
      alert('Erro ao salvar configurações: ' + err.message);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h3 className="font-bold text-lg text-slate-100">Configurações do Estande</h3>
        <p className="text-xs text-slate-400">
          Ajuste as informações da sua barraca na Expobai e chave PIX para recebimentos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
            Nome do Estande / Barraca
          </label>
          <input
            type="text"
            required
            value={formData.nome_estande}
            onChange={(e) => setFormData({ ...formData, nome_estande: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
            Chave PIX para Recebimentos
          </label>
          <input
            type="text"
            required
            placeholder="CNPJ, E-mail, Celular ou Chave Aleatória"
            value={formData.chave_pix}
            onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Esta chave será convertida em QR Code dinâmico no modal de pagamento.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
            Prefixo do Pedido
          </label>
          <input
            type="text"
            required
            value={formData.prefixo_pedido}
            onChange={(e) => setFormData({ ...formData, prefixo_pedido: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="pt-2 flex items-center justify-between">
          {saved ? (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4" />
              Configurações salvas com sucesso!
            </span>
          ) : <div />}

          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>

      </form>
    </div>
  );
}
