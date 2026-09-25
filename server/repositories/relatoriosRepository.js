const { query } = require('../db');

const relatoriosRepository = {
  async getFechamentoCaixa({ data_inicio, data_fim, periodo } = {}) {
    let whereConditions = ["p.status = 'concluido'"];
    const params = [];

    // 1. Filtragem por Período / Datas (Timezone oficial Amambai/MS: America/Campo_Grande)
    if (data_inicio && data_fim) {
      params.push(`${data_inicio} 00:00:00`);
      params.push(`${data_fim} 23:59:59.999`);
      whereConditions.push(`(p.data_hora AT TIME ZONE 'America/Campo_Grande') >= $1::timestamp AND (p.data_hora AT TIME ZONE 'America/Campo_Grande') <= $2::timestamp`);
    } else if (data_inicio) {
      params.push(`${data_inicio} 00:00:00`);
      params.push(`${data_inicio} 23:59:59.999`);
      whereConditions.push(`(p.data_hora AT TIME ZONE 'America/Campo_Grande') >= $1::timestamp AND (p.data_hora AT TIME ZONE 'America/Campo_Grande') <= $2::timestamp`);
    } else if (periodo) {
      if (periodo === 'hoje') {
        whereConditions.push("(p.data_hora AT TIME ZONE 'America/Campo_Grande')::date = (NOW() AT TIME ZONE 'America/Campo_Grande')::date");
      } else if (periodo === 'ontem') {
        whereConditions.push("(p.data_hora AT TIME ZONE 'America/Campo_Grande')::date = ((NOW() AT TIME ZONE 'America/Campo_Grande') - INTERVAL '1 day')::date");
      } else if (periodo === '7dias') {
        whereConditions.push("(p.data_hora AT TIME ZONE 'America/Campo_Grande')::date >= ((NOW() AT TIME ZONE 'America/Campo_Grande') - INTERVAL '7 days')::date");
      } else if (periodo === 'mes') {
        whereConditions.push("(p.data_hora AT TIME ZONE 'America/Campo_Grande') >= date_trunc('month', NOW() AT TIME ZONE 'America/Campo_Grande')");
      }
      // 'todos' não inclui restrição de data
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // 1. Totais Gerais e Conciliação por Forma de Pagamento
    const totaisRes = await query(`
      SELECT 
        COUNT(p.id) as total_pedidos,
        COALESCE(SUM(p.total), 0) as faturamento_total,
        COALESCE(SUM(p.troco), 0) as total_troco,
        COALESCE(SUM(CASE WHEN p.forma_pagamento = 'pix' THEN p.total ELSE 0 END), 0) as total_pix,
        COALESCE(SUM(CASE WHEN p.forma_pagamento = 'dinheiro' THEN p.total ELSE 0 END), 0) as total_dinheiro,
        COALESCE(SUM(CASE WHEN p.forma_pagamento = 'debito' THEN p.total ELSE 0 END), 0) as total_debito,
        COALESCE(SUM(CASE WHEN p.forma_pagamento = 'credito' THEN p.total ELSE 0 END), 0) as total_credito,
        COALESCE(COUNT(CASE WHEN p.forma_pagamento = 'pix' THEN 1 END), 0) as qtd_pix,
        COALESCE(COUNT(CASE WHEN p.forma_pagamento = 'dinheiro' THEN 1 END), 0) as qtd_dinheiro,
        COALESCE(COUNT(CASE WHEN p.forma_pagamento = 'debito' THEN 1 END), 0) as qtd_debito,
        COALESCE(COUNT(CASE WHEN p.forma_pagamento = 'credito' THEN 1 END), 0) as qtd_credito
      FROM expobai.pedidos p
      ${whereClause}
    `, params);

    // 2. Total de Itens Vendidos no Período
    const itensTotalRes = await query(`
      SELECT 
        COALESCE(SUM(i.quantidade), 0) as total_itens_vendidos
      FROM expobai.pedido_itens i
      JOIN expobai.pedidos p ON i.pedido_id = p.id
      ${whereClause}
    `, params);

    // 3. Distribuição de Vendas por Hora (Horários de Pico)
    const porHoraRes = await query(`
      SELECT 
        to_char(p.data_hora AT TIME ZONE 'America/Campo_Grande', 'HH24:00') as hora,
        COUNT(p.id) as qtd_pedidos,
        COALESCE(SUM(p.total), 0) as total_faturado
      FROM expobai.pedidos p
      ${whereClause}
      GROUP BY hora
      ORDER BY hora ASC
    `, params);

    // 4. Mix por Categorias
    const categoriasRes = await query(`
      SELECT 
        COALESCE(c.nome, 'Geral') as categoria,
        COALESCE(c.cor, '#2D6A4F') as cor,
        SUM(i.quantidade) as total_itens,
        SUM(i.subtotal) as total_faturado
      FROM expobai.pedido_itens i
      JOIN expobai.pedidos p ON i.pedido_id = p.id
      LEFT JOIN expobai.produtos pr ON i.produto_id = pr.id
      LEFT JOIN expobai.categorias c ON pr.categoria_id = c.id
      ${whereClause}
      GROUP BY c.nome, c.cor
      ORDER BY total_faturado DESC
    `, params);

    // 5. Ranking Completo de Produtos (Curva ABC / Pareto)
    const rankingProdutosRes = await query(`
      SELECT 
        i.nome_produto,
        COALESCE(c.nome, 'Geral') as categoria,
        SUM(i.quantidade) as total_vendido,
        ROUND(AVG(i.preco_unitario), 2) as preco_medio,
        SUM(i.subtotal) as total_faturado
      FROM expobai.pedido_itens i
      JOIN expobai.pedidos p ON i.pedido_id = p.id
      LEFT JOIN expobai.produtos pr ON i.produto_id = pr.id
      LEFT JOIN expobai.categorias c ON pr.categoria_id = c.id
      ${whereClause}
      GROUP BY i.nome_produto, c.nome
      ORDER BY total_faturado DESC
      LIMIT 60
    `, params);

    // 6. Auditoria de Pedidos do Período com Resumo dos Itens (até 200 pedidos)
    const pedidosAuditRes = await query(`
      SELECT 
        p.id, 
        p.numero_pedido, 
        p.codigo_identificador, 
        p.total, 
        p.forma_pagamento, 
        p.troco, 
        p.data_hora,
        COALESCE(string_agg(i.quantidade || 'x ' || i.nome_produto, ', '), 'Itens diversos') as itens_resumo,
        COALESCE(SUM(i.quantidade), 0) as total_itens
      FROM expobai.pedidos p
      LEFT JOIN expobai.pedido_itens i ON i.pedido_id = p.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.id DESC
      LIMIT 200
    `, params);

    const totais = totaisRes.rows[0];
    const totalPedidos = parseInt(totais.total_pedidos, 10) || 0;
    const faturamentoTotal = parseFloat(totais.faturamento_total) || 0;
    const totalTroco = parseFloat(totais.total_troco) || 0;
    const ticketMedio = totalPedidos > 0 ? (faturamentoTotal / totalPedidos) : 0;
    const totalItensVendidos = parseInt(itensTotalRes.rows[0]?.total_itens_vendidos, 10) || 0;
    const mediaItensPorPedido = totalPedidos > 0 ? (totalItensVendidos / totalPedidos) : 0;

    const valPix = parseFloat(totais.total_pix) || 0;
    const valDinheiro = parseFloat(totais.total_dinheiro) || 0;
    const valDebito = parseFloat(totais.total_debito) || 0;
    const valCredito = parseFloat(totais.total_credito) || 0;

    const qtdPix = parseInt(totais.qtd_pix, 10) || 0;
    const qtdDinheiro = parseInt(totais.qtd_dinheiro, 10) || 0;
    const qtdDebito = parseInt(totais.qtd_debito, 10) || 0;
    const qtdCredito = parseInt(totais.qtd_credito, 10) || 0;

    const calcPct = (val) => faturamentoTotal > 0 ? Math.round((val / faturamentoTotal) * 1000) / 10 : 0;

    return {
      filtro: {
        periodo: periodo || (data_inicio ? 'personalizado' : 'todos'),
        data_inicio: data_inicio || null,
        data_fim: data_fim || null
      },
      indicadores: {
        total_pedidos: totalPedidos,
        faturamento_total: faturamentoTotal,
        ticket_medio: ticketMedio,
        total_itens_vendidos: totalItensVendidos,
        media_itens_por_pedido: mediaItensPorPedido,
        total_troco_entregue: totalTroco,
        faturamento_a_vista: valPix + valDinheiro,
        faturamento_cartao: valDebito + valCredito,
        pct_a_vista: calcPct(valPix + valDinheiro),
        pct_cartao: calcPct(valDebito + valCredito)
      },
      // Retrocompatibilidade
      total_pedidos: totalPedidos,
      faturamento_total: faturamentoTotal,
      ticket_medio: ticketMedio,
      por_forma_pagamento: {
        pix: { 
          valor: valPix, 
          quantidade: qtdPix,
          pct_valor: calcPct(valPix),
          pct_pedidos: totalPedidos > 0 ? Math.round((qtdPix / totalPedidos) * 1000) / 10 : 0
        },
        dinheiro: { 
          valor: valDinheiro, 
          quantidade: qtdDinheiro,
          pct_valor: calcPct(valDinheiro),
          pct_pedidos: totalPedidos > 0 ? Math.round((qtdDinheiro / totalPedidos) * 1000) / 10 : 0
        },
        debito: { 
          valor: valDebito, 
          quantidade: qtdDebito,
          pct_valor: calcPct(valDebito),
          pct_pedidos: totalPedidos > 0 ? Math.round((qtdDebito / totalPedidos) * 1000) / 10 : 0
        },
        credito: { 
          valor: valCredito, 
          quantidade: qtdCredito,
          pct_valor: calcPct(valCredito),
          pct_pedidos: totalPedidos > 0 ? Math.round((qtdCredito / totalPedidos) * 1000) / 10 : 0
        }
      },
      vendas_por_hora: porHoraRes.rows.map(r => ({
        hora: r.hora,
        qtd_pedidos: parseInt(r.qtd_pedidos, 10),
        total_faturado: parseFloat(r.total_faturado),
        pct: calcPct(parseFloat(r.total_faturado))
      })),
      categorias: categoriasRes.rows.map(r => ({
        categoria: r.categoria,
        cor: r.cor,
        total_itens: parseInt(r.total_itens, 10),
        total_faturado: parseFloat(r.total_faturado),
        pct: calcPct(parseFloat(r.total_faturado))
      })),
      ranking_produtos: rankingProdutosRes.rows.map((r, index) => ({
        posicao: index + 1,
        nome_produto: r.nome_produto,
        categoria: r.categoria,
        total_vendido: parseInt(r.total_vendido, 10),
        preco_medio: parseFloat(r.preco_medio),
        total_faturado: parseFloat(r.total_faturado),
        pct_share: calcPct(parseFloat(r.total_faturado))
      })),
      top_produtos: rankingProdutosRes.rows.slice(0, 10).map(r => ({
        nome_produto: r.nome_produto,
        total_vendido: parseInt(r.total_vendido, 10),
        total_faturado: parseFloat(r.total_faturado)
      })),
      ultimos_pedidos: pedidosAuditRes.rows
    };
  }
};

module.exports = relatoriosRepository;
