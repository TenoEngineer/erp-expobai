import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Ban, 
  Printer, 
  RefreshCw, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { getPedidos, deletePedido, cancelPedido } from '../services/api';

export default function RecentOrdersModal({ isOpen, onClose, onOrderDeleted }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(null);

  const fetchRecentOrders = async () => {
    try {
      setLoading(true);
      const data = await getPedidos(30);
      setOrders(data);
    } catch (err) {
      console.error('Erro ao carregar comandas recentes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecentOrders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (order) => {
    const confirmText = `⚠️ ATENÇÃO: Deseja EXCLUIR DEFINITIVAMENTE o pedido #${String(order.numero_pedido).padStart(3, '0')} (R$ ${Number(order.total).toFixed(2)})?\n\nEsta venda foi feita errada e será apagada do banco de dados, estornando o valor do caixa imediatamente.`;
    if (window.confirm(confirmText)) {
      try {
        setActionInProgress(order.id);
        await deletePedido(order.id);
        alert(`✅ Pedido #${String(order.numero_pedido).padStart(3, '0')} excluído com sucesso!`);
        await fetchRecentOrders();
        if (onOrderDeleted) {
          onOrderDeleted(order);
        }
      } catch (err) {
        alert('Erro ao excluir pedido: ' + (err.response?.data?.error || err.message));
      } finally {
        setActionInProgress(null);
      }
    }
  };

  const handleCancel = async (order) => {
    if (window.confirm(`Deseja marcar como cancelado o pedido #${String(order.numero_pedido).padStart(3, '0')}?`)) {
      try {
        setActionInProgress(order.id);
        await cancelPedido(order.id);
        await fetchRecentOrders();
        if (onOrderDeleted) {
          onOrderDeleted(order);
        }
      } catch (err) {
        alert('Erro ao cancelar pedido: ' + err.message);
      } finally {
        setActionInProgress(null);
      }
    }
  };

  const formatPrice = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatTimeMS = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Campo_Grande',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-4 sm:p-6 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Vendas Recentes & Corrigir Lançamento Errado
              </h3>
              <p className="text-xs text-slate-400">
                Horário oficial de Mato Grosso do Sul (MS). Exclua vendas lançadas por engano para acertar o caixa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchRecentOrders}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              title="Recarregar vendas"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lista de Vendas Recentes */}
        <div className="overflow-y-auto space-y-2 flex-1 pr-1">
          {loading && orders.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
              Carregando histórico de vendas...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              Nenhuma venda registrada ainda no sistema.
            </div>
          ) : (
            orders.map((order) => {
              const isProcessing = actionInProgress === order.id;
              const isCancelado = order.status === 'cancelado';

              return (
                <div 
                  key={order.id}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isCancelado 
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-amber-400 text-sm">
                        #{String(order.numero_pedido).padStart(3, '0')}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300 uppercase font-mono">
                        {order.forma_pagamento}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatTimeMS(order.data_hora)} (MS)
                      </span>
                      {isCancelado && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 text-[10px] font-bold uppercase">
                          Cancelado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-emerald-400">
                        {formatPrice(order.total)}
                      </span>

                      {/* Botões de Correção / Exclusão */}
                      <div className="flex items-center gap-1">
                        {!isCancelado && (
                          <button
                            onClick={() => handleCancel(order)}
                            disabled={isProcessing}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Marcar como cancelado"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(order)}
                          disabled={isProcessing}
                          className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg font-bold flex items-center gap-1 text-[11px] transition-colors"
                          title="Excluir lançamento feito errado (apaga definitivamente)"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>Excluir Errado</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Resumo de itens se houver */}
                  {order.itens && order.itens.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-900 text-[11px] text-slate-400 font-sans">
                      🍽️ {order.itens.map(i => `${i.quantidade}x ${i.nome_produto}`).join(', ')}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>💡 Excluir apaga permanentemente o lançamento errado e atualiza o faturamento do caixa na hora.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
