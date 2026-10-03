import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  AlertCircle, 
  RefreshCw, 
  X,
  Package,
  Layers,
  Edit,
  Tag
} from 'lucide-react';
import { getTenants, createTenant, updateTenant, cloneCardapio } from '../services/api';
import { MODULOS_CATALOGO } from '../constants/modulos';

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form de Criação de Tenda
  const [form, setForm] = useState({
    nome: '',
    responsavel: '',
    telefone: '',
    documento: '',
    admin_email: '',
    admin_senha: '',
    admin_pin: '1234',
    clonar_cardapio: true,
    modulos: ['core_pos', 'mod_fichas', 'mod_bi_horarios'],
    valor_plano: 600.00
  });

  // Form de Edição de Módulos
  const [editForm, setEditForm] = useState({
    modulos: [],
    valor_plano: 0
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTenants();
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar tendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recalcula o preço padrão somando os módulos selecionados
  const calculateTotal = (selectedModules) => {
    return selectedModules.reduce((acc, modId) => {
      const mod = MODULOS_CATALOGO.find(m => m.id === modId);
      return acc + (mod ? mod.preco_base : 0);
    }, 0);
  };

  const handleToggleModuleInCreate = (modId) => {
    if (modId === 'core_pos') return; // obrigatório
    const exists = form.modulos.includes(modId);
    const updated = exists 
      ? form.modulos.filter(m => m !== modId)
      : [...form.modulos, modId];
    
    setForm({
      ...form,
      modulos: updated,
      valor_plano: calculateTotal(updated)
    });
  };

  const handleToggleModuleInEdit = (modId) => {
    if (modId === 'core_pos') return; // obrigatório
    const exists = editForm.modulos.includes(modId);
    const updated = exists 
      ? editForm.modulos.filter(m => m !== modId)
      : [...editForm.modulos, modId];

    setEditForm({
      ...editForm,
      modulos: updated,
      valor_plano: calculateTotal(updated)
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const slug = form.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      await createTenant({
        id: slug,
        nome: form.nome,
        responsavel: form.responsavel,
        telefone: form.telefone,
        documento: form.documento,
        admin_email: form.admin_email,
        admin_senha: form.admin_senha,
        admin_pin: form.admin_pin,
        modulos: form.modulos,
        valor_plano: form.valor_plano,
        clonar_de: form.clonar_cardapio ? 'tenda-muller' : null
      });

      setSuccessMsg(`Tenda "${form.nome}" cadastrada com sucesso!`);
      setModalOpen(false);
      setForm({
        nome: '',
        responsavel: '',
        telefone: '',
        documento: '',
        admin_email: '',
        admin_senha: '',
        admin_pin: '1234',
        clonar_cardapio: true,
        modulos: ['core_pos', 'mod_fichas', 'mod_bi_horarios'],
        valor_plano: 600.00
      });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao cadastrar nova tenda');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (tenant) => {
    setSelectedTenant(tenant);
    let tenantMods = tenant.modulos;
    if (typeof tenantMods === 'string') {
      try { tenantMods = JSON.parse(tenantMods); } catch { tenantMods = ['core_pos']; }
    }
    if (!Array.isArray(tenantMods)) tenantMods = ['core_pos'];

    setEditForm({
      modulos: tenantMods,
      valor_plano: parseFloat(tenant.valor_plano) || calculateTotal(tenantMods)
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setActionLoading(true);
    try {
      await updateTenant(selectedTenant.id, {
        modulos: editForm.modulos,
        valor_plano: editForm.valor_plano
      });
      setSuccessMsg(`Módulos da tenda "${selectedTenant.nome}" atualizados com sucesso!`);
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      alert('Erro ao atualizar módulos: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAtivo = async (tenant) => {
    try {
      await updateTenant(tenant.id, { ativo: !tenant.ativo });
      loadData();
    } catch (err) {
      alert('Falha ao atualizar status da tenda');
    }
  };

  const handleClonar = async (tenantId) => {
    if (!window.confirm(`Deseja clonar o cardápio padrão da Tenda Müller para a tenda "${tenantId}"?`)) return;
    try {
      await cloneCardapio(tenantId, 'tenda-muller');
      alert('Cardápio clonado com sucesso!');
      loadData();
    } catch (err) {
      alert('Falha ao clonar cardápio: ' + (err.response?.data?.error || err.message));
    }
  };

  const totalFaturadoGeral = tenants.reduce((acc, t) => acc + (parseFloat(t.total_faturado) || 0), 0);
  const totalContratosGeral = tenants.reduce((acc, t) => acc + (parseFloat(t.valor_plano) || 0), 0);
  const totalPedidosGeral = tenants.reduce((acc, t) => acc + (parseInt(t.total_pedidos, 10) || 0), 0);
  const totalTendasAtivas = tenants.filter(t => t.ativo).length;

  const formatPrice = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Gestão de Tendas & Módulos (Super Admin)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Painel Comercial ExpoERP &bull; Controle de Licenças, Módulos e Faturamento
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 sm:flex-none h-11 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-[0.98] text-slate-950 font-black rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>Cadastrar Nova Tenda</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center justify-between text-emerald-300 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards de Métricas Gerais da Plataforma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tendas Cadastradas
            </span>
            <span className="text-2xl font-black text-white font-mono mt-1 block">
              {tenants.length} <span className="text-xs text-emerald-400 font-normal">({totalTendasAtivas} ativas)</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Vendas dos Clientes
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
              {formatPrice(totalFaturadoGeral)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Receita de Licenças / Módulos
            </span>
            <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
              {formatPrice(totalContratosGeral)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total de Pedidos Processados
            </span>
            <span className="text-2xl font-black text-indigo-400 font-mono mt-1 block">
              {totalPedidosGeral.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabela de Tendas */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            <h2 className="font-extrabold text-sm text-white uppercase tracking-wider">
              Tendas e Módulos Ativos
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {tenants.length} {tenants.length === 1 ? 'cliente' : 'clientes'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Tenda / Responsável</th>
                <th className="p-3.5">Módulos Contratados</th>
                <th className="p-3.5">Valor Licença</th>
                <th className="p-3.5">Pedidos</th>
                <th className="p-3.5">Faturamento PDV</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {tenants.map(t => {
                let mods = t.modulos;
                if (typeof mods === 'string') {
                  try { mods = JSON.parse(mods); } catch { mods = ['core_pos']; }
                }
                if (!Array.isArray(mods)) mods = ['core_pos'];

                return (
                  <tr key={t.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3.5 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div>{t.nome}</div>
                          <span className="text-[11px] text-slate-400 font-normal">{t.responsavel || '-'} {t.telefone ? `• ${t.telefone}` : ''}</span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Badges de Módulos */}
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {mods.map(mId => {
                          const mInfo = MODULOS_CATALOGO.find(m => m.id === mId);
                          return (
                            <span 
                              key={mId}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200"
                              title={mInfo?.descricao}
                            >
                              {mInfo ? mInfo.nome.split(' ')[0] : mId}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Preço do Contrato */}
                    <td className="p-3.5 font-mono text-amber-400 font-bold">
                      {formatPrice(t.valor_plano)}
                    </td>

                    <td className="p-3.5 font-mono text-slate-300">
                      {t.total_pedidos || 0}
                    </td>

                    <td className="p-3.5 font-mono text-emerald-400 font-bold">
                      {formatPrice(t.total_faturado)}
                    </td>

                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleAtivo(t)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                          t.ativo
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {t.ativo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{t.ativo ? 'Ativa' : 'Suspensa'}</span>
                      </button>
                    </td>

                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold border border-slate-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Editar Módulos Contratados e Valor do Plano"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Módulos</span>
                      </button>

                      <button
                        onClick={() => handleClonar(t.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold border border-slate-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Clonar cardápio da Tenda Müller para esta tenda"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Cardápio</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {tenants.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhuma tenda cadastrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro de Nova Tenda com Seleção de Módulos */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Cadastrar Nova Tenda & Módulos</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nome da Tenda / Estande *
                </label>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Pastelaria da Nona"
                  className="w-full h-11 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.responsavel}
                    onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                    placeholder="Nome do Dono"
                    className="w-full h-11 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    placeholder="(67) 99999-9999"
                    className="w-full h-11 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Seleção Modular de Funcionalidades */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                    Módulos Contratados (Venda Adicional)
                  </span>
                  <span className="text-xs text-emerald-400 font-bold font-mono">
                    Total: {formatPrice(form.valor_plano)}
                  </span>
                </div>

                <div className="space-y-2">
                  {MODULOS_CATALOGO.map(mod => {
                    const isChecked = form.modulos.includes(mod.id);
                    return (
                      <div 
                        key={mod.id}
                        onClick={() => handleToggleModuleInCreate(mod.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-white' 
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            disabled={mod.obrigatorio}
                            onChange={() => {}} // handled by parent div
                            className="w-4 h-4 text-emerald-500 rounded cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-2">
                              <span>{mod.nome}</span>
                              {mod.obrigatorio && (
                                <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-400 uppercase">Base</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1">{mod.descricao}</p>
                          </div>
                        </div>

                        <span className="text-xs font-mono font-bold text-amber-400 shrink-0 ml-2">
                          +{formatPrice(mod.preco_base)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Ajuste Manual de Preço */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                  <span className="text-xs text-slate-400 font-medium">Preço Final Negociado (R$):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.valor_plano}
                    onChange={(e) => setForm({ ...form, valor_plano: parseFloat(e.target.value) || 0 })}
                    className="w-28 h-8 px-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-right text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Credenciais de Acesso */}
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                  Credenciais de Acesso da Tenda
                </span>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    E-mail do Administrador *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                    placeholder="dono@exemplo.com"
                    className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Senha *
                    </label>
                    <input
                      type="password"
                      required
                      value={form.admin_senha}
                      onChange={(e) => setForm({ ...form, admin_senha: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      PIN Caixa Rápido
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={form.admin_pin}
                      onChange={(e) => setForm({ ...form, admin_pin: e.target.value.replace(/\D/g, '') })}
                      placeholder="1234"
                      className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-center font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-slate-300">
                <input
                  type="checkbox"
                  id="clonar_check"
                  checked={form.clonar_cardapio}
                  onChange={(e) => setForm({ ...form, clonar_cardapio: e.target.checked })}
                  className="w-4 h-4 text-emerald-500 rounded focus:ring-0 cursor-pointer"
                />
                <label htmlFor="clonar_check" className="cursor-pointer">
                  <b>Clonar cardápio padrão</b> (bebidas, porções e espetinhos da Tenda Müller) para o cliente não começar do zero.
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 active:scale-[0.98] text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-950 disabled:opacity-50"
                >
                  {actionLoading ? 'Criando...' : 'Confirmar e Ativar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Módulos de Tenda Existente */}
      {editModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Gerenciar Módulos Contratados</h3>
                  <span className="text-xs text-slate-400">{selectedTenant.nome}</span>
                </div>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-2">
                {MODULOS_CATALOGO.map(mod => {
                  const isChecked = editForm.modulos.includes(mod.id);
                  return (
                    <div 
                      key={mod.id}
                      onClick={() => handleToggleModuleInEdit(mod.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-white' 
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          disabled={mod.obrigatorio}
                          onChange={() => {}}
                          className="w-4 h-4 text-emerald-500 rounded cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-2">
                            <span>{mod.nome}</span>
                            {mod.obrigatorio && (
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-400 uppercase">Base</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{mod.descricao}</p>
                        </div>
                      </div>

                      <span className="text-xs font-mono font-bold text-amber-400 shrink-0 ml-2">
                        +{formatPrice(mod.preco_base)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Preço do Contrato */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Valor Total do Plano (R$):</span>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.valor_plano}
                  onChange={(e) => setEditForm({ ...editForm, valor_plano: parseFloat(e.target.value) || 0 })}
                  className="w-32 h-9 px-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-right text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 active:scale-[0.98] text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-950 disabled:opacity-50"
                >
                  {actionLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
