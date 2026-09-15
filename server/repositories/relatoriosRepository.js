const { query } = require('../db');

const relatoriosRepository = {
  async getFechamentoCaixa() {
    // 1. Totais Gerais e por Forma de Pagamento
    const totaisRes = await query(`
      SELECT 
        COUNT(*) as total_pedidos,
        COALESCE(SUM(total), 0) as faturamento_total,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'pix' THEN total ELSE 0 END), 0) as total_pix,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'dinheiro' THEN total ELSE 0 END), 0) as total_dinheiro,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'debito' THEN total ELSE 0 END), 0) as total_debito,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'credito' THEN total ELSE 0 END), 0) as total_credito,
        COALESCE(COUNT(CASE WHEN forma_pagamento = 'pix' THEN 1 END), 0) as qtd_pix,
        COALESCE(COUNT(CASE WHEN forma_pagamento = 'dinheiro' THEN 1 END), 0) as qtd_dinheiro,
        COALESCE(COUNT(CASE WHEN forma_pagamento = 'debito' THEN 1 END), 0) as qtd_debito,
        COALESCE(COUNT(CASE WHEN forma_pagamento = 'credito' THEN 1 END), 0) as qtd_credito
      FROM expobai.pedidos
      WHERE status = 'concluido'
    `);

    // 2. Produtos mais vendidos
    const topProdutosRes = await query(`
      SELECT 
        i.nome_produto,
        SUM(i.quantidade) as total_vendido,
        SUM(i.subtotal) as total_faturado
      FROM expobai.pedido_itens i
      JOIN expobai.pedidos p ON i.pedido_id = p.id
      WHERE p.status = 'concluido'
      GROUP BY i.nome_produto
      ORDER BY total_vendido DESC
      LIMIT 8
    `);

    // 3. Vendas recentes
    const ultimosPedidosRes = await query(`
      SELECT id, numero_pedido, codigo_identificador, total, forma_pagamento, troco, data_hora
      FROM expobai.pedidos
      WHERE status = 'concluido'
      ORDER BY id DESC
      LIMIT 15
    `);

    const totais = totaisRes.rows[0];
    const totalPedidos = parseInt(totais.total_pedidos, 10) || 0;
    const faturamentoTotal = parseFloat(totais.faturamento_total) || 0;
    const ticketMedio = totalPedidos > 0 ? (faturamentoTotal / totalPedidos) : 0;

    return {
      total_pedidos: totalPedidos,
      faturamento_total: faturamentoTotal,
      ticket_medio: ticketMedio,
      por_forma_pagamento: {
        pix: { valor: parseFloat(totais.total_pix) || 0, quantidade: parseInt(totais.qtd_pix, 10) || 0 },
        dinheiro: { valor: parseFloat(totais.total_dinheiro) || 0, quantidade: parseInt(totais.qtd_dinheiro, 10) || 0 },
        debito: { valor: parseFloat(totais.total_debito) || 0, quantidade: parseInt(totais.qtd_debito, 10) || 0 },
        credito: { valor: parseFloat(totais.total_credito) || 0, quantidade: parseInt(totais.qtd_credito, 10) || 0 }
      },
      top_produtos: topProdutosRes.rows.map(r => ({
        nome_produto: r.nome_produto,
        total_vendido: parseInt(r.total_vendido, 10),
        total_faturado: parseFloat(r.total_faturado)
      })),
      ultimos_pedidos: ultimosPedidosRes.rows
    };
  }
};

module.exports = relatoriosRepository;
