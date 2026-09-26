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
  Receipt,
  Edit3,
  Layers
} from 'lucide-react';
import { getPedidos, deletePedido, cancelPedido } from '../services/api';
import EditOrderModal from './EditOrderModal';
import { executeOrderPrint } from '../services/printManager';

export default function RecentOrdersModal({ 
  isOpen, 
  onClose, 
  config, 
  onOrderDeleted,
  onOrderUpdated,
  onReprintOrder
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchRecentOrders = async () => {
    try {
      setLoading(true);
      const data = await getPedidos(40);
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

  const handleOpenEdit = (order) => {
    setEditingOrder(order);
    setIsEditModalOpen(true);
  };

  const handleOrderUpdated = (updated) => {
    fetchRecentOrders();
    if (onOrderUpdated) {
      onOrderUpdated(updated);
    }
  };

  const handleReprint = async (order) => {
    try {
      setActionInProgress(order.id);
      if (onReprintOrder) {
        onReprintOrder(order);
        return;
      }
      await executeOrderPrint(order, config);
    } catch (err) {
      alert('Erro ao reimprimir pedido: ' + err.message);
    } finally {
      setActionInProgress(null);
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

  const renderPaymentBadge = (order) => {
    if (order.forma_pagamento === 'misto' && Array.isArray(order.pagamentos)) {
      const parts = order.pagamentos.map(p => `${p.forma.toUpperCase()} ${formatPrice(p.valor)}`);
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono flex items-center gap-1">
          <Layers className="w-3 h-3" />
          <span>{parts.join(' + ') || 'Misto'}</span>
        </span>
      );
    }

    const colors = {
      pix: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
      dinheiro: 'bg-amber-950 text-amber-300 border-amber-500/40',
      debito: 'bg-cyan-950 text-cyan-300 border-cyan-500/40',
      credito: 'bg-purple-950 text-purple-300 border-purple-500/40'
    };

    return (
      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase font-mono ${colors[order.forma_pagamento] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
        {order.forma_pagamento}
      </span>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
        <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 max-h-[92vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  ⚡ Vendas Recentes & Correção Rápida no Caixa
                </h3>
                <p className="text-xs text-slate-400">
                  Reimprima fichas, edite lançamentos ou exclua erros instantaneamente (Horário MS)
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
          <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
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
                    className={`p-3 rounded-2xl border text-xs transition-all ${
                      isCancelado 
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-60' 
                        : 'bg-slate-950 border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      
                      {/* Lado Esquerdo: Identificação, Forma de Pagamento e Horário */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-amber-400 text-base">
                          #{String(order.numero_pedido).padStart(3, '0')}
                        </span>
                        
                        {renderPaymentBadge(order)}

                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formatTimeMS(order.data_hora)}
                        </span>

                        {order.editado && (
                          <span 
                            className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1"
                            title={`Modificado: ${order.motivo_edicao || 'Alteração manual'}`}
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>Editado</span>
                          </span>
                        )}

                        {isCancelado && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 text-[10px] font-bold uppercase">
                            Cancelado
                          </span>
                        )}
                      </div>

                      {/* Lado Direito: Total e Botões de Ação */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <span className="font-mono font-black text-base text-emerald-400">
                          {formatPrice(order.total)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Botão Reimprimir Ficha */}
                          <button
                            type="button"
                            onClick={() => handleReprint(order)}
                            disabled={isProcessing}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-400/50 rounded-xl font-bold flex items-center gap-1 text-[11px] transition-colors active:scale-95"
                            title="Reimprimir comanda/ficha"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">Reimprimir</span>
                          </button>

                          {/* Botão Editar Venda */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(order)}
                            disabled={isProcessing || isCancelado}
                            className="px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-600/40 rounded-xl font-bold flex items-center gap-1 text-[11px] transition-colors active:scale-95 disabled:opacity-40"
                            title="Editar itens, valor ou forma de pagamento"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          {/* Botão Cancelar */}
                          {!isCancelado && (
                            <button
                              type="button"
                              onClick={() => handleCancel(order)}
                              disabled={isProcessing}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Marcar como cancelado"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botão Excluir Errado */}
                          <button
                            type="button"
                            onClick={() => handleDelete(order)}
                            disabled={isProcessing}
                            className="px-2 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-xl font-bold flex items-center gap-1 text-[11px] transition-colors active:scale-95"
                            title="Excluir lançamento feito errado definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Resumo dos Itens */}
                    {order.itens && order.itens.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-900 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>🍽️ {order.itens.map(i => `${i.quantidade}x ${i.nome_produto}`).join(', ')}</span>
                        {order.motivo_edicao && (
                          <span className="text-[10px] text-amber-400/80 font-mono italic">
                            ({order.motivo_edicao})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px]">
              💡 Alterações e exclusões refletem instantaneamente no faturamento e no estoque.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Edição de Venda */}
      {isEditModalOpen && editingOrder && (
        <EditOrderModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingOrder(null);
          }}
          order={editingOrder}
          onOrderUpdated={handleOrderUpdated}
        />
      )}
    </>
  );
}
