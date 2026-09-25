const { query } = require('../db');

const relatoriosRepository = {
  async getFechamentoCaixa({ data_inicio, data_fim, periodo } = {}) {
    let whereConditions = ["status = 'concluido'"];
    const params = [];

    // 1. Filtragem por Período / Datas
    if (data_inicio && data_fim) {
      params.push(`${data_inicio} 00:00:00`);
      params.push(`${data_fim} 23:59:59.999`);
      whereConditions.push(`(data_hora AT TIME ZONE 'America/Campo_Grande') >= $1::timestamp AND (data_hora AT TIME ZONE 'America/Campo_Grande') <= $2::timestamp`);
    } else if (data_inicio) {
      params.push(`${data_inicio} 00:00:00`);
      params.push(`${data_inicio} 23:59:59.999`);
      whereConditions.push(`(data_hora AT TIME ZONE 'America/Campo_Grande') >= $1::timestamp AND (data_hora AT TIME ZONE 'America/Campo_Grande') <= $2::timestamp`);
    } else if (periodo) {
      if (periodo === 'hoje') {
        whereConditions.push("(data_hora AT TIME ZONE 'America/Campo_Grande')::date = (NOW() AT TIME ZONE 'America/Campo_Grande')::date");
      } else if (periodo === 'ontem') {
        whereConditions.push("(data_hora AT TIME ZONE 'America/Campo_Grande')::date = ((NOW() AT TIME ZONE 'America/Campo_Grande') - INTERVAL '1 day')::date");
      } else if (periodo === '7dias') {
        whereConditions.push("(data_hora AT TIME ZONE 'America/Campo_Grande')::date >= ((NOW() AT TIME ZONE 'America/Campo_Grande') - INTERVAL '7 days')::date");
      } else if (periodo === 'mes') {
        whereConditions.push("(data_hora AT TIME ZONE 'America/Campo_Grande') >= date_trunc('month', NOW() AT TIME ZONE 'America/Campo_Grande')");
      }
      // 'todos' não inclui restrição de data
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

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
      ${whereClause}
    `, params);

    // 2. Produtos mais vendidos
    const whereClauseItens = whereClause.replace(/data_hora/g, 'p.data_hora').replace(/status/g, 'p.status');
    const topProdutosRes = await query(`
      SELECT 
        i.nome_produto,
        SUM(i.quantidade) as total_vendido,
        SUM(i.subtotal) as total_faturado
      FROM expobai.pedido_itens i
      JOIN expobai.pedidos p ON i.pedido_id = p.id
      ${whereClauseItens}
      GROUP BY i.nome_produto
      ORDER BY total_vendido DESC
      LIMIT 10
    `, params);

    // 3. Vendas do período (até 150)
    const ultimosPedidosRes = await query(`
      SELECT id, numero_pedido, codigo_identificador, total, forma_pagamento, troco, data_hora
      FROM expobai.pedidos
      ${whereClause}
      ORDER BY id DESC
      LIMIT 150
    `, params);

    const totais = totaisRes.rows[0];
    const totalPedidos = parseInt(totais.total_pedidos, 10) || 0;
    const faturamentoTotal = parseFloat(totais.faturamento_total) || 0;
    const ticketMedio = totalPedidos > 0 ? (faturamentoTotal / totalPedidos) : 0;

    return {
      filtro: {
        periodo: periodo || (data_inicio ? 'personalizado' : 'todos'),
        data_inicio: data_inicio || null,
        data_fim: data_fim || null
      },
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
