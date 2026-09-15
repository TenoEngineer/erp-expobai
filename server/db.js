const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('ERRO FATAL: DATABASE_URL não definida no .env!');
  process.exit(1);
}

let connectionString = dbUrl;
if (connectionString.startsWith('postgres://')) {
  connectionString = connectionString.replace(/^postgres:\/\//, 'postgresql://');
}

const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false
  }
});

let _resolveReady;
const dbReady = new Promise((resolve) => {
  _resolveReady = resolve;
});

async function initDB() {
  try {
    console.log('🔄 Conectando ao Supabase e inicializando schema expobai...');

    // 1. Criar o schema isolado expobai
    await pool.query('CREATE SCHEMA IF NOT EXISTS expobai;');

    // 2. Criar tabelas dentro do schema expobai
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expobai.categorias (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        icone VARCHAR(50) DEFAULT 'utensils',
        cor VARCHAR(20) DEFAULT '#2D6A4F',
        ordem INTEGER DEFAULT 0,
        ativo INTEGER DEFAULT 1,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS expobai.pedidos (
        id SERIAL PRIMARY KEY,
        numero_pedido INTEGER NOT NULL,
        codigo_identificador VARCHAR(20) NOT NULL,
        total NUMERIC(10, 2) NOT NULL,
        forma_pagamento VARCHAR(50) NOT NULL,
        valor_pago NUMERIC(10, 2),
        troco NUMERIC(10, 2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'concluido',
        observacoes TEXT,
        data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expobai.pedido_itens (
        id SERIAL PRIMARY KEY,
        pedido_id INTEGER NOT NULL REFERENCES expobai.pedidos(id) ON DELETE CASCADE,
        produto_id INTEGER REFERENCES expobai.produtos(id) ON DELETE SET NULL,
        nome_produto VARCHAR(150) NOT NULL,
        quantidade INTEGER NOT NULL,
        preco_unitario NUMERIC(10, 2) NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expobai.configuracoes (
        chave VARCHAR(50) PRIMARY KEY,
        valor TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_expobai_produtos_categoria ON expobai.produtos(categoria_id);
      CREATE INDEX IF NOT EXISTS idx_expobai_pedidos_data ON expobai.pedidos(data_hora);
      CREATE INDEX IF NOT EXISTS idx_expobai_pedido_itens_pedido ON expobai.pedido_itens(pedido_id);
    `);

    // 3. Seed inicial de categorias se estiver vazio
    const catCheck = await pool.query('SELECT count(*) FROM expobai.categorias');
    if (parseInt(catCheck.rows[0].count, 10) === 0) {
      console.log('🌱 Inserindo categorias e produtos padrão no schema expobai...');
      await pool.query(`
        INSERT INTO expobai.categorias (id, nome, icone, cor, ordem) VALUES
          (1, 'Salgados', 'beef', '#1B4332', 1),
          (2, 'Bebidas', 'cup-soda', '#2D6A4F', 2),
          (3, 'Doces', 'cake', '#D97706', 3),
          (4, 'Porções', 'utensils', '#B45309', 4)
        ON CONFLICT (id) DO NOTHING;

        SELECT setval('expobai.categorias_id_seq', COALESCE((SELECT MAX(id) FROM expobai.categorias), 1));

        INSERT INTO expobai.produtos (id, categoria_id, nome, descricao, preco, foto_url) VALUES
          (1, 1, 'Espetinho de Carne', 'Acompanha mandioca e farofa especial', 18.00, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400'),
          (2, 1, 'Espetinho Frango c/ Bacon', 'Acompanha mandioca e farofa especial', 18.00, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400'),
          (3, 1, 'Pastel de Carne', 'Frito na hora, massa crocante', 12.00, 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=400'),
          (4, 1, 'Coxinha de Frango', 'Massa especial com recheio cremoso', 10.00, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400'),
          (5, 2, 'Chopp Artesanal 500ml', 'Pilsen bem gelado no copo da festa', 15.00, 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400'),
          (6, 2, 'Refrigerante Lata 350ml', 'Coca-Cola, Guaraná ou Fanta', 7.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400'),
          (7, 2, 'Água Mineral 500ml', 'Com ou sem gás', 5.00, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400'),
          (8, 2, 'Suco Natural 400ml', 'Laranja ou Maracujá gelado', 10.00, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400'),
          (9, 3, 'Cookies de Chocolate', 'Cookie artesanal com gotas de chocolate nobre', 8.00, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400'),
          (10, 3, 'Churros Recheado', 'Recheado com doce de leite e canela', 12.00, 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=400')
        ON CONFLICT (id) DO NOTHING;

        SELECT setval('expobai.produtos_id_seq', COALESCE((SELECT MAX(id) FROM expobai.produtos), 1));

        INSERT INTO expobai.configuracoes (chave, valor) VALUES
          ('nome_estande', 'Tenda dos Müller'),
          ('chave_pix', 'pix@expobai.com.br'),
          ('prefixo_pedido', 'EXP')
        ON CONFLICT (chave) DO NOTHING;
      `);
    }

    console.log('✅ Banco de dados PostgreSQL (Supabase) - Schema "expobai" pronto e verificado!');
    _resolveReady();
  } catch (err) {
    console.error('❌ Erro na inicialização do schema expobai:', err);
    _resolveReady();
  }
}

initDB();

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  dbReady
};
