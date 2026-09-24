const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function resetVendas() {
  const client = await pool.connect();
  try {
    console.log('🔄 Limpando todos os lançamentos e pedidos de teste no schema expobai...');

    // 1. Truncate nas tabelas de pedidos e itens
    await client.query('TRUNCATE TABLE expobai.pedido_itens, expobai.pedidos RESTART IDENTITY CASCADE;');

    // 2. Resetar sequências de IDs
    await client.query("SELECT setval('expobai.pedidos_id_seq', 1, false);");
    await client.query("SELECT setval('expobai.pedido_itens_id_seq', 1, false);");

    // 3. Verificações
    const resPedidos = await client.query('SELECT count(*) FROM expobai.pedidos;');
    const resItens = await client.query('SELECT count(*) FROM expobai.pedido_itens;');
    const resProdutos = await client.query('SELECT count(*) FROM expobai.produtos;');
    const resCategorias = await client.query('SELECT count(*) FROM expobai.categorias;');

    console.log('===============================================================');
    console.log('✅ SUCESSO: Todos os lançamentos de teste foram excluídos!');
    console.log(`📦 Total de Pedidos atuais: ${resPedidos.rows[0].count}`);
    console.log(`📋 Total de Itens vendidos: ${resItens.rows[0].count}`);
    console.log(`🥩 Cardápio ativo mantido: ${resProdutos.rows[0].count} produtos em ${resCategorias.rows[0].count} categorias.`);
    console.log('🎟️ Próximo pedido sequencial será exatamente: #001');
    console.log('===============================================================');
  } catch (err) {
    console.error('❌ Erro ao resetar banco de dados:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

resetVendas();
