import React, { useState, useEffect } from 'react';
import CategoryTabs from '../components/CategoryTabs';
import ProductGrid from '../components/ProductGrid';
import CartPanel from '../components/CartPanel';
import CheckoutModal from '../components/CheckoutModal';
import ReceiptModal from '../components/ReceiptModal';
import { getCategorias, getProdutos, createPedido } from '../services/api';
import { CheckCircle2, Printer, X, Sparkles } from 'lucide-react';
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isCheckoutOpen]);

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
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [
        ...prevCart,
        {
          id: product.id,
          produto_id: product.id,
          nome: product.nome,
          preco: parseFloat(product.preco),
          quantidade: 1,
          foto_url: product.foto_url
        }
      ];
    });
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, quantidade: newQuantity } : item
      )
    );
  };

  const handleRemoveItem = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const handleClearCart = () => {
    if (cart.length > 0 && confirm('Deseja limpar todos os itens do carrinho?')) {
      setCart([]);
    }
  };

  // =========================================================================
  // FINALIZAR VENDA
  // Abre o modal de recibo para conferência e impressão sob demanda (clicar para imprimir)
  // =========================================================================
  const handleConfirmOrder = async (orderPayload) => {
    try {
      setIsProcessing(true);
      const savedOrder = await createPedido(orderPayload);
      
      // 1. Atualiza último pedido e fecha o modal de checkout
      setLastOrder(savedOrder);
      setIsCheckoutOpen(false);
      setIsProcessing(false);

      // 2. Limpa o carrinho instantaneamente
      setCart([]);

      // 3. Abre o modal com os dados do pedido para imprimir se necessário (ou Enter para avançar)
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

  // Reimprimir comandas do último pedido reabrindo a tela de recibo
  const handleReimprimirUltimo = () => {
    if (!lastOrder) return;
    setIsReceiptOpen(true);
  };

  // Filtro de produtos por categoria
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoria_id === selectedCategory)
    : products;

  // Contagem de produtos por categoria
  const productsCountByCat = {};
  products.forEach((p) => {
    productsCountByCat[p.categoria_id] = (productsCountByCat[p.categoria_id] || 0) + 1;
  });

  const cartTotal = cart.reduce((acc, item) => acc + item.quantidade * item.preco, 0);

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
    <div className="max-w-7xl mx-auto p-3 sm:p-4 flex flex-col lg:flex-row gap-4 relative">
      
      {/* ========================================================================= */}
      {/* NOTIFICAÇÃO FLUTUANTE ULTRA-RÁPIDA (NÃO BLOQUEIA A TELA) */}
      {/* Mostra o número da comanda impresso enquanto o caixa já atende o próximo */}
      {/* ========================================================================= */}
      {orderNotification && (
        <div className="fixed top-16 right-4 sm:right-6 z-40 bg-slate-900/95 border-2 border-emerald-500/80 shadow-2xl shadow-emerald-950/80 rounded-2xl p-3.5 max-w-sm sm:max-w-md animate-in slide-in-from-top-3 duration-200 backdrop-blur-md">
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
                  {formatPrice(orderNotification.total)} &bull; {orderNotification.printMessage || 'Impresso automaticamente!'}
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
              Caixa pronto para o próximo cliente!
            </span>

            <button
              onClick={handleReimprimirUltimo}
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
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        
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
          cartItems={cart}
        />
      </div>

      {/* Coluna Direita: Painel do Carrinho e Finalização */}
      <CartPanel
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onOpenCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Modal de Pagamento / Checkout (Abre somente para escolher a forma de pagamento) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={cartTotal}
        cartItems={cart}
        config={config}
        onConfirmOrder={handleConfirmOrder}
        isProcessing={isProcessing}
      />

      {/* Modal de Recibo / Sucesso com botão para imprimir sob demanda */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={handleCloseReceipt}
        order={lastOrder}
        config={config}
      />

    </div>
  );
}
