-- =====================================================================
-- 🤠 ERP EXPOBAI - SCHEMA POSTGRESQL ISOLADO (SUPABASE)
-- Cria o schema dedicado "expobai" no mesmo banco de dados da Fran
-- Isolamento 100% seguro sem interferir nas tabelas existentes.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS expobai;

-- 1. Tabela de Categorias
CREATE TABLE IF NOT EXISTS expobai.categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  icone VARCHAR(50) DEFAULT 'utensils',
  cor VARCHAR(20) DEFAULT '#2D6A4F',
  ordem INTEGER DEFAULT 0,
  ativo INTEGER DEFAULT 1,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Produtos
CREATE TABLE IF NOT EXISTS expobai.produtos (
  id SERIAL PRIMARY KEY,
  categoria_id INTEGER NOT NULL REFERENCES expobai.categorias(id) ON DELETE CASCADE,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  preco NUMERIC(10, 2) NOT NULL,
  foto_url TEXT,
  ativo INTEGER DEFAULT 1,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Pedidos (Vendas no Caixa)
CREATE TABLE IF NOT EXISTS expobai.pedidos (
  id SERIAL PRIMARY KEY,
  numero_pedido INTEGER NOT NULL,
  codigo_identificador VARCHAR(20) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  forma_pagamento VARCHAR(50) NOT NULL, -- 'pix', 'dinheiro', 'debito', 'credito'
  valor_pago NUMERIC(10, 2),
  troco NUMERIC(10, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'concluido', -- 'concluido', 'cancelado'
  observacoes TEXT,
  data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS expobai.pedido_itens (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES expobai.pedidos(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES expobai.produtos(id) ON DELETE SET NULL,
  nome_produto VARCHAR(150) NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL
);

-- 5. Tabela de Configurações Gerais do Estande
CREATE TABLE IF NOT EXISTS expobai.configuracoes (
  chave VARCHAR(50) PRIMARY KEY,
  valor TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_expobai_produtos_categoria ON expobai.produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_expobai_pedidos_data ON expobai.pedidos(data_hora);
CREATE INDEX IF NOT EXISTS idx_expobai_pedido_itens_pedido ON expobai.pedido_itens(pedido_id);

-- Inserção de Dados Iniciais de Exemplo (Seed)
INSERT INTO expobai.categorias (id, nome, icone, cor, ordem) VALUES
  (1, 'Salgados', 'beef', '#1B4332', 1),
  (2, 'Bebidas', 'cup-soda', '#2D6A4F', 2),
  (3, 'Doces', 'cake', '#D97706', 3),
  (4, 'Porções', 'utensils', '#B45309', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('expobai.categorias_id_seq', COALESCE((SELECT MAX(id) FROM expobai.categorias), 1));

INSERT INTO expobai.produtos (id, categoria_id, nome, descricao, preco, foto_url) VALUES
  (1, 1, 'Espetinho de Carne', 'Acompanha mandioca e farofa especial', 18.00, '/img/espetinho-carne.jpg'),
  (2, 1, 'Espetinho Frango', 'Espetinho de frango dourado na brasa', 18.00, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80'),
  (3, 1, 'Espetinho de Queijo', 'Queijo coalho tostado na brasa', 15.00, '/img/espetinho-queijo.jpg'),
  (4, 1, 'Espetinho de coraçäo', 'Coraçãozinho de frango temperado na brasa', 18.00, '/img/espetinho-coracao.jpg'),
  (5, 2, 'Suco de Polpa', 'Suco natural de frutas bem gelado', 10.00, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80'),
  (6, 2, 'Refrigerante', 'Refrigerante gelado em lata 350ml', 7.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80'),
  (7, 2, 'Água Mineral 500ml', 'Com ou sem gás', 5.00, 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=600&auto=format&fit=crop&q=80'),
  (9, 3, 'Cookies', 'Cookies artesanais com gotas de chocolate nobre', 8.00, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80'),
  (11, 4, 'Carregamento', 'Ponto de recarga rápida de celular', 10.00, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80'),
  (12, 2, 'Soda Italiana', 'Refrescante com xarope de frutas e água com gás', 14.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

SELECT setval('expobai.produtos_id_seq', COALESCE((SELECT MAX(id) FROM expobai.produtos), 1));

INSERT INTO expobai.configuracoes (chave, valor) VALUES
  ('nome_estande', 'Tenda dos Müller'),
  ('chave_pix', 'pix@expobai.com.br'),
  ('prefixo_pedido', 'EXP')
ON CONFLICT (chave) DO NOTHING;
