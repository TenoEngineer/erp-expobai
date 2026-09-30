const { pool } = require('../db');

async function test() {
  try {
    const res = await pool.query(`
      SELECT 
        forma_pagamento, 
        COUNT(*) as total_vendas, 
        SUM(total) as valor_total
      FROM expobai.pedidos
      WHERE status = 'concluido'
        AND data_hora >= '2026-09-24 00:00:00'
        AND data_hora <= '2026-09-27 23:59:59'
      GROUP BY forma_pagamento
      ORDER BY total_vendas DESC;
    `);
    console.log('Resultados no Sistema (24/09 a 27/09):');
    console.table(res.rows);

    const overall = await pool.query(`
      SELECT 
        COUNT(*) as total_pedidos,
        SUM(total) as faturamento_total
      FROM expobai.pedidos
      WHERE status = 'concluido'
        AND data_hora >= '2026-09-24 00:00:00'
        AND data_hora <= '2026-09-27 23:59:59';
    `);
    console.log('Total Geral no Sistema:');
    console.table(overall.rows);

  } catch (err) {
    console.error('Erro na consulta:', err);
  } finally {
    await pool.end();
  }
}

test();
