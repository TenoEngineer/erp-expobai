# 🤠 ERP Expobai - Frente de Caixa (PDV Ágil)

Sistema de ERP e Ponto de Venda (PDV / Caixa) desenvolvido especialmente para barracas e estandes da **Expobai (Exposição Agropecuária de Amambai/MS)**.

---

## 📌 Principais Recursos

- **Frente de Caixa Touch & Ágil**:
  - Filtro instantâneo por categorias (Salgados, Bebidas, Doces, etc.).
  - Adição rápida de itens ao carrinho com 1 toque/clique.
  - Grade de produtos com fotos, preços e descrições.
- **Painel de Pedido & Checkout**:
  - Carrinho lateral em tempo real com controle ágil de quantidade.
  - Número de pedido sequencial automático para entrega de comanda/ficha ao cliente.
  - Formas de pagamento: **PIX**, **Dinheiro** (com cálculo automático de troco), **Cartão de Débito** e **Cartão de Crédito**.
  - Impressão ou visualização de ficha/ticket de retirada.
- **Gestão & Retaguarda**:
  - Cadastro, edição e desativação de produtos.
  - Upload ou link para foto dos produtos e alteração rápida de preços.
  - Cadastro de categorias com cores e ícones.
  - Relatório de fechamento de caixa por forma de pagamento e total faturado.
- **100% Funcional Offline**:
  - Banco local SQLite que não depende da internet oscilante do parque de exposições.

---

## 🏛️ Arquitetura

- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons (Ultra-rápido, responsivo e touch-friendly).
- **Backend**: Node.js + Express seguindo o padrão RSC (Routes, Services, Repositories).
- **Banco de Dados**: SQLite3 com WAL mode (alta performance e robustez local).
- **Upload de Fotos**: Armazenamento local servido via Express + suporte a URL.
