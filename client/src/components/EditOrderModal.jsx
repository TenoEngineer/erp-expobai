import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  Save, 
  AlertTriangle, 
  Check, 
  RefreshCw, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  QrCode,
  Layers,
  Edit3
} from 'lucide-react';
import { updatePedido, getProdutos } from '../services/api';

export default function EditOrderModal({
  isOpen,
  onClose,
  order,
  onOrderUpdated
}) {
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [splitMethod1, setSplitMethod1] = useState('dinheiro');
  const [splitAmount1, setSplitAmount1] = useState('');
  const [splitMethod2, setSplitMethod2] = useState('pix');
  const [splitAmount2, setSplitAmount2] = useState('');
  const [notes, setNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      // 1. Clonar itens do pedido
      const initialItems = (order.itens || order.itens_detalhes || []).map(i => ({
        id: i.id,
        produto_id: i.produto_id,
        nome_produto: i.nome_produto || i.nome,
        quantidade: parseInt(i.quantidade, 10) || 1,
        preco_unitario: parseFloat(i.preco_unitario || i.preco || 0),
        subtotal: (parseInt(i.quantidade, 10) || 1) * parseFloat(i.preco_unitario || i.preco || 0)
      }));
      setItems(initialItems);

      // 2. Preencher forma de pagamento
      const forma = (order.forma_pagamento || 'pix').toLowerCase();
      setPaymentMethod(forma);

      // Se for pagamento misto com detalhes
      if (forma === 'misto' && Array.isArray(order.pagamentos) && order.pagamentos.length >= 2) {
        setSplitMethod1(order.pagamentos[0]?.forma || 'dinheiro');
        setSplitAmount1(String(order.pagamentos[0]?.valor || ''));
        setSplitMethod2(order.pagamentos[1]?.forma || 'pix');
        setSplitAmount2(String(order.pagamentos[1]?.valor || ''));
      } else {
        setSplitMethod1('dinheiro');
        setSplitAmount1('');
        setSplitMethod2('pix');
        setSplitAmount2('');
      }

      setNotes(order.observacoes || '');
      setEditReason(order.motivo_edicao || '');

      // Carregar produtos disponíveis para adicionar itens
      loadProducts();
    }
  }, [isOpen, order]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const prods = await getProdutos();
      setAvailableProducts(prods);
      if (prods.length > 0) {
        setSelectedAddProductId(String(prods[0].id));
      }
    } catch (err) {
      console.error('Erro ao carregar lista de produtos:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  // Cálculos de totais
  const currentTotal = items.reduce((acc, i) => acc + (i.quantidade * i.preco_unitario), 0);
  const originalTotal = parseFloat(order.total) || 0;
  const isTotalChanged = Math.abs(currentTotal - originalTotal) > 0.01;

  const formatPrice = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Manipulação de Itens
  const handleUpdateItemQuantity = (index, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantidade: newQty,
        subtotal: newQty * updated[index].preco_unitario
      };
      return updated;
    });
  };

  const handleUpdateItemPrice = (index, newPrice) => {
    const p = parseFloat(newPrice) || 0;
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        preco_unitario: p,
        subtotal: updated[index].quantidade * p
      };
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      alert('O pedido deve conter pelo menos 1 item! Se deseja cancelar ou excluir tudo, use a opção Excluir.');
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const prodsOptions = [];
  availableProducts.forEach(p => {
    prodsOptions.push({
      key: `p_${p.id}`,
      produto_id: p.id,
      nome_produto: p.nome,
      preco: parseFloat(p.preco),
      preco_custo: parseFloat(p.preco_custo || 0),
      label: `${p.nome} - R$ ${Number(p.preco).toFixed(2)}`
    });
    const combos = Array.isArray(p.combos) ? p.combos : (typeof p.combos === 'string' ? JSON.parse(p.combos || '[]') : []);
    combos.forEach((c, idx) => {
      prodsOptions.push({
        key: `p_${p.id}_combo_${c.id || idx}`,
        produto_id: p.id,
        nome_produto: `${p.nome} (${c.titulo || `${c.quantidade}x`})`,
        preco: parseFloat(c.preco),
        preco_custo: parseFloat(c.preco_custo || 0),
        label: `🎁 ${p.nome} (${c.titulo || `${c.quantidade}x`}) - R$ ${Number(c.preco).toFixed(2)}`,
        combo_info: c
      });
    });
  });

  const handleAddProduct = () => {
    const opt = prodsOptions.find(o => o.key === selectedAddProductId) || prodsOptions.find(o => String(o.produto_id) === String(selectedAddProductId));
    if (!opt) return;

    setItems(prev => [
      ...prev,
      {
        produto_id: opt.produto_id,
        nome_produto: opt.nome_produto,
        quantidade: 1,
        preco_unitario: opt.preco,
        subtotal: opt.preco,
        preco_custo: opt.preco_custo,
        combo_info: opt.combo_info || null
      }
    ]);
  };

  // Cálculos do Pagamento Misto
  const val1 = parseFloat(splitAmount1) || 0;
  const val2 = parseFloat(splitAmount2) || 0;
  const somaMisto = val1 + val2;
  const diferencaMisto = currentTotal - somaMisto;

  const handleAutoAdjustSplit2 = () => {
    const restante = Math.max(0, currentTotal - val1);
    setSplitAmount2(restante.toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Insira pelo menos um produto!');
      return;
    }

    if (paymentMethod === 'misto') {
      if (Math.abs(diferencaMisto) > 0.05) {
        alert(`A soma dos pagamentos (R$ ${somaMisto.toFixed(2)}) deve ser exatamente igual ao total (R$ ${currentTotal.toFixed(2)}). Ajuste os valores.`);
        return;
      }
    }

    try {
      setSaving(true);

      let pagamentosPayload = null;
      if (paymentMethod === 'misto') {
        pagamentosPayload = [
          { forma: splitMethod1, valor: val1 },
          { forma: splitMethod2, valor: val2 }
        ];
      } else {
        pagamentosPayload = [
          { forma: paymentMethod, valor: currentTotal }
        ];
      }

      const motivoFinal = editReason.trim() || 'Modificação de itens/pagamento realizada';

      const payload = {
        itens: items,
        forma_pagamento: paymentMethod,
        valor_pago: currentTotal,
        troco: 0,
        observacoes: notes,
        pagamentos: pagamentosPayload,
        motivo_edicao: motivoFinal
      };

      const res = await updatePedido(order.id, payload);
      alert(`✅ Lançamento #${String(order.numero_pedido).padStart(3, '0')} atualizado com sucesso!`);
      if (onOrderUpdated) {
        onOrderUpdated(res.pedido || res);
      }
      onClose();
    } catch (err) {
      alert('Erro ao salvar alterações: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-4 sm:p-6 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">
                  Editar Lançamento #{String(order.numero_pedido).padStart(3, '0')}
                </h3>
                {order.editado && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                    Já Editado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Altere itens, quantidades, valores e formas de pagamento com auditoria
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 flex-1 pr-1 text-xs">
          
          {/* Card Comparativo de Totais */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Valor Anterior:</span>
              <span className="font-mono text-slate-300 font-bold line-through">{formatPrice(originalTotal)}</span>
            </div>
            <div className="text-right">
              <span className="text-emerald-400 block text-[11px] font-bold">Novo Valor Total:</span>
              <span className="font-mono text-emerald-400 font-black text-lg">{formatPrice(currentTotal)}</span>
            </div>
          </div>

          {/* 1. SEÇÃO DE ITENS DO PEDIDO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Itens da Venda:
              </label>
              <span className="text-slate-400 text-[11px]">
                {items.length} {items.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div 
                  key={index}
                  className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-100 block truncate">{item.nome_produto}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-slate-400 text-[10px]">Preço Un:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.preco_unitario}
                        onChange={(e) => handleUpdateItemPrice(index, e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono text-white text-right"
                      />
                    </div>
                  </div>

                  {/* Controle de Quantidade */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQuantity(index, item.quantidade - 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-white text-xs">
                        {item.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQuantity(index, item.quantidade + 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-mono font-bold text-emerald-400 text-xs w-16 text-right">
                      {formatPrice(item.subtotal)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                      title="Remover item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Adicionar Produto Avulso */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={selectedAddProductId}
                onChange={(e) => setSelectedAddProductId(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                {prodsOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProduct}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>

          {/* 2. FORMA DE PAGAMENTO */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px] block">
              Forma de Pagamento:
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { id: 'pix', label: 'PIX', icon: QrCode, color: 'text-emerald-400' },
                { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'text-amber-400' },
                { id: 'debito', label: 'Débito', icon: CreditCard, color: 'text-cyan-400' },
                { id: 'credito', label: 'Crédito', icon: CreditCard, color: 'text-purple-400' },
                { id: 'misto', label: 'Misto (2 Formas)', icon: Layers, color: 'text-amber-300' }
              ].map(opt => {
                const Icon = opt.icon;
                const isSelected = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`p-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-amber-600/30 border-amber-400 text-amber-200 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${opt.color}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Painel de Pagamento Misto */}
            {paymentMethod === 'misto' && (
              <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/40 space-y-2 mt-2">
                <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between">
                  <span>Divisão do Pagamento em 2 Formas:</span>
                  <span>Total Alvo: {formatPrice(currentTotal)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Forma 1 */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <label className="text-slate-400 text-[10px] block font-semibold">1ª Forma:</label>
                    <div className="flex gap-1.5">
                      <select
                        value={splitMethod1}
                        onChange={(e) => setSplitMethod1(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      >
                        <option value="dinheiro">Dinheiro</option>
                        <option value="pix">PIX</option>
                        <option value="debito">Débito</option>
                        <option value="credito">Crédito</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="R$ 0,00"
                        value={splitAmount1}
                        onChange={(e) => setSplitAmount1(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono font-bold text-right"
                      />
                    </div>
                  </div>

                  {/* Forma 2 */}
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400 text-[10px] block font-semibold">2ª Forma:</label>
                      <button
                        type="button"
                        onClick={handleAutoAdjustSplit2}
                        className="text-[10px] text-amber-400 hover:underline"
                      >
                        Completar Restante
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <select
                        value={splitMethod2}
                        onChange={(e) => setSplitMethod2(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      >
                        <option value="pix">PIX</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="debito">Débito</option>
                        <option value="credito">Crédito</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="R$ 0,00"
                        value={splitAmount2}
                        onChange={(e) => setSplitAmount2(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono font-bold text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Status da Divisão */}
                <div className={`p-2 rounded-lg text-[11px] font-mono flex items-center justify-between ${
                  Math.abs(diferencaMisto) <= 0.05 
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' 
                    : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                }`}>
                  <span>Soma: {formatPrice(somaMisto)}</span>
                  <span>
                    {Math.abs(diferencaMisto) <= 0.05 
                      ? '✓ Valor confere com o total' 
                      : `Diferença: ${formatPrice(diferencaMisto)}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. MOTIVO DA EDICÃO (AUDITORIA) */}
          <div className="space-y-1 pt-2 border-t border-slate-800">
            <label className="font-bold text-slate-300 text-[11px] flex items-center justify-between">
              <span>Motivo da Alteração (Auditoria de Modificação):</span>
              <span className="text-[10px] text-amber-400 font-normal">Fica gravado no histórico</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Trocou refrigerante por água / Pagamento foi parte dinheiro e parte pix"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Salvar Alterações</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
