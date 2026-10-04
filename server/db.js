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
  ssl: connectionString.includes('sslmode=require') || connectionString.includes('supabase') ? { rejectUnauthorized: false } : false
});

let _resolveReady;
const dbReady = new Promise((resolve) => {
  _resolveReady = resolve;
});

async function initDB() {
  try {
    console.log('🔄 Conectando ao PostgreSQL local (postgres-main) e inicializando schema expobai...');

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

      CREATE TABLE IF NOT EXISTS expobai.sessoes_caixa (
        id SERIAL PRIMARY KEY,
        operador VARCHAR(100) DEFAULT 'Operador Caixa',
        valor_abertura NUMERIC(10, 2) DEFAULT 0,
        valor_fechamento_dinheiro NUMERIC(10, 2),
        status VARCHAR(20) DEFAULT 'aberto',
        aberto_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        fechado_em TIMESTAMP WITH TIME ZONE,
        observacoes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_expobai_produtos_categoria ON expobai.produtos(categoria_id);
      CREATE INDEX IF NOT EXISTS idx_expobai_pedidos_data ON expobai.pedidos(data_hora);
      CREATE INDEX IF NOT EXISTS idx_expobai_pedido_itens_pedido ON expobai.pedido_itens(pedido_id);
      CREATE INDEX IF NOT EXISTS idx_expobai_sessoes_status ON expobai.sessoes_caixa(status);

      -- Migrações v2: Concorrência atômica, custos, split payment e auditoria de edição
      CREATE SEQUENCE IF NOT EXISTS expobai.pedidos_numero_seq;
      SELECT setval('expobai.pedidos_numero_seq', COALESCE((SELECT MAX(numero_pedido) FROM expobai.pedidos), 0));
      ALTER TABLE expobai.produtos ADD COLUMN IF NOT EXISTS preco_custo NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE expobai.pedidos ADD COLUMN IF NOT EXISTS pagamentos JSONB DEFAULT NULL;
      ALTER TABLE expobai.pedidos ADD COLUMN IF NOT EXISTS editado BOOLEAN DEFAULT FALSE;
      ALTER TABLE expobai.pedidos ADD COLUMN IF NOT EXISTS editado_em TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      ALTER TABLE expobai.pedidos ADD COLUMN IF NOT EXISTS motivo_edicao TEXT DEFAULT NULL;
      INSERT INTO expobai.configuracoes (chave, valor) VALUES ('pix_cnpj', '') ON CONFLICT DO NOTHING;
      INSERT INTO expobai.configuracoes (chave, valor) VALUES ('pix_qrcode_url', '/img/pix-qrcode.jpeg') ON CONFLICT DO NOTHING;

      -- Migrações v3: Suporte a combos com preços diferentes
      ALTER TABLE expobai.produtos ADD COLUMN IF NOT EXISTS combos JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE expobai.produtos ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT FALSE;
      ALTER TABLE expobai.produtos ADD COLUMN IF NOT EXISTS itens_combo JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE expobai.pedido_itens ADD COLUMN IF NOT EXISTS preco_custo NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE expobai.pedido_itens ADD COLUMN IF NOT EXISTS combo_info JSONB DEFAULT NULL;

      -- Migrações v4: Categoria Combos Pré-Prontos e Origem da Venda (Desktop vs Mobile)
      INSERT INTO expobai.categorias (nome, icone, cor, ordem, ativo)
      SELECT 'Combos', 'sparkles', '#7C3AED', 999, 1
      WHERE NOT EXISTS (SELECT 1 FROM expobai.categorias WHERE LOWER(nome) = 'combos');
      UPDATE expobai.categorias SET ordem = 999 WHERE LOWER(nome) LIKE '%combo%';
      ALTER TABLE expobai.pedidos ADD COLUMN IF NOT EXISTS origem VARCHAR(20) DEFAULT 'desktop';

      -- Migrações v5: Rateio entre Sócios (Alex, Heitor, Pais) e Custos de Exposição da Tenda
      ALTER TABLE expobai.produtos ADD COLUMN IF NOT EXISTS socio VARCHAR(20) DEFAULT 'alex';

      -- Auto-classificação padrão dos produtos atuais
      UPDATE expobai.produtos SET socio = 'alex' 
      WHERE (LOWER(nome) LIKE '%espetinho%' OR categoria_id = 1) 
        AND LOWER(nome) NOT LIKE '%pão%' AND LOWER(nome) NOT LIKE '%pao%';

      UPDATE expobai.produtos SET socio = 'heitor' 
      WHERE LOWER(nome) LIKE '%pão%' OR LOWER(nome) LIKE '%pao%' 
         OR categoria_id IN (2, 4) 
         OR LOWER(nome) LIKE '%agua%' OR LOWER(nome) LIKE '%água%' 
         OR LOWER(nome) LIKE '%refrigerante%' OR LOWER(nome) LIKE '%suco%' 
         OR LOWER(nome) LIKE '%soda%' OR LOWER(nome) LIKE '%cerveja%' 
         OR LOWER(nome) LIKE '%amstel%' OR LOWER(nome) LIKE '%heineken%' 
         OR LOWER(nome) LIKE '%chopp%' OR LOWER(nome) LIKE '%carregamento%';

      UPDATE expobai.produtos SET socio = 'pais' 
      WHERE LOWER(nome) LIKE '%cookie%' OR categoria_id = 3;

      -- Garante que o custo histórico dos itens acompanhe fielmente o custo fixo cadastrado no produto
      UPDATE expobai.pedido_itens i
      SET preco_custo = p.preco_custo
      FROM expobai.produtos p
      WHERE i.produto_id = p.id;

      -- Tabela de Custos do Evento (Estande, Internet, Estacionamento, etc.)
      CREATE TABLE IF NOT EXISTS expobai.custos_evento (
        id SERIAL PRIMARY KEY,
        descricao VARCHAR(150) NOT NULL,
        valor NUMERIC(10, 2) NOT NULL,
        divisao VARCHAR(30) DEFAULT 'alex_heitor', -- 'alex_heitor', 'todos', 'somente_alex', 'somente_heitor', 'somente_pais'
        pago_por VARCHAR(20) DEFAULT 'caixa', -- 'caixa', 'alex', 'heitor', 'pais'
        observacoes TEXT,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Inserir custos padrão iniciais se a tabela estiver vazia
      INSERT INTO expobai.custos_evento (descricao, valor, divisao, pago_por, observacoes)
      SELECT 'Aluguel do Estande / Tenda Expobai', 1800.00, 'alex_heitor', 'caixa', 'Custo de exposição da feira'
      WHERE NOT EXISTS (SELECT 1 FROM expobai.custos_evento WHERE LOWER(descricao) LIKE '%estande%' OR LOWER(descricao) LIKE '%tenda%');

      INSERT INTO expobai.custos_evento (descricao, valor, divisao, pago_por, observacoes)
      SELECT 'Internet Wi-Fi da Feira', 150.00, 'alex_heitor', 'caixa', 'Ponto de internet para o estande'
      WHERE NOT EXISTS (SELECT 1 FROM expobai.custos_evento WHERE LOWER(descricao) LIKE '%internet%');

      INSERT INTO expobai.custos_evento (descricao, valor, divisao, pago_por, observacoes)
      SELECT 'Estacionamento do Evento', 100.00, 'alex_heitor', 'caixa', 'Acesso de veículos da barraca'
      WHERE NOT EXISTS (SELECT 1 FROM expobai.custos_evento WHERE LOWER(descricao) LIKE '%estacionamento%');

      INSERT INTO expobai.configuracoes (chave, valor) VALUES ('rateio_conta_cartao', 'alex') ON CONFLICT DO NOTHING;
      INSERT INTO expobai.configuracoes (chave, valor) VALUES ('rateio_conta_pix', 'pais') ON CONFLICT DO NOTHING;
      INSERT INTO expobai.configuracoes (chave, valor) VALUES ('rateio_conta_dinheiro', 'caixa') ON CONFLICT DO NOTHING;
      INSERT INTO expobai.configuracoes (chave, valor) VALUES ('rateio_pix_alex', '') ON CONFLICT DO NOTHING;
      INSERT INTO expobai.configuracoes (chave, valor) VALUES ('rateio_pix_heitor', '') ON CONFLICT DO NOTHING;
      INSERT INTO expobai.configuracoes (chave, valor) VALUES ('rateio_pix_pais', '') ON CONFLICT DO NOTHING;

      -- Migrações v6: Fichas individuais de retirada e Fundação Multi-tenant ExpoERP
      CREATE TABLE IF NOT EXISTS expobai.tenants (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        responsavel VARCHAR(100),
        telefone VARCHAR(50),
        plano VARCHAR(50) DEFAULT 'evento',
        ativo BOOLEAN DEFAULT TRUE,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO expobai.tenants (id, nome, responsavel)
      VALUES ('tenda-muller', 'Tenda dos Müller', 'Heitor Müller')
      ON CONFLICT (id) DO NOTHING;

      ALTER TABLE expobai.tenants ADD COLUMN IF NOT EXISTS valido_ate TIMESTAMP WITH TIME ZONE;
      ALTER TABLE expobai.tenants ADD COLUMN IF NOT EXISTS documento VARCHAR(20);
      ALTER TABLE expobai.tenants ADD COLUMN IF NOT EXISTS limite_dispositivos INTEGER DEFAULT 5;
      ALTER TABLE expobai.tenants ADD COLUMN IF NOT EXISTS modulos JSONB DEFAULT '["core_pos", "mod_fichas", "mod_bi_horarios", "mod_rateio_socios", "mod_custos_cmv", "mod_mobile_track"]'::jsonb;
      ALTER TABLE expobai.tenants ADD COLUMN IF NOT EXISTS valor_plano NUMERIC(10,2) DEFAULT 0.00;

      UPDATE expobai.tenants 
      SET modulos = '["core_pos", "mod_fichas", "mod_bi_horarios", "mod_rateio_socios", "mod_custos_cmv", "mod_mobile_track"]'::jsonb
      WHERE modulos IS NULL OR id = 'tenda-muller';

      ALTER TABLE expobai.produtos ADD COLUMN IF NOT EXISTS gera_ficha BOOLEAN DEFAULT TRUE;
      ALTER TABLE expobai.pedidos ADD COLUMN IF NOT EXISTS imprimir_fichas BOOLEAN DEFAULT TRUE;
      ALTER TABLE expobai.produtos ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'tenda-muller';
      ALTER TABLE expobai.pedidos ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'tenda-muller';
      ALTER TABLE expobai.categorias ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'tenda-muller';
      ALTER TABLE expobai.sessoes_caixa ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'tenda-muller';
      ALTER TABLE expobai.custos_evento ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'tenda-muller';

      INSERT INTO expobai.configuracoes (chave, valor) VALUES ('imprimir_fichas_retirada', 'true') ON CONFLICT DO NOTHING;
      INSERT INTO expobai.configuracoes (chave, valor) VALUES ('nome_sistema', 'ExpoERP') ON CONFLICT DO NOTHING;

      ALTER TABLE expobai.configuracoes ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'tenda-muller';
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_namespace n ON n.oid = c.connamespace
          WHERE c.conname = 'configuracoes_pkey' AND n.nspname = 'expobai'
        ) THEN
          ALTER TABLE expobai.configuracoes DROP CONSTRAINT configuracoes_pkey;
          ALTER TABLE expobai.configuracoes ADD CONSTRAINT configuracoes_pkey PRIMARY KEY (tenant_id, chave);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;

      -- Migrações v7: Autenticação Segura, RBAC e Gestão de Usuários Multi-Tenant
      CREATE TABLE IF NOT EXISTS expobai.usuarios (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL REFERENCES expobai.tenants(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        pin_acesso_rapido VARCHAR(10),
        role VARCHAR(20) NOT NULL DEFAULT 'caixa', -- 'superadmin', 'admin', 'caixa'
        ativo BOOLEAN DEFAULT TRUE,
        ultimo_login TIMESTAMP WITH TIME ZONE,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON expobai.usuarios(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_usuarios_email ON expobai.usuarios(email);

      -- Seed de usuários essenciais (SuperAdmin e Tenda Muller)
      INSERT INTO expobai.usuarios (tenant_id, nome, email, senha_hash, pin_acesso_rapido, role) VALUES
        ('tenda-muller', 'Heitor Müller (Super Admin)', 'admin@expoerp.com.br', '$2b$12$BPxKTS6pttHi9ylf14EKLuHfMG.WTpFpNjZaxJJKcEnAjgo679Rny', '9999', 'superadmin'),
        ('tenda-muller', 'Heitor Müller (Admin Tenda)', 'muller@expoerp.com.br', '$2b$12$UOaM0vvpjjtDOcatHTHPrueB1J2OrvxRVgyB99yorGeLu7c0qsylK', '1020', 'admin'),
        ('tenda-muller', 'Operador Caixa', 'caixa@expoerp.com.br', '$2b$12$vs3RuaSHTbzvZf2YBVRMJ.6G97ff7Xd9u8fe4DNiOCtdhee7x287q', '1234', 'caixa')
      ON CONFLICT (email) DO NOTHING;

      -- Migrações v8: Rastreio de Dispositivos e Limite de Aparelhos Conectados
      CREATE TABLE IF NOT EXISTS expobai.dispositivos_ativos (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL REFERENCES expobai.tenants(id) ON DELETE CASCADE,
        device_id VARCHAR(100) NOT NULL,
        device_info VARCHAR(255),
        usuario_id INTEGER REFERENCES expobai.usuarios(id) ON DELETE SET NULL,
        ip_address VARCHAR(50),
        ultimo_acesso TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_tenant_device UNIQUE (tenant_id, device_id)
      );
      CREATE INDEX IF NOT EXISTS idx_dispositivos_tenant_acesso ON expobai.dispositivos_ativos(tenant_id, ultimo_acesso);
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
          ('prefixo_pedido', 'EXP'),
          ('impressora_tipo', 'usb'),
          ('impressora_ip', '192.168.1.200'),
          ('impressora_porta', '9100'),
          ('impressora_auto_imprimir', 'true'),
          ('impressora_vias', 'ambas'),
          ('impressora_largura', '80mm'),
          ('impressora_cortar_papel', 'true')
        ON CONFLICT DO NOTHING;
      `);
    }

    console.log('✅ Banco de dados PostgreSQL local (Contabo VPS) - Schema "expobai" pronto e verificado!');
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
