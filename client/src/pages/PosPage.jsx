import React, { useState, useEffect } from 'react';
import CategoryTabs from '../components/CategoryTabs';
import ProductGrid from '../components/ProductGrid';
import CartPanel from '../components/CartPanel';
import CheckoutModal from '../components/CheckoutModal';
import ReceiptModal from '../components/ReceiptModal';
import RecentOrdersModal from '../components/RecentOrdersModal';
import { getCategorias, getProdutos, createPedido } from '../services/api';
import { RefreshCw, CheckCircle2, Printer, X, Sparkles, Receipt, Trash2, Clock, ShoppingBag, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PosPage({ config, onCartCountChange }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados do checkout e último pedido
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isRecentOrdersOpen, setIsRecentOrdersOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNotification, setOrderNotification] = useState(null);

  // Carregar Categorias e Produtos
  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        getCategorias(),
        getProdutos()
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Erro ao carregar dados do PDV:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Notificar Navbar sobre a quantidade de itens no carrinho
  useEffect(() => {
    const totalCount = cart.reduce((sum, item) => sum + item.quantidade, 0);
    if (onCartCountChange) {
      onCartCountChange(totalCount);
    }
  }, [cart, onCartCountChange]);

  // Atalhos de teclado (F2 para finalizar, Esc para fechar modal de pagamento)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0 && !isCheckoutOpen) {
          setIsCheckoutOpen(true);
        }
      }
      if (e.key === 'Escape') {
        if (isCheckoutOpen) setIsCheckoutOpen(false);
        if (isMobileCartOpen) setIsMobileCartOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isCheckoutOpen, isMobileCartOpen]);

  // Auto-dismiss da notificação rápida de pedido concluído
  useEffect(() => {
    if (orderNotification) {
      const timer = setTimeout(() => {
        setOrderNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [orderNotification]);

  // Ações do Carrinho
  const handleAddToCart = (product) => {
    const itemKey = product.cart_id || product.id;
    let comboInfo = product.combo_info;
    if (!comboInfo && (product.is_combo || product.categoria_nome?.toLowerCase() === 'combos')) {
      let parsedItens = product.itens_combo;
      if (typeof parsedItens === 'string') {
        try { parsedItens = JSON.parse(parsedItens); } catch {}
      }
      comboInfo = {
        is_combo: true,
        titulo: product.nome,
        itens: parsedItens || []
      };
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => (item.cart_id || item.id) === itemKey);
      if (existing) {
        return prevCart.map((item) =>
          (item.cart_id || item.id) === itemKey
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [
        ...prevCart,
        {
          id: itemKey,
          cart_id: itemKey,
          produto_id: product.produto_id || product.id,
          nome: product.nome,
          preco: parseFloat(product.preco),
          preco_custo: parseFloat(product.preco_custo || 0),
          quantidade: 1,
          foto_url: product.foto_url,
          combo_info: comboInfo || null
        }
      ];
    });
  };

  const handleUpdateQuantity = (itemKey, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemKey);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        (item.cart_id || item.id) === itemKey ? { ...item, quantidade: newQuantity } : item
      )
    );
  };

  const handleRemoveItem = (itemKey) => {
    setCart((prevCart) => prevCart.filter((item) => (item.cart_id || item.id) !== itemKey));
  };

  const handleUpdatePrice = (itemKey, newPrice) => {
    const parsed = parseFloat(newPrice);
    if (isNaN(parsed) || parsed < 0) return;
    setCart((prevCart) =>
      prevCart.map((item) =>
        (item.cart_id || item.id) === itemKey ? { ...item, preco: parsed } : item
      )
    );
  };

  const handleAddCustomCombo = ({ nome, preco, preco_custo = 0, quantidade = 1 }) => {
    const uniqueKey = 'custom_' + Date.now();
    setCart((prevCart) => [
      ...prevCart,
      {
        id: uniqueKey,
        cart_id: uniqueKey,
        produto_id: null,
        nome: nome || 'Combo Especial',
        preco: parseFloat(preco) || 0,
        preco_custo: parseFloat(preco_custo) || 0,
        quantidade: parseInt(quantidade, 10) || 1,
        foto_url: '',
        combo_info: { is_custom: true, titulo: nome }
      }
    ]);
  };

  const handleClearCart = () => {
    if (cart.length > 0 && confirm('Deseja limpar todos os itens do carrinho?')) {
      setCart([]);
      setIsMobileCartOpen(false);
    }
  };

  // =========================================================================
  // FINALIZAR VENDA
  // Abre o modal de recibo para conferência e impressão sob demanda
  // =========================================================================
  const handleConfirmOrder = async (orderPayload) => {
    try {
      setIsProcessing(true);
      const savedOrder = await createPedido(orderPayload);
      
      // 1. Atualiza último pedido e fecha modais
      setLastOrder(savedOrder);
      setIsCheckoutOpen(false);
      setIsMobileCartOpen(false);
      setIsProcessing(false);

      // 2. Limpa o carrinho instantaneamente
      setCart([]);

      // 3. Abre o modal com os dados do pedido para imprimir se necessário
      setIsReceiptOpen(true);

    } catch (err) {
      setIsProcessing(false);
      alert('Erro ao finalizar venda: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCloseReceipt = () => {
    setIsReceiptOpen(false);
    if (lastOrder) {
      setOrderNotification({
        numero_pedido: lastOrder.numero_pedido,
        total: lastOrder.total,
        forma_pagamento: lastOrder.forma_pagamento?.toUpperCase(),
        printMessage: 'Pedido salvo com sucesso'
      });
    }
  };

  // Reimprimir comandas reabrindo a tela de recibo
  const handleReimprimir = (orderToReprint) => {
    const target = orderToReprint || lastOrder;
    if (!target) return;
    setLastOrder(target);
    setIsReceiptOpen(true);
  };

  // Categoria de Combos
  const comboCategory = categories.find((c) => c.nome.toLowerCase() === 'combos');
  const comboCatId = comboCategory?.id;

  // Contagem de produtos por categoria
  const productsCountByCat = {};
  let totalCombosCount = 0;
  products.forEach((p) => {
    const isCombo = Boolean(p.is_combo || p.categoria_id === comboCatId || p.categoria_nome?.toLowerCase() === 'combos');
    if (isCombo) {
      totalCombosCount++;
    }
    productsCountByCat[p.categoria_id] = (productsCountByCat[p.categoria_id] || 0) + 1;
  });
  if (comboCatId) {
    productsCountByCat[comboCatId] = totalCombosCount;
  }

  // Filtro de produtos por categoria
  const filteredProducts = selectedCategory === null
    ? products
    : (selectedCategory === comboCatId || selectedCategory === 'combos')
      ? products.filter((p) => p.is_combo || p.categoria_id === comboCatId || p.categoria_nome?.toLowerCase() === 'combos')
      : products.filter((p) => p.categoria_id === selectedCategory);

  const cartTotal = cart.reduce((acc, item) => acc + item.quantidade * item.preco, 0);
  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantidade, 0);

  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
        <p className="font-semibold text-slate-300">Carregando cardápio da Expobai...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col lg:flex-row gap-3 sm:gap-4 relative pb-36 lg:pb-6">
      
      {/* NOTIFICAÇÃO FLUTUANTE ULTRA-RÁPIDA */}
      {orderNotification && (
        <div className="fixed top-16 right-3 sm:right-6 z-40 bg-slate-900/95 border-2 border-emerald-500/80 shadow-2xl shadow-emerald-950/80 rounded-2xl p-3 sm:p-3.5 max-w-sm sm:max-w-md animate-in slide-in-from-top-3 duration-200 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base">
                    Comanda #{String(orderNotification.numero_pedido).padStart(3, '0')}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    {orderNotification.forma_pagamento}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  {formatPrice(orderNotification.total)} &bull; {orderNotification.printMessage || 'Impresso com sucesso!'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setOrderNotification(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5 text-[11px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Pronto para o próximo cliente!
            </span>

            <button
              onClick={() => handleReimprimir()}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold flex items-center gap-1 border border-slate-700 hover:border-amber-500/50 text-[11px] transition-colors"
              title="Reimprimir comanda do último pedido"
            >
              <Printer className="w-3 h-3 text-amber-400" />
              <span>Reimprimir</span>
            </button>
          </div>
        </div>
      )}

      {/* Coluna Esquerda: Categorias & Grade de Produtos */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        
        {/* Barra Rápida de Ações do PDV & Horário Oficial MS */}
        <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-2xl shadow">
          <button
            type="button"
            onClick={() => setIsRecentOrdersOpen(true)}
            className="h-11 px-3.5 bg-slate-800 active:bg-slate-700 text-amber-300 border border-amber-500/50 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow truncate"
            title="Ver vendas recentes para reimprimir ficha, editar itens ou excluir erro"
          >
            <Receipt className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">⚡ Vendas Recentes <span className="hidden xs:inline">/ Correções</span></span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono shrink-0 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="hidden sm:inline">Horário Oficial</span>
            <span className="font-bold text-slate-300">MS (-1h BSB)</span>
          </div>
        </div>

        {/* Barra de Categorias */}
        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          productsCountByCat={productsCountByCat}
        />

        {/* Grade de Produtos */}
        <ProductGrid
          products={filteredProducts}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          cartItems={cart}
        />
      </div>

      {/* Coluna Direita (Desktop): Painel do Carrinho Fixo */}
      <div className="hidden lg:block">
        <CartPanel
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onUpdatePrice={handleUpdatePrice}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onAddCustomCombo={handleAddCustomCombo}
          onOpenCheckout={() => setIsCheckoutOpen(true)}
        />
      </div>

      {/* ========================================================================= */}
      {/* BARRA FLUTUANTE INFERIOR MOBILE (CELULAR ESTILO APLICATIVO) */}
      {/* Botões gigantes de 56px de altura para o polegar com 1 toque no checkout */}
      {/* ========================================================================= */}
      {cart.length > 0 && (
        <div 
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/98 border-t-2 border-emerald-500 p-2.5 sm:p-3 backdrop-blur-xl shadow-[0_-12px_30px_rgba(0,0,0,0.8)] flex items-center justify-between gap-2.5 animate-in slide-in-from-bottom-4 duration-200"
          style={{ paddingBottom: 'max(0.85rem, env(safe-area-inset-bottom))' }}
        >
          {/* Botão Ver Itens */}
          <button 
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="flex items-center gap-2 bg-slate-900 active:bg-slate-800 border border-slate-700/90 rounded-2xl px-3 h-14 transition-colors text-left shrink-0 active:scale-95 shadow"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-black text-sm shrink-0">
              🛒 {cartTotalItems}
            </div>
            <div className="min-w-0 pr-1">
              <span className="text-[10px] text-slate-400 uppercase font-black block leading-none">
                Carrinho
              </span>
              <p className="text-xs font-black text-slate-200 truncate">
                {cartTotalItems} {cartTotalItems === 1 ? 'item' : 'itens'}
              </p>
            </div>
          </button>

          {/* Botão Principal de Cobrança Rápida - GIGANTE ESTILO APLICATIVO */}
          <button
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-green-500 active:from-emerald-400 active:to-green-400 text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <span>COBRAR</span>
            <span className="font-mono text-lg font-black bg-slate-950/20 px-2.5 py-0.5 rounded-lg text-slate-950">
              {formatPrice(cartTotal)}
            </span>
            <ArrowRight className="w-5 h-5 text-slate-950 stroke-[3] shrink-0" />
          </button>
        </div>
      )}

      {/* MODAL / GAVETA DO CARRINHO MOBILE */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in">
          <div className="bg-slate-900 border-t-2 sm:border border-slate-700 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 sm:p-5 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="font-black text-lg text-white">Itens no Pedido ({cartTotalItems})</h3>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-xl bg-slate-800 active:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {cart.map((item) => (
                <div key={item.id} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <span className="font-black text-sm sm:text-base text-slate-100 block truncate">{item.nome}</span>
                    <span className="text-xs text-slate-400 font-mono">{formatPrice(item.preco)} cada</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Stepper Gigante Touch */}
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-0.5">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantidade - 1)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-amber-400 font-black text-lg active:bg-amber-600 active:text-slate-950"
                      >
                        -
                      </button>
                      <span className="w-9 text-center font-mono font-black text-lg text-white">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantidade + 1)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black text-lg active:bg-amber-400"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-mono font-black text-emerald-400 text-sm sm:text-base w-20 text-right">
                      {formatPrice(item.quantidade * item.preco)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3.5 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-base">
                <span className="text-slate-300 font-bold">Total do Pedido:</span>
                <span className="font-black text-2xl text-emerald-400 font-mono">{formatPrice(cartTotal)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="h-14 bg-slate-800 active:bg-rose-950/60 text-slate-300 active:text-rose-400 text-sm font-black rounded-2xl border border-slate-700"
                >
                  Limpar Tudo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="h-14 bg-gradient-to-r from-emerald-500 to-green-500 text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950 active:scale-95"
                >
                  Cobrar Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento / Checkout */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={cartTotal}
        cartItems={cart}
        config={config}
        onConfirmOrder={handleConfirmOrder}
        isProcessing={isProcessing}
      />

      {/* Modal de Recibo / Sucesso com impressão sob demanda */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={handleCloseReceipt}
        order={lastOrder}
        config={config}
      />

      {/* Modal de Correção de Vendas Recentes */}
      <RecentOrdersModal
        isOpen={isRecentOrdersOpen}
        onClose={() => setIsRecentOrdersOpen(false)}
        config={config}
        onReprintOrder={handleReimprimir}
      />

    </div>
  );
}
