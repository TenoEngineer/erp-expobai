import React, { useState, useEffect } from 'react';
import CategoryTabs from '../components/CategoryTabs';
import ProductGrid from '../components/ProductGrid';
import CartPanel from '../components/CartPanel';
import CheckoutModal from '../components/CheckoutModal';
import ReceiptModal from '../components/ReceiptModal';
import { getCategorias, getProdutos, createPedido } from '../services/api';
import { RefreshCw } from 'lucide-react';

export default function PosPage({ config, onCartCountChange }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Atalhos de teclado (F2 para finalizar, Esc para fechar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0 && !isCheckoutOpen && !isReceiptOpen) {
          setIsCheckoutOpen(true);
        }
      }
      if (e.key === 'Escape') {
        if (isCheckoutOpen) setIsCheckoutOpen(false);
        if (isReceiptOpen) setIsReceiptOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isCheckoutOpen, isReceiptOpen]);

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

  // Finalizar Venda
  const handleConfirmOrder = async (orderPayload) => {
    try {
      setIsProcessing(true);
      const savedOrder = await createPedido(orderPayload);
      setLastOrder(savedOrder);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      setCart([]); // Limpa o carrinho
    } catch (err) {
      alert('Erro ao finalizar venda: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
    }
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

  if (loading && products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
        <p className="font-semibold text-slate-300">Carregando cardápio da Expobai...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 flex flex-col lg:flex-row gap-4">
      
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

      {/* Modal de Sucesso & Ficha de Retirada */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        order={lastOrder}
        config={config}
      />

    </div>
  );
}
