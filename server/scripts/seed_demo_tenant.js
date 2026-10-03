/**
 * Script de Seed: Criação de Novo Cliente Demo (Churrascaria & Espeto do Gaúcho)
 * com Dados Fictícios Realistas para Demonstração Comercial do ExpoERP.
 * 
 * Permite demonstrar:
 * 1. Isolamento multi-tenant completo (dados isolados de tenda-muller).
 * 2. Bloqueio modular (upsell): mod_rateio_socios e mod_custos_cmv desabilitados para este cliente.
 * 3. Inteligência de Cesta & Cross-Selling (BI) calculada ao vivo com produtos e pedidos do Gaúcho.
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL não configurada no .env');
  process.exit(1);
}

let connectionString = dbUrl;
if (connectionString.startsWith('postgres://')) {
  connectionString = connectionString.replace(/^postgres:\/\//, 'postgresql://');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=require') || connectionString.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function runSeed() {
  const client = await pool.connect();
  try {
    console.log('🚀 Iniciando Seed do Novo Cliente Demo: churrasco-gaucho...');
    await client.query('BEGIN');

    const tenantId = 'churrasco-gaucho';
    const tenantNome = 'Churrascaria & Espeto do Gaúcho';

    // 1. Limpar dados anteriores do tenant de teste se já existirem (idempotente)
    console.log('🧹 Limpando dados residuais anteriores de', tenantId);
    await client.query('DELETE FROM expobai.pedido_itens WHERE pedido_id IN (SELECT id FROM expobai.pedidos WHERE tenant_id = $1)', [tenantId]);
    await client.query('DELETE FROM expobai.pedidos WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM expobai.produtos WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM expobai.categorias WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM expobai.configuracoes WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM expobai.usuarios WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM expobai.tenants WHERE id = $1', [tenantId]);

    // 2. Inserir Tenant (com apenas 3 módulos ativos para demonstrar o bloqueio comercial dos outros)
    console.log('🏢 Cadastrando Tenant:', tenantNome);
    await client.query(`
      INSERT INTO expobai.tenants (
        id, nome, responsavel, telefone, documento, plano, valido_ate, modulos, valor_plano, ativo
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10
      )
    `, [
      tenantId,
      tenantNome,
      'Mateus Gaúcho',
      '(67) 99888-7711',
      '28.491.029/0001-84',
      'evento',
      new Date('2026-12-31T23:59:59Z'),
      JSON.stringify(['core_pos', 'mod_fichas', 'mod_bi_horarios']), // Sem mod_rateio_socios e mod_custos_cmv para demonstrar o Lock!
      600.00,
      true
    ]);

    // 3. Cadastrar Usuários do Tenant
    console.log('👤 Cadastrando Usuários (Admin e Caixa)...');
    const hashAdmin = await bcrypt.hash('gaucho2026', 12);
    const hashCaixa = await bcrypt.hash('caixa123', 12);

    await client.query(`
      INSERT INTO expobai.usuarios (tenant_id, nome, email, senha_hash, pin_acesso_rapido, role, ativo)
      VALUES 
        ($1, 'Mateus Gaúcho (Admin)', 'gaucho@expoerp.com.br', $2, '1020', 'admin', true),
        ($1, 'Operador Caixa Gaúcho', 'caixa.gaucho@expoerp.com.br', $3, '1234', 'caixa', true)
    `, [tenantId, hashAdmin, hashCaixa]);

    // 4. Configurações do Estande
    console.log('⚙️ Gravando Configurações do Estande...');
    const configs = [
      ['nome_estande', 'Churrascaria & Espeto do Gaúcho'],
      ['chave_pix', 'mateus.gaucho@churrasco.com.br'],
      ['prefixo_pedido', 'GAU'],
      ['imprimir_fichas_retirada', 'true'],
      ['impressora_largura', '80mm'],
      ['impressora_cortar_papel', 'true']
    ];
    for (const [chave, valor] of configs) {
      await client.query(`
        INSERT INTO expobai.configuracoes (tenant_id, chave, valor)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, chave) DO UPDATE SET valor = EXCLUDED.valor
      `, [tenantId, chave, valor]);
    }

    // 5. Categorias
    console.log('📁 Inserindo Categorias de Produtos...');
    const catCarnes = (await client.query(`
      INSERT INTO expobai.categorias (tenant_id, nome, icone, cor, ordem, ativo)
      VALUES ($1, 'Espetos & Carnes Nobres', 'beef', '#8B0000', 1, 1)
      RETURNING id
    `, [tenantId])).rows[0].id;

    const catBebidas = (await client.query(`
      INSERT INTO expobai.categorias (tenant_id, nome, icone, cor, ordem, ativo)
      VALUES ($1, 'Bebidas & Chopp Gelado', 'cup-soda', '#006400', 2, 1)
      RETURNING id
    `, [tenantId])).rows[0].id;

    const catPorcoes = (await client.query(`
      INSERT INTO expobai.categorias (tenant_id, nome, icone, cor, ordem, ativo)
      VALUES ($1, 'Porções & Acompanhamentos', 'utensils', '#B8860B', 3, 1)
      RETURNING id
    `, [tenantId])).rows[0].id;

    // 6. Produtos
    console.log('🥩 Inserindo Produtos do Cardápio...');
    const produtosList = [
      // Carnes
      { cat: catCarnes, nome: 'Espeto de Picanha Prime', preco: 28.00, custo: 14.00, foto: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600' },
      { cat: catCarnes, nome: 'Espeto de Alcatra c/ Queijo Coalho', preco: 22.00, custo: 10.00, foto: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600' },
      { cat: catCarnes, nome: 'Espeto de Linguiça Campeira', preco: 16.00, custo: 6.50, foto: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600' },
      { cat: catCarnes, nome: 'Espeto de Cupim na Brasa', preco: 20.00, custo: 9.00, foto: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600' },
      { cat: catCarnes, nome: 'Pão de Alho Especial c/ Queijo', preco: 12.00, custo: 4.00, foto: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600' },
      // Bebidas
      { cat: catBebidas, nome: 'Chopp Artesanal Pilsen 400ml', preco: 15.00, custo: 6.00, foto: 'https://images.unsplash.com/photo-1538488881522-432fa3582e23?w=600' },
      { cat: catBebidas, nome: 'Cerveja Lata 350ml', preco: 8.00, custo: 3.80, foto: 'https://images.unsplash.com/photo-1608270195655-b467ec6b7f32?w=600' },
      { cat: catBebidas, nome: 'Refrigerante Gelado 350ml', preco: 7.00, custo: 3.00, foto: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600' },
      { cat: catBebidas, nome: 'Água Mineral 500ml', preco: 5.00, custo: 1.50, foto: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=600' },
      // Porções
      { cat: catPorcoes, nome: 'Porção Mandioca na Manteiga', preco: 15.00, custo: 5.00, foto: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600' },
      { cat: catPorcoes, nome: 'Farofa Gaúcha Crocante c/ Bacon', preco: 10.00, custo: 3.50, foto: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600' }
    ];

    const prodMap = {};
    for (const p of produtosList) {
      const res = await client.query(`
        INSERT INTO expobai.produtos (tenant_id, categoria_id, nome, preco, preco_custo, foto_url, ativo, gera_ficha)
        VALUES ($1, $2, $3, $4, $5, $6, 1, true)
        RETURNING id, nome, preco, preco_custo
      `, [tenantId, p.cat, p.nome, p.preco, p.custo, p.foto]);
      prodMap[p.nome] = res.rows[0];
    }

    // 7. Gerar ~85 Pedidos Fictícios Realistas com Diversidade de SKUs
    console.log('🛒 Gerando 85 Pedidos Fictícios Realistas...');

    const formasPagamento = ['pix', 'pix', 'cartao_debito', 'cartao_credito', 'dinheiro'];
    const picanha = prodMap['Espeto de Picanha Prime'];
    const alcatra = prodMap['Espeto de Alcatra c/ Queijo Coalho'];
    const linguica = prodMap['Espeto de Linguiça Campeira'];
    const cupim = prodMap['Espeto de Cupim na Brasa'];
    const paoAlho = prodMap['Pão de Alho Especial c/ Queijo'];
    const chopp = prodMap['Chopp Artesanal Pilsen 400ml'];
    const cerveja = prodMap['Cerveja Lata 350ml'];
    const refri = prodMap['Refrigerante Gelado 350ml'];
    const agua = prodMap['Água Mineral 500ml'];
    const mandioca = prodMap['Porção Mandioca na Manteiga'];

    // Padrões de pedidos para simular a distribuição real (70% 1 SKU, 22% 2 SKUs, 8% 3+ SKUs)
    const orderTemplates = [
      // Monoproduto (1 SKU) - Alta frequência
      { items: [{ p: agua, q: 1 }] },
      { items: [{ p: agua, q: 2 }] },
      { items: [{ p: chopp, q: 1 }] },
      { items: [{ p: chopp, q: 2 }] },
      { items: [{ p: picanha, q: 1 }] },
      { items: [{ p: picanha, q: 2 }] },
      { items: [{ p: alcatra, q: 1 }] },
      { items: [{ p: alcatra, q: 2 }] },
      { items: [{ p: refri, q: 1 }] },
      { items: [{ p: cerveja, q: 1 }] },
      { items: [{ p: cerveja, q: 2 }] },
      { items: [{ p: linguica, q: 1 }] },
      { items: [{ p: cupim, q: 1 }] },
      { items: [{ p: paoAlho, q: 1 }] },

      // Cross-Selling (2 SKUs) - Pares fortes
      { items: [{ p: picanha, q: 1 }, { p: chopp, q: 1 }] },
      { items: [{ p: picanha, q: 1 }, { p: chopp, q: 2 }] },
      { items: [{ p: alcatra, q: 1 }, { p: refri, q: 1 }] },
      { items: [{ p: linguica, q: 1 }, { p: cerveja, q: 1 }] },
      { items: [{ p: cupim, q: 1 }, { p: chopp, q: 1 }] },
      { items: [{ p: picanha, q: 2 }, { p: mandioca, q: 1 }] },
      { items: [{ p: chopp, q: 2 }, { p: agua, q: 1 }] },

      // Combos Maiores (3 SKUs)
      { items: [{ p: picanha, q: 2 }, { p: mandioca, q: 1 }, { p: chopp, q: 2 }] },
      { items: [{ p: alcatra, q: 1 }, { p: paoAlho, q: 1 }, { p: refri, q: 1 }] },
      { items: [{ p: cupim, q: 2 }, { p: paoAlho, q: 2 }, { p: cerveja, q: 2 }] }
    ];

    // Gerar 85 pedidos distribuídos entre os dias 04/09 e 07/09/2026
    let orderNum = 1;
    for (let i = 0; i < 85; i++) {
      // Sorteia template ponderado
      let tpl;
      const rand = Math.random();
      if (rand < 0.70) {
        // Monoproduto (1 SKU)
        tpl = orderTemplates[Math.floor(Math.random() * 14)];
      } else if (rand < 0.92) {
        // 2 SKUs (Cross-selling)
        tpl = orderTemplates[14 + Math.floor(Math.random() * 7)];
      } else {
        // 3 SKUs
        tpl = orderTemplates[21 + Math.floor(Math.random() * 3)];
      }

      const formaPag = formasPagamento[Math.floor(Math.random() * formasPagamento.length)];
      const total = tpl.items.reduce((acc, it) => acc + (parseFloat(it.p.preco) * it.q), 0);
      
      // Data simulada
      const dia = 4 + (i % 4); // Dias 4, 5, 6 ou 7 de Setembro
      const hora = 12 + Math.floor(Math.random() * 11); // 12h às 22h
      const minuto = Math.floor(Math.random() * 60);
      const dataHora = `2026-09-0${dia}T${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}:00-04:00`;

      const pagamentosJson = [{
        forma: formaPag,
        valor: total
      }];

      const resPedido = await client.query(`
        INSERT INTO expobai.pedidos (
          tenant_id, numero_pedido, codigo_identificador, total, forma_pagamento, 
          valor_pago, troco, status, pagamentos, data_hora, origem, imprimir_fichas
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 0, 'concluido', $7::jsonb, $8, $9, true
        )
        RETURNING id
      `, [
        tenantId,
        orderNum,
        `GAU-${orderNum.toString().padStart(4, '0')}`,
        total,
        formaPag,
        total,
        JSON.stringify(pagamentosJson),
        dataHora,
        i % 4 === 0 ? 'mobile' : 'desktop'
      ]);

      const pedidoId = resPedido.rows[0].id;

      // Inserir itens
      for (const it of tpl.items) {
        const subtotal = parseFloat(it.p.preco) * it.q;
        await client.query(`
          INSERT INTO expobai.pedido_itens (
            pedido_id, produto_id, nome_produto, quantidade, preco_unitario, preco_custo, subtotal
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
          )
        `, [
          pedidoId,
          it.p.id,
          it.p.nome,
          it.q,
          parseFloat(it.p.preco),
          parseFloat(it.p.preco_custo),
          subtotal
        ]);
      }

      orderNum++;
    }

    await client.query('COMMIT');
    console.log('✅ SEED CONCLUÍDO COM SUCESSO!');
    console.log('----------------------------------------------------');
    console.log('Tenant:', tenantNome, `(${tenantId})`);
    console.log('Módulos Ativos:', ['core_pos', 'mod_fichas', 'mod_bi_horarios']);
    console.log('Módulos Bloqueados (Upsell): mod_rateio_socios, mod_custos_cmv');
    console.log('Login Admin:', 'gaucho@expoerp.com.br / gaucho2026 (PIN: 1020)');
    console.log('Login Caixa:', 'caixa.gaucho@expoerp.com.br / caixa123 (PIN: 1234)');
    console.log('Total de Pedidos Gerados:', orderNum - 1);
    console.log('----------------------------------------------------');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro no seed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
