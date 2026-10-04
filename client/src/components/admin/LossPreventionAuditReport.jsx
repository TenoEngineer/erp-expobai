import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Trash2, 
  Edit3, 
  DollarSign, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  HelpCircle
} from 'lucide-react';
import { getAuditoriaPerdas } from '../../services/api';

export default function LossPreventionAuditReport({ config }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('caixas'); // 'caixas', 'cancelados', 'editados'

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getAuditoriaPerdas();
      setData(res);
    } catch (err) {
      console.error('Erro ao buscar auditoria de perdas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatPrice = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const ind = data?.indicadores || {};
  const caixas = data?.auditoria_caixas || [];
  const cancelados = data?.pedidos_cancelados || [];
  const editados = data?.pedidos_editados || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              Auditoria de Cancelamentos &amp; Prevenção de Perdas
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                Loss Prevention
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Rastreamento de quebra de caixa, estornos de vendas, edições pós-registro e proteção antifraude.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all self-start sm:self-auto"
          title="Atualizar auditoria"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-sm font-semibold">Cruzando registros de caixa e histórico de operações...</p>
        </div>
      ) : (
        <>
          {/* Métricas Principais & Score de Segurança */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border ${
              ind.score_seguranca >= 90
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : ind.score_seguranca >= 70
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            }`}>
              <span className="text-[11px] font-bold uppercase tracking-wider block mb-1">
                Score de Integridade
              </span>
              <div className="text-3xl font-black flex items-baseline gap-1">
                {ind.score_seguranca || 100}
                <span className="text-sm font-bold text-slate-400">/ 100</span>
              </div>
              <p className="text-[11px] mt-1 font-semibold flex items-center gap-1">
                {ind.score_seguranca >= 90 ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                Risco {ind.nivel_risco?.toUpperCase()}
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Quebra de Caixa (Falta)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-rose-400">
                {ind.total_quebra_caixa_dinheiro > 0 ? `- ${formatPrice(ind.total_quebra_caixa_dinheiro)}` : 'R$ 0,00'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Diferença em dinheiro na gaveta
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Pedidos Cancelados
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-400">
                {ind.total_pedidos_cancelados || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Total de {formatPrice(ind.valor_total_cancelado)} estornados
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Pedidos Alterados / Editados
              </span>
              <div className="text-2xl sm:text-3xl font-black text-blue-400">
                {ind.total_pedidos_editados || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Modificados após a emissão
              </p>
            </div>
          </div>

          {/* Sub-Navegação */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setSubTab('caixas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                subTab === 'caixas'
                  ? 'bg-rose-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Conferência de Caixa ({caixas.length})
            </button>
            <button
              onClick={() => setSubTab('cancelados')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                subTab === 'cancelados'
                  ? 'bg-rose-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Cancelamentos &amp; Estornos ({cancelados.length})
            </button>
            <button
              onClick={() => setSubTab('editados')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                subTab === 'editados'
                  ? 'bg-rose-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Histórico de Edições ({editados.length})
            </button>
          </div>

          {/* 1. Tabela de Sessões de Caixa */}
          {subTab === 'caixas' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Caixa #</th>
                      <th className="py-3 px-4">Operador</th>
                      <th className="py-3 px-4">Abertura / Fechamento</th>
                      <th className="py-3 px-4">Fundo Caixa</th>
                      <th className="py-3 px-4">Vendas Dinheiro</th>
                      <th className="py-3 px-4">Saldo Esperado</th>
                      <th className="py-3 px-4">Valor Declarado</th>
                      <th className="py-3 px-4">Diferença (Quebra)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {caixas.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-500">
                          Nenhum fechamento registrado até o momento.
                        </td>
                      </tr>
                    ) : (
                      caixas.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-black text-white">
                            #{c.id}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-300">
                            {c.operador}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            <div>Aberto: {c.aberto_em}</div>
                            {c.fechado_em ? <div>Fechado: {c.fechado_em}</div> : <span className="text-emerald-400 font-bold">Em Aberto</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {formatPrice(c.valor_abertura)}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {formatPrice(c.vendas_dinheiro)}
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            {formatPrice(c.saldo_esperado)}
                          </td>
                          <td className="py-3 px-4 font-bold">
                            {c.valor_declarado !== null ? formatPrice(c.valor_declarado) : <span className="text-slate-500">-</span>}
                          </td>
                          <td className="py-3 px-4">
                            {c.diferenca_quebra === null ? (
                              <span className="text-slate-500">Não fechado</span>
                            ) : c.diferenca_quebra === 0 ? (
                              <span className="text-emerald-400 font-black">✓ Perfeito (R$ 0)</span>
                            ) : c.diferenca_quebra < 0 ? (
                              <span className="text-rose-400 font-black">{formatPrice(c.diferenca_quebra)} (Falta)</span>
                            ) : (
                              <span className="text-amber-400 font-black">+{formatPrice(c.diferenca_quebra)} (Sobra)</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Tabela de Cancelamentos */}
          {subTab === 'cancelados' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4">Valor Estornado</th>
                      <th className="py-3 px-4">Forma</th>
                      <th className="py-3 px-4">Itens do Pedido</th>
                      <th className="py-3 px-4">Motivo / Obs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {cancelados.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-500">
                          Nenhum pedido cancelado registrado.
                        </td>
                      </tr>
                    ) : (
                      cancelados.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-black text-rose-400">
                            {p.codigo_identificador || `#${p.numero_pedido}`}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {p.data_hora_fmt}
                          </td>
                          <td className="py-3 px-4 font-black text-white">
                            {formatPrice(p.total)}
                          </td>
                          <td className="py-3 px-4 uppercase font-bold text-slate-400">
                            {p.forma_pagamento}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {p.itens_cancelados || 'Nenhum item'}
                          </td>
                          <td className="py-3 px-4 text-slate-400 italic">
                            {p.observacoes || 'Sem justificativa informada'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Tabela de Edições */}
          {subTab === 'editados' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Data Venda</th>
                      <th className="py-3 px-4">Modificado Em</th>
                      <th className="py-3 px-4">Valor Final</th>
                      <th className="py-3 px-4">Motivo da Alteração</th>
                      <th className="py-3 px-4">Itens Finais</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {editados.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-500">
                          Nenhum pedido foi editado após a venda.
                        </td>
                      </tr>
                    ) : (
                      editados.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-black text-blue-400">
                            {p.codigo_identificador || `#${p.numero_pedido}`}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {p.data_venda_fmt}
                          </td>
                          <td className="py-3 px-4 text-amber-400 font-semibold">
                            {p.editado_em_fmt}
                          </td>
                          <td className="py-3 px-4 font-black text-white">
                            {formatPrice(p.total)}
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-medium">
                            {p.motivo_edicao || 'Alteração manual'}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {p.itens_finais || 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
