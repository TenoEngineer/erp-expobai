import React, { useState, useEffect } from 'react';
import { Store, Plus, Users, DollarSign, ShoppingBag, ShieldCheck, CheckCircle2, XCircle, Copy, AlertCircle, RefreshCw, X } from 'lucide-react';
import { getTenants, createTenant, updateTenant, cloneCardapio } from '../services/api';

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [form, setForm] = useState({
    nome: '',
    responsavel: '',
    telefone: '',
    documento: '',
    admin_email: '',
    admin_senha: '',
    admin_pin: '1234',
    clonar_cardapio: true
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
        clonar_de: form.clonar_cardapio ? 'tenda-muller' : null
      });

      setSuccessMsg(`Tenda "${form.nome}" criada com sucesso!`);
      setModalOpen(false);
      setForm({
        nome: '',
        responsavel: '',
        telefone: '',
        documento: '',
        admin_email: '',
        admin_senha: '',
        admin_pin: '1234',
        clonar_cardapio: true
      });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao cadastrar nova tenda');
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
              Gestão de Tendas & Clientes (Super Admin)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Painel Mestre do ExpoERP • Cadastro de estandes e controle comercial do evento
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
              Faturamento Global
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
              Total de Pedidos
            </span>
            <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
              {totalPedidosGeral}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Segurança
            </span>
            <span className="text-sm font-bold text-emerald-300 mt-1 block">
              Blindagem JWT
            </span>
            <span className="text-[10px] text-slate-500">Isolamento PostgreSQL</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Lista de Tendas */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Tendas e Estandes Conectados
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {tenants.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Tenda / Slug</th>
                <th className="p-3.5">Responsável / Contato</th>
                <th className="p-3.5">Produtos</th>
                <th className="p-3.5">Pedidos</th>
                <th className="p-3.5">Faturamento</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="p-3.5 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div>{t.nome}</div>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {t.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-300">
                    <div>{t.responsavel || '-'}</div>
                    <span className="text-[11px] text-slate-500">{t.telefone || '-'}</span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">
                    {t.total_produtos || 0}
                  </td>
                  <td className="p-3.5 font-mono text-amber-400 font-bold">
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
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleClonar(t.id)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold border border-slate-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Clonar cardápio da Tenda Müller para esta tenda"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Clonar Cardápio</span>
                    </button>
                  </td>
                </tr>
              ))}

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

      {/* Modal de Cadastro de Nova Tenda */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Cadastrar Nova Tenda / Cliente</h3>
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
                  placeholder="Ex: Churrasco do Gaúcho"
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

              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                  Credenciais de Acesso do Cliente
                </span>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    E-mail do Administrador da Tenda *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                    placeholder="gaucho@expoerp.com.br"
                    className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Senha Inicial *
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
                      PIN Caixa Rápido (4 dígitos)
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
    </div>
  );
}
