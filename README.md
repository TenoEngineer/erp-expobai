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
- **Automação de Impressão Térmica (Rede & USB)**:
  - **Disparo 100% Automático**: imprime instantaneamente ao concluir a venda sem necessidade de clicar em botões.
  - **2 Vias Separadas com Corte de Papel (Guilhotina)**:
    - **Via 1 (Cliente)**: Apenas o número da comanda/senha em tamanho gigante para retirada rápida.
    - **Via 2 (Cozinha/Preparo)**: Número da comanda + lista detalhada dos produtos e quantidades pedidos para organização interna.
  - **Compatibilidade Ampla**:
    - **Rede / Wi-Fi / Ethernet**: Conexão direta TCP/IP Socket (porta padrão 9100) via protocolo ESC/POS.
    - **USB / Windows Spooler**: Envio direto RAW para qualquer impressora USB térmica configurada no Windows (POS-80, Elgin, Epson, Bematech).
    - **Navegador**: Modo de impressão automática com quebra de página `@media print`.
  - Painel de teste e diagnóstico da impressora em tempo real no menu de Configurações.
- **Gestão & Retaguarda**:
  - Cadastro, edição e desativação de produtos.
  - Upload ou link para foto dos produtos e alteração rápida de preços.
  - Cadastro de categorias com cores e ícones.
  - Relatório de fechamento de caixa por forma de pagamento e total faturado.
- **100% Online na Web**:
  - Banco de dados em nuvem via **Supabase (PostgreSQL)**, permitindo múltiplos caixas e acesso de qualquer dispositivo (notebook, tablet ou celular).
  - Pronto para deploy com 1 clique no **Render.com** (exatamente como o `erp-fran-estetica`).

---

## 🏛️ Arquitetura

- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons (Ultra-rápido, responsivo e touch-friendly).
- **Backend**: Node.js + Express seguindo o padrão RSC (Routes, Services, Repositories).
- **Banco de Dados**: PostgreSQL no **Supabase** (alta performance, seguro e acessível via web).
- **Deploy**: Arquivo `render.yaml` unificado para build e start automático no Render.

---

## 🚀 Roteiro de Execução Passo a Passo (Roadmap)

### 📌 Etapa 1: Base de Infraestrutura e Banco (Concluído ✅)
- [x] Repositório Git com `.gitignore`, `render.yaml` e branch `main`.
- [x] Script SQL (`schema.sql`) PostgreSQL com schema dedicado e isolado `expobai`.
- [x] Conexão configurada em `server/db.js` e `server/.env` com Supabase e migração automática.

### 📌 Etapa 2: Backend API (Node.js + Express)
- [ ] Instalar dependências em `server/` (`express`, `pg`, `cors`, `dotenv`, `multer`).
- [ ] Repositórios: `categoriasRepository`, `produtosRepository`, `pedidosRepository` (com número sequencial) e `relatoriosRepository` (fechamento de caixa).
- [ ] Rotas REST `/api/categorias`, `/api/produtos`, `/api/pedidos`, `/api/relatorios`, `/api/configuracoes`.
- [ ] Servidor `server/server.js` com suporte estático a `uploads/` e ao build do frontend em produção.

### 📌 Etapa 3: Frontend Caixa Ágil (React + Vite + Tailwind)
- [ ] Setup do app Vite em `client/` com Tailwind CSS no tema Expobai (Verde `#1B4332`, Ouro `#D97706`, Laranja `#EA580C`).
- [ ] Componente `Navbar` (logo Expobai, relógio, alternador Caixa/Admin).
- [ ] Seletor rápido de Categorias em abas/botões.
- [ ] Grade de Produtos touch-friendly com fotos e preços destacados.
- [ ] Painel lateral do Carrinho com controle de quantidade e subtotal dinâmico.
- [ ] Modal de Pagamento: PIX (QR Code e chave), Dinheiro (calculadora de troco), Cartão de Débito e Crédito.
- [ ] Modal de Conclusão com número grande do pedido (ex: `#042`) e botão de impressão de ficha.
- [ ] Painel Admin: Gestão de Produtos (preço, foto, categoria, ativar/desativar), Categorias e Relatório de Fechamento de Caixa.

### 📌 Etapa 4: Integração, Render e Inicializador
- [ ] Criar `iniciar_caixa.bat` para abertura rápida em 1 clique.
- [ ] Teste de compilação de produção (`npm run build`).
- [ ] Instruções de conexão no Render.com para deploy contínuo.
- [ ] Commit e Push final no GitHub.
