const { query } = require('../db');

const relatoriosRepository = {
  async getFechamentoCaixa({ data_inicio, data_fim, periodo, sessao_id } = {}) {
    let whereConditions = ["p.status = 'concluido'"];
    const params = [];

    // 1. Filtragem por Sessão de Caixa específica
    if (sessao_id) {
      const sessRes = await query('SELECT * FROM expobai.sessoes_caixa WHERE id = $1', [sessao_id]);
      if (sessRes.rows.length > 0) {
        const sessao = sessRes.rows[0];
        params.push(sessao.aberto_em);
        whereConditions.push(`p.data_hora >= $${params.length}`);
        if (sessao.fechado_em) {
          params.push(sessao.fechado_em);
          whereConditions.push(`p.data_hora <= $${params.length}`);
        }
      }
    }
    // 2. Filtragem por Período / Datas (Timezone oficial Amambai/MS: America/Campo_Grande)
    else if (data_inicio && data_fim) {
      if (data_inicio.includes(':') || data_fim.includes(':')) {
        const start = data_inicio.includes(':') ? data_inicio.replace('T', ' ') : `${data_inicio} 00:00:00`;
        const end = data_fim.includes(':') ? data_fim.replace('T', ' ') : `${data_fim} 23:59:59.999`;
        params.push(start);
        params.push(end);
        whereConditions.push(`(p.data_hora AT TIME ZONE 'America/Campo_Grande') >= $${params.length - 1}::timestamp AND (p.data_hora AT TIME ZONE 'America/Campo_Grande') <= $${params.length}::timestamp`);
      } else {
        // Agrupamento por dia de evento (inclui vendas da noite e madrugada até 06h00)
        params.push(data_inicio);
        params.push(data_fim);
        whereConditions.push(`((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date >= $${params.length - 1}::date AND ((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date <= $${params.length}::date`);
      }
    } else if (data_inicio) {
      if (data_inicio.includes(':')) {
        params.push(data_inicio.replace('T', ' '));
        whereConditions.push(`(p.data_hora AT TIME ZONE 'America/Campo_Grande') >= $${params.length}::timestamp`);
      } else {
        params.push(data_inicio);
        whereConditions.push(`((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date = $${params.length}::date`);
      }
    } else if (periodo) {
      if (periodo === 'hoje') {
        // Agrupa as vendas da noite e madrugada atual sem quebrar à meia-noite (corte às 06h00)
        whereConditions.push("((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date = ((NOW() AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date");
      } else if (periodo === 'ontem') {
        whereConditions.push("((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date = (((NOW() AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours') - INTERVAL '1 day')::date");
      } else if (periodo === '7dias') {
        whereConditions.push("((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date >= (((NOW() AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours') - INTERVAL '7 days')::date");
      } else if (periodo === 'mes') {
        whereConditions.push("(p.data_hora AT TIME ZONE 'America/Campo_Grande') >= date_trunc('month', NOW() AT TIME ZONE 'America/Campo_Grande')");
      }
      // 'todos' não inclui restrição de data
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // 1. Totais Gerais e Conciliação por Forma de Pagamento (suporta pagamento único e misto)
    const totaisRes = await query(`
      SELECT 
        COUNT(p.id) as total_pedidos,
        COALESCE(SUM(p.total), 0) as faturamento_total,
        COALESCE(SUM(p.troco), 0) as total_troco,
        COALESCE(SUM(
          CASE 
            WHEN p.pagamentos IS NOT NULL AND jsonb_typeof(p.pagamentos) = 'array'
            THEN COALESCE((SELECT SUM((elem->>'valor')::numeric) FROM jsonb_array_elements(p.pagamentos) elem WHERE elem->>'forma' = 'pix'), 0)
            WHEN p.forma_pagamento = 'pix' THEN p.total
            ELSE 0
          END
        ), 0) as total_pix,
        COALESCE(SUM(
          CASE 
            WHEN p.pagamentos IS NOT NULL AND jsonb_typeof(p.pagamentos) = 'array'
            THEN COALESCE((SELECT SUM((elem->>'valor')::numeric) FROM jsonb_array_elements(p.pagamentos) elem WHERE elem->>'forma' = 'dinheiro'), 0)
            WHEN p.forma_pagamento = 'dinheiro' THEN p.total
            ELSE 0
          END
        ), 0) as total_dinheiro,
        COALESCE(SUM(
          CASE 
            WHEN p.pagamentos IS NOT NULL AND jsonb_typeof(p.pagamentos) = 'array'
            THEN COALESCE((SELECT SUM((elem->>'valor')::numeric) FROM jsonb_array_elements(p.pagamentos) elem WHERE elem->>'forma' = 'debito'), 0)
            WHEN p.forma_pagamento = 'debito' THEN p.total
            ELSE 0
          END
        ), 0) as total_debito,
        COALESCE(SUM(
          CASE 
            WHEN p.pagamentos IS NOT NULL AND jsonb_typeof(p.pagamentos) = 'array'
            THEN COALESCE((SELECT SUM((elem->>'valor')::numeric) FROM jsonb_array_elements(p.pagamentos) elem WHERE elem->>'forma' = 'credito'), 0)
            WHEN p.forma_pagamento = 'credito' THEN p.total
            ELSE 0
          END
        ), 0) as total_credito,
        COALESCE(COUNT(CASE WHEN p.forma_pagamento = 'pix' OR (p.pagamentos IS NOT NULL AND p.pagamentos::text LIKE '%"pix"%') THEN 1 END), 0) as qtd_pix,
        COALESCE(COUNT(CASE WHEN p.forma_pagamento = 'dinheiro' OR (p.pagamentos IS NOT NULL AND p.pagamentos::text LIKE '%"dinheiro"%') THEN 1 END), 0) as qtd_dinheiro,
        COALESCE(COUNT(CASE WHEN p.forma_pagamento = 'debito' OR (p.pagamentos IS NOT NULL AND p.pagamentos::text LIKE '%"debito"%') THEN 1 END), 0) as qtd_debito,
        COALESCE(COUNT(CASE WHEN p.forma_pagamento = 'credito' OR (p.pagamentos IS NOT NULL AND p.pagamentos::text LIKE '%"credito"%') THEN 1 END), 0) as qtd_credito
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

    // 4. Mix por Categorias com Custos e Lucro Bruto
    const categoriasRes = await query(`
      SELECT 
        COALESCE(c.id, 0) as categoria_id,
        COALESCE(c.nome, 'Geral') as categoria,
        COALESCE(c.cor, '#2D6A4F') as cor,
        SUM(i.quantidade) as total_itens,
        SUM(i.subtotal) as total_faturado,
        SUM(i.quantidade * COALESCE(pr.preco_custo, NULLIF(i.preco_custo, 0), 0)) as custo_total,
        SUM(i.subtotal) - SUM(i.quantidade * COALESCE(pr.preco_custo, NULLIF(i.preco_custo, 0), 0)) as lucro_bruto
      FROM expobai.pedido_itens i
      JOIN expobai.pedidos p ON i.pedido_id = p.id
      LEFT JOIN expobai.produtos pr ON i.produto_id = pr.id
      LEFT JOIN expobai.categorias c ON pr.categoria_id = c.id
      ${whereClause}
      GROUP BY c.id, c.nome, c.cor
      ORDER BY total_faturado DESC
    `, params);

    // 5. Ranking Completo de Produtos (Curva ABC / Lucro e Margem com Custo Fixo de Produto)
    const rankingProdutosRes = await query(`
      SELECT 
        i.nome_produto,
        COALESCE(c.nome, 'Geral') as categoria,
        SUM(i.quantidade) as total_vendido,
        ROUND(AVG(i.preco_unitario), 2) as preco_medio,
        COALESCE(pr.preco_custo, NULLIF(i.preco_custo, 0), 0) as preco_custo,
        SUM(i.subtotal) as total_faturado,
        SUM(i.quantidade * COALESCE(pr.preco_custo, NULLIF(i.preco_custo, 0), 0)) as custo_total,
        SUM(i.subtotal) - SUM(i.quantidade * COALESCE(pr.preco_custo, NULLIF(i.preco_custo, 0), 0)) as lucro_bruto
      FROM expobai.pedido_itens i
      JOIN expobai.pedidos p ON i.pedido_id = p.id
      LEFT JOIN expobai.produtos pr ON i.produto_id = pr.id
      LEFT JOIN expobai.categorias c ON pr.categoria_id = c.id
      ${whereClause}
      GROUP BY i.nome_produto, c.nome, pr.preco_custo, i.preco_custo
      ORDER BY total_faturado DESC
      LIMIT 100
    `, params);

    // 6. Auditoria de Pedidos do Período com Resumo dos Itens, Pagamentos e Edição
    const pedidosAuditRes = await query(`
      SELECT 
        p.id, 
        p.numero_pedido, 
        p.codigo_identificador, 
        p.total, 
        p.forma_pagamento, 
        p.valor_pago,
        p.troco, 
        p.status,
        p.observacoes,
        p.pagamentos,
        p.editado,
        p.editado_em,
        to_char(p.editado_em AT TIME ZONE 'America/Campo_Grande', 'DD/MM/YYYY HH24:MI') as editado_em_ms,
        p.motivo_edicao,
        p.data_hora,
        to_char(p.data_hora AT TIME ZONE 'America/Campo_Grande', 'DD/MM/YYYY HH24:MI:SS') as data_hora_ms,
        to_char(p.data_hora AT TIME ZONE 'America/Campo_Grande', 'HH24:MI:SS') as hora_ms,
        COALESCE(string_agg(i.quantidade || 'x ' || i.nome_produto, ', '), 'Itens diversos') as itens_resumo,
        COALESCE(SUM(i.quantidade), 0) as total_itens,
        COALESCE(json_agg(
          json_build_object(
            'id', i.id,
            'produto_id', i.produto_id,
            'nome_produto', i.nome_produto,
            'quantidade', i.quantidade,
            'preco_unitario', i.preco_unitario,
            'subtotal', i.subtotal
          )
        ) FILTER (WHERE i.id IS NOT NULL), '[]') as itens_detalhes
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

    let custoTotalProdutos = 0;
    let lucroBrutoTotal = 0;

    const rankingProdutos = rankingProdutosRes.rows.map((r, index) => {
      const faturado = parseFloat(r.total_faturado) || 0;
      const custo = parseFloat(r.custo_total) || 0;
      const lucro = parseFloat(r.lucro_bruto) || (faturado - custo);
      const margem = faturado > 0 ? Math.round(((lucro / faturado) * 100) * 10) / 10 : 0;
      const totalVendido = parseInt(r.total_vendido, 10) || 0;

      custoTotalProdutos += custo;
      lucroBrutoTotal += lucro;

      return {
        posicao: index + 1,
        nome_produto: r.nome_produto,
        categoria: r.categoria,
        total_vendido: totalVendido,
        preco_medio: parseFloat(r.preco_medio) || 0,
        preco_custo: parseFloat(r.preco_custo) || 0,
        custo_total: custo,
        lucro_bruto: lucro,
        margem_lucro_pct: margem,
        total_faturado: faturado,
        pct_share: calcPct(faturado),
        pct_share_qtd: totalItensVendidos > 0 ? Math.round(((totalVendido / totalItensVendidos) * 100) * 10) / 10 : 0
      };
    });

    const margemMediaPct = faturamentoTotal > 0 ? Math.round(((lucroBrutoTotal / faturamentoTotal) * 100) * 10) / 10 : 0;

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
        custo_total_produtos: custoTotalProdutos,
        lucro_bruto_total: lucroBrutoTotal,
        margem_lucro_media_pct: margemMediaPct,
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
      categorias: categoriasRes.rows.map(r => {
        const faturado = parseFloat(r.total_faturado) || 0;
        const custo = parseFloat(r.custo_total) || 0;
        const lucro = parseFloat(r.lucro_bruto) || (faturado - custo);
        const margem = faturado > 0 ? Math.round(((lucro / faturado) * 100) * 10) / 10 : 0;
        return {
          categoria_id: r.categoria_id,
          categoria: r.categoria,
          cor: r.cor,
          total_itens: parseInt(r.total_itens, 10) || 0,
          total_faturado: faturado,
          custo_total: custo,
          lucro_bruto: lucro,
          margem_lucro_pct: margem,
          pct: calcPct(faturado)
        };
      }),
      ranking_produtos: rankingProdutos,
      top_produtos: rankingProdutos.slice(0, 10).map(r => ({
        nome_produto: r.nome_produto,
        total_vendido: r.total_vendido,
        total_faturado: r.total_faturado
      })),
      ultimos_pedidos: pedidosAuditRes.rows
    };
  },

  // 7. Relatório Detalhado de Todos os Lançamentos por Tipo de Pagamento (Conferência Bancária e Maquininha)
  async getLancamentosPorPagamento({ forma_pagamento, data_inicio, data_fim, periodo, sessao_id } = {}) {
    let whereConditions = ["p.status = 'concluido'"];
    const params = [];

    // 1. Filtragem por Sessão de Caixa específica
    if (sessao_id) {
      const sessRes = await query('SELECT * FROM expobai.sessoes_caixa WHERE id = $1', [sessao_id]);
      if (sessRes.rows.length > 0) {
        const sessao = sessRes.rows[0];
        params.push(sessao.aberto_em);
        whereConditions.push(`p.data_hora >= $${params.length}`);
        if (sessao.fechado_em) {
          params.push(sessao.fechado_em);
          whereConditions.push(`p.data_hora <= $${params.length}`);
        }
      }
    }
    // 2. Filtragem por Período / Datas (Timezone oficial Amambai/MS: America/Campo_Grande)
    else if (data_inicio && data_fim) {
      if (data_inicio.includes(':') || data_fim.includes(':')) {
        const start = data_inicio.includes(':') ? data_inicio.replace('T', ' ') : `${data_inicio} 00:00:00`;
        const end = data_fim.includes(':') ? data_fim.replace('T', ' ') : `${data_fim} 23:59:59.999`;
        params.push(start);
        params.push(end);
        whereConditions.push(`(p.data_hora AT TIME ZONE 'America/Campo_Grande') >= $${params.length - 1}::timestamp AND (p.data_hora AT TIME ZONE 'America/Campo_Grande') <= $${params.length}::timestamp`);
      } else {
        params.push(data_inicio);
        params.push(data_fim);
        whereConditions.push(`((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date >= $${params.length - 1}::date AND ((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date <= $${params.length}::date`);
      }
    } else if (data_inicio) {
      if (data_inicio.includes(':')) {
        params.push(data_inicio.replace('T', ' '));
        whereConditions.push(`(p.data_hora AT TIME ZONE 'America/Campo_Grande') >= $${params.length}::timestamp`);
      } else {
        params.push(data_inicio);
        whereConditions.push(`((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date = $${params.length}::date`);
      }
    } else if (periodo) {
      if (periodo === 'hoje') {
        whereConditions.push("((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date = ((NOW() AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date");
      } else if (periodo === 'ontem') {
        whereConditions.push("((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date = (((NOW() AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours') - INTERVAL '1 day')::date");
      } else if (periodo === '7dias') {
        whereConditions.push("((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date >= (((NOW() AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours') - INTERVAL '7 days')::date");
      } else if (periodo === 'mes') {
        whereConditions.push("(p.data_hora AT TIME ZONE 'America/Campo_Grande') >= date_trunc('month', NOW() AT TIME ZONE 'America/Campo_Grande')");
      }
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Buscar todos os pedidos do período selecionado
    const sql = `
      SELECT 
        p.id, 
        p.numero_pedido, 
        p.codigo_identificador, 
        p.total, 
        p.forma_pagamento, 
        p.valor_pago,
        p.troco, 
        p.status,
        p.observacoes,
        p.pagamentos,
        p.editado,
        p.editado_em,
        to_char(p.editado_em AT TIME ZONE 'America/Campo_Grande', 'DD/MM/YYYY HH24:MI') as editado_em_ms,
        p.motivo_edicao,
        p.data_hora,
        to_char(p.data_hora AT TIME ZONE 'America/Campo_Grande', 'DD/MM/YYYY HH24:MI:SS') as data_hora_ms,
        to_char(p.data_hora AT TIME ZONE 'America/Campo_Grande', 'HH24:MI:SS') as hora_ms,
        to_char(p.data_hora AT TIME ZONE 'America/Campo_Grande', 'DD/MM/YYYY') as data_ms,
        COALESCE(string_agg(i.quantidade || 'x ' || i.nome_produto, ', '), 'Itens diversos') as itens_resumo,
        COALESCE(SUM(i.quantidade), 0) as total_itens,
        COALESCE(json_agg(
          json_build_object(
            'id', i.id,
            'produto_id', i.produto_id,
            'nome_produto', i.nome_produto,
            'quantidade', i.quantidade,
            'preco_unitario', i.preco_unitario,
            'subtotal', i.subtotal,
            'socio', pr.socio
          )
        ) FILTER (WHERE i.id IS NOT NULL), '[]') as itens_detalhes
      FROM expobai.pedidos p
      LEFT JOIN expobai.pedido_itens i ON i.pedido_id = p.id
      LEFT JOIN expobai.produtos pr ON i.produto_id = pr.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.data_hora DESC, p.id DESC
    `;

    const res = await query(sql, params);
    const target = forma_pagamento ? forma_pagamento.toLowerCase().trim() : 'todos';

    let totalGeralPedidos = 0;
    let faturamentoTotal = 0;
    let totalPix = 0;
    let qtdPix = 0;
    let totalDebito = 0;
    let qtdDebito = 0;
    let totalCredito = 0;
    let qtdCredito = 0;
    let totalDinheiro = 0;
    let qtdDinheiro = 0;

    const lancamentos = [];

    res.rows.forEach(p => {
      totalGeralPedidos++;
      const total = parseFloat(p.total) || 0;
      faturamentoTotal += total;

      // Calcular montantes por forma neste pedido
      let pixVal = 0;
      let debitoVal = 0;
      let creditoVal = 0;
      let dinheiroVal = 0;

      if (p.pagamentos && Array.isArray(p.pagamentos) && p.pagamentos.length > 0) {
        p.pagamentos.forEach(pg => {
          const v = parseFloat(pg.valor) || 0;
          const forma = (pg.forma || '').toLowerCase();
          if (forma === 'pix') pixVal += v;
          else if (forma === 'debito') debitoVal += v;
          else if (forma === 'credito') creditoVal += v;
          else if (forma === 'dinheiro') dinheiroVal += v;
        });
      } else {
        const forma = (p.forma_pagamento || '').toLowerCase();
        if (forma === 'pix') pixVal = total;
        else if (forma === 'debito') debitoVal = total;
        else if (forma === 'credito') creditoVal = total;
        else if (forma === 'dinheiro') dinheiroVal = total;
      }

      if (pixVal > 0) { totalPix += pixVal; qtdPix++; }
      if (debitoVal > 0) { totalDebito += debitoVal; qtdDebito++; }
      if (creditoVal > 0) { totalCredito += creditoVal; qtdCredito++; }
      if (dinheiroVal > 0) { totalDinheiro += dinheiroVal; qtdDinheiro++; }

      // Verificar se este pedido entra no filtro do método
      let match = false;
      let valorEfetivo = total;

      if (target === 'todos') {
        match = true;
        valorEfetivo = total;
      } else if (target === 'pix' && pixVal > 0) {
        match = true;
        valorEfetivo = pixVal;
      } else if (target === 'debito' && debitoVal > 0) {
        match = true;
        valorEfetivo = debitoVal;
      } else if (target === 'credito' && creditoVal > 0) {
        match = true;
        valorEfetivo = creditoVal;
      } else if (target === 'cartao' && (debitoVal + creditoVal) > 0) {
        match = true;
        valorEfetivo = debitoVal + creditoVal;
      } else if (target === 'dinheiro' && dinheiroVal > 0) {
        match = true;
        valorEfetivo = dinheiroVal;
      }

      if (match) {
        // Calcular sócios envolvidos nos itens
        let alexSub = 0;
        let heitorSub = 0;
        let paisSub = 0;
        if (Array.isArray(p.itens_detalhes)) {
          p.itens_detalhes.forEach(it => {
            const sub = parseFloat(it.subtotal) || 0;
            const socio = (it.socio || '').toLowerCase();
            if (socio === 'alex') alexSub += sub;
            else if (socio === 'heitor') heitorSub += sub;
            else if (socio === 'pais') paisSub += sub;
            else {
              const n = (it.nome_produto || '').toLowerCase();
              if (n.includes('cookie')) paisSub += sub;
              else if (n.includes('espet')) alexSub += sub;
              else heitorSub += sub;
            }
          });
        }

        const sociosParts = [];
        if (alexSub > 0) sociosParts.push(`Alex: R$ ${alexSub.toFixed(2).replace('.', ',')}`);
        if (heitorSub > 0) sociosParts.push(`Heitor: R$ ${heitorSub.toFixed(2).replace('.', ',')}`);
        if (paisSub > 0) sociosParts.push(`Pais: R$ ${paisSub.toFixed(2).replace('.', ',')}`);

        lancamentos.push({
          ...p,
          total: total,
          valor_efetivo: valorEfetivo,
          valor_pix: pixVal,
          valor_debito: debitoVal,
          valor_credito: creditoVal,
          valor_dinheiro: dinheiroVal,
          is_misto: p.forma_pagamento === 'misto' || (p.pagamentos && p.pagamentos.length > 1),
          socios_resumo: sociosParts.join(' | ') || 'Geral'
        });
      }
    });

    const valorFiltrado = lancamentos.reduce((acc, l) => acc + l.valor_efetivo, 0);
    const qtdFiltrado = lancamentos.length;
    const ticketMedioFiltrado = qtdFiltrado > 0 ? (valorFiltrado / qtdFiltrado) : 0;

    let contaDestino = {
      tipo: target,
      titulo: 'Todos os Métodos',
      responsavel: 'Visão Geral Consolidada',
      descricao: 'Visão unificada de todos os recebimentos realizados no caixa.'
    };

    if (target === 'pix') {
      contaDestino = {
        tipo: 'pix',
        titulo: '📱 PIX (QR Code / Celular)',
        responsavel: 'Conta Bancária dos Pais',
        descricao: 'Valores caíram na conta dos pais via Pix. Valide comparando item a item com o extrato bancário (Nubank/Banco do Brasil).'
      };
    } else if (target === 'debito') {
      contaDestino = {
        tipo: 'debito',
        titulo: '💳 Cartão de Débito',
        responsavel: 'Maquininha de Cartão do Alex',
        descricao: 'Valores passados no débito na maquininha do Alex. Valide comparando com o extrato/relatório diário da maquininha.'
      };
    } else if (target === 'credito') {
      contaDestino = {
        tipo: 'credito',
        titulo: '💳 Cartão de Crédito',
        responsavel: 'Maquininha de Cartão do Alex',
        descricao: 'Valores passados no crédito na maquininha do Alex. Valide comparando com o fechamento de lote da maquininha.'
      };
    } else if (target === 'cartao') {
      contaDestino = {
        tipo: 'cartao',
        titulo: '💳 Cartões (Débito + Crédito)',
        responsavel: 'Maquininha de Cartão do Alex',
        descricao: 'Total recebido na maquininha de cartão do Alex (Débito + Crédito).'
      };
    } else if (target === 'dinheiro') {
      contaDestino = {
        tipo: 'dinheiro',
        titulo: '💵 Dinheiro em Espécie',
        responsavel: 'Gaveta Física do Caixa',
        descricao: 'Valores recebidos em cédulas/moedas. Valide com a contagem física do dinheiro no caixa.'
      };
    }

    return {
      filtro: {
        forma_pagamento: target,
        periodo: periodo || (data_inicio ? 'personalizado' : 'todos'),
        data_inicio: data_inicio || null,
        data_fim: data_fim || null,
        sessao_id: sessao_id || null
      },
      conta_destino: contaDestino,
      metricas: {
        valor_filtrado: valorFiltrado,
        qtd_filtrado: qtdFiltrado,
        ticket_medio_filtrado: ticketMedioFiltrado,
        faturamento_total: faturamentoTotal,
        total_pedidos: totalGeralPedidos,
        total_pix: totalPix,
        qtd_pix: qtdPix,
        total_debito: totalDebito,
        qtd_debito: qtdDebito,
        total_credito: totalCredito,
        qtd_credito: qtdCredito,
        total_cartao: totalDebito + totalCredito,
        qtd_cartao: qtdDebito + qtdCredito,
        total_dinheiro: totalDinheiro,
        qtd_dinheiro: qtdDinheiro
      },
      lancamentos
    };
  },

  // 3. Comparativo de Produtos Vendidos por Hora x Dias da Exposição
  async getComparativoHorarios({ produto_id, origem } = {}) {
    const filterProd = produto_id && produto_id !== 'todos' ? String(produto_id) : null;
    const filterOrigem = origem && origem !== 'todos' ? String(origem).toLowerCase() : null;

    // 1. Obter os dias do evento
    const diasRes = await query(`
      SELECT 
        ((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date as data,
        EXTRACT(DOW FROM ((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date)::int as dow,
        COUNT(DISTINCT p.id) as total_pedidos,
        COALESCE(SUM(p.total), 0) as faturamento
      FROM expobai.pedidos p
      WHERE p.status = 'concluido'
      GROUP BY data, dow
      ORDER BY data ASC
    `);

    const nomeDias = {
      0: { extenso: 'Domingo', abrev: 'Dom' },
      1: { extenso: 'Segunda-feira', abrev: 'Seg' },
      2: { extenso: 'Terça-feira', abrev: 'Ter' },
      3: { extenso: 'Quarta-feira', abrev: 'Qua' },
      4: { extenso: 'Quinta-feira', abrev: 'Qui' },
      5: { extenso: 'Sexta-feira', abrev: 'Sex' },
      6: { extenso: 'Sábado', abrev: 'Sáb' }
    };

    const dias = diasRes.rows.map(r => {
      const dStr = r.data instanceof Date ? r.data.toISOString().split('T')[0] : String(r.data);
      const diaInfo = nomeDias[r.dow] || { extenso: 'Dia', abrev: 'Dia' };
      const [ano, mes, dia] = dStr.split('-');
      return {
        data: dStr,
        dia_semana: diaInfo.extenso,
        dia_abrev: diaInfo.abrev,
        label: `${diaInfo.abrev} (${dia}/${mes})`,
        total_pedidos: parseInt(r.total_pedidos, 10),
        faturamento: parseFloat(r.faturamento)
      };
    });

    // 2. Lista de Produtos para o Dropdown (ordenados por volume de venda)
    const prodsRes = await query(`
      SELECT 
        COALESCE(i.produto_id::text, i.nome_produto) as id,
        i.nome_produto as nome,
        SUM(i.quantidade) as qtd_total,
        SUM(i.subtotal) as faturamento_total
      FROM expobai.pedidos p
      JOIN expobai.pedido_itens i ON i.pedido_id = p.id
      WHERE p.status = 'concluido'
      GROUP BY COALESCE(i.produto_id::text, i.nome_produto), i.nome_produto
      ORDER BY qtd_total DESC
    `);

    const produtos = prodsRes.rows.map(r => ({
      id: r.id,
      nome: r.nome,
      qtd_total: parseInt(r.qtd_total, 10),
      faturamento_total: parseFloat(r.faturamento_total)
    }));

    // 3. Matriz Hora x Dia com filtro opcional de produto e origem
    const matrizParams = [filterProd, filterOrigem];
    const matrizRes = await query(`
      SELECT 
        ((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date as dia_evento,
        EXTRACT(HOUR FROM (p.data_hora AT TIME ZONE 'America/Campo_Grande'))::int as hora,
        COUNT(DISTINCT p.id) as qtd_pedidos,
        COALESCE(SUM(i.quantidade), 0) as qtd_itens,
        COALESCE(SUM(i.subtotal), 0) as faturamento
      FROM expobai.pedidos p
      JOIN expobai.pedido_itens i ON i.pedido_id = p.id
      WHERE p.status = 'concluido'
        AND ($1::text IS NULL OR i.produto_id::text = $1 OR i.nome_produto = $1)
        AND ($2::text IS NULL OR p.origem = $2)
      GROUP BY dia_evento, hora
      ORDER BY dia_evento, hora
    `, matrizParams);

    // 4. Top 3 produtos mais vendidos por hora e dia
    const topItensRes = await query(`
      WITH RankedItens AS (
        SELECT 
          ((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date as dia_evento,
          EXTRACT(HOUR FROM (p.data_hora AT TIME ZONE 'America/Campo_Grande'))::int as hora,
          i.nome_produto,
          SUM(i.quantidade) as qtd,
          SUM(i.subtotal) as subtotal,
          ROW_NUMBER() OVER(
            PARTITION BY ((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date, 
                         EXTRACT(HOUR FROM (p.data_hora AT TIME ZONE 'America/Campo_Grande'))::int 
            ORDER BY SUM(i.quantidade) DESC
          ) as rnk
        FROM expobai.pedidos p
        JOIN expobai.pedido_itens i ON i.pedido_id = p.id
        WHERE p.status = 'concluido'
          AND ($1::text IS NULL OR p.origem = $1)
        GROUP BY dia_evento, hora, i.nome_produto
      )
      SELECT dia_evento, hora, rnk, nome_produto, qtd, subtotal
      FROM RankedItens
      WHERE rnk <= 3
      ORDER BY dia_evento, hora, rnk
    `, [filterOrigem]);

    const topMap = {};
    topItensRes.rows.forEach(r => {
      const dStr = r.dia_evento instanceof Date ? r.dia_evento.toISOString().split('T')[0] : String(r.dia_evento);
      const key = `${dStr}_${r.hora}`;
      if (!topMap[key]) topMap[key] = [];
      topMap[key].push({
        nome: r.nome_produto,
        qtd: parseInt(r.qtd, 10),
        subtotal: parseFloat(r.subtotal)
      });
    });

    // 5. Organizar as horas operacionais (Ciclo Noturno: 16h às 04h)
    const cicloHoras = [16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4];
    
    // Mapear dados para a matriz
    const gridMap = {};
    matrizRes.rows.forEach(r => {
      const dStr = r.dia_evento instanceof Date ? r.dia_evento.toISOString().split('T')[0] : String(r.dia_evento);
      const h = parseInt(r.hora, 10);
      const key = `${dStr}_${h}`;
      gridMap[key] = {
        qtd_pedidos: parseInt(r.qtd_pedidos, 10),
        qtd_itens: parseInt(r.qtd_itens, 10),
        faturamento: parseFloat(r.faturamento)
      };
    });

    // Estruturar matriz final por hora
    const matrizHoras = cicloHoras.map(hora => {
      const horaStr = `${String(hora).padStart(2, '0')}:00`;
      let totalPedidosHora = 0;
      let totalItensHora = 0;
      let totalFaturamentoHora = 0;
      const valoresPorDia = {};

      dias.forEach(d => {
        const cell = gridMap[`${d.data}_${hora}`] || { qtd_pedidos: 0, qtd_itens: 0, faturamento: 0 };
        const topProds = topMap[`${d.data}_${hora}`] || [];
        valoresPorDia[d.data] = {
          ...cell,
          top_produtos: topProds
        };
        totalPedidosHora += cell.qtd_pedidos;
        totalItensHora += cell.qtd_itens;
        totalFaturamentoHora += cell.faturamento;
      });

      return {
        hora,
        hora_label: horaStr,
        valores_por_dia: valoresPorDia,
        total_pedidos: totalPedidosHora,
        total_itens: totalItensHora,
        total_faturamento: totalFaturamentoHora
      };
    });

    // 6. Identificar Horários de Pico
    let picoGeralPedidos = null;
    let picoGeralFaturamento = null;
    matrizHoras.forEach(row => {
      if (!picoGeralPedidos || row.total_pedidos > picoGeralPedidos.total_pedidos) {
        picoGeralPedidos = { hora: row.hora, hora_label: row.hora_label, total_pedidos: row.total_pedidos };
      }
      if (!picoGeralFaturamento || row.total_faturamento > picoGeralFaturamento.total_faturamento) {
        picoGeralFaturamento = { hora: row.hora, hora_label: row.hora_label, total_faturamento: row.total_faturamento };
      }
    });

    // Picos individuais de cada dia
    const picosPorDia = {};
    dias.forEach(d => {
      let maxPedidos = 0;
      let maxFat = 0;
      let horaMax = null;
      matrizHoras.forEach(row => {
        const cell = row.valores_por_dia[d.data];
        if (cell && (cell.qtd_pedidos > maxPedidos || (cell.qtd_pedidos === maxPedidos && cell.faturamento > maxFat))) {
          maxPedidos = cell.qtd_pedidos;
          maxFat = cell.faturamento;
          horaMax = row.hora_label;
        }
      });
      picosPorDia[d.data] = {
        hora_pico: horaMax || '-',
        pedidos_pico: maxPedidos,
        faturamento_pico: maxFat
      };
    });

    // 7. Dados de Dispositivos (Mobile vs Desktop)
    const dispRes = await query(`
      SELECT 
        COALESCE(origem, 'desktop') as origem,
        COUNT(*) as total_vendas,
        SUM(total) as faturamento,
        ROUND(AVG(total), 2) as ticket_medio
      FROM expobai.pedidos
      WHERE status = 'concluido'
      GROUP BY origem
    `);

    // Linha do tempo das vendas mobile (para conferência e auditoria de saídas no parque)
    const mobileTimelineRes = await query(`
      SELECT 
        p.id,
        p.numero_pedido,
        p.total,
        p.forma_pagamento,
        TO_CHAR(p.data_hora AT TIME ZONE 'America/Campo_Grande', 'YYYY-MM-DD HH24:MI:SS') as horario_ms,
        EXTRACT(HOUR FROM p.data_hora AT TIME ZONE 'America/Campo_Grande')::int as hora,
        ((p.data_hora AT TIME ZONE 'America/Campo_Grande') - INTERVAL '6 hours')::date as dia_evento,
        (
          SELECT string_agg(i.quantidade || 'x ' || i.nome_produto, ', ')
          FROM expobai.pedido_itens i
          WHERE i.pedido_id = p.id
        ) as itens
      FROM expobai.pedidos p
      WHERE p.origem = 'mobile' AND p.status = 'concluido'
      ORDER BY p.data_hora ASC
    `);

    return {
      dias,
      produtos,
      matriz_horas: matrizHoras,
      picos: {
        geral_pedidos: picoGeralPedidos,
        geral_faturamento: picoGeralFaturamento,
        por_dia: picosPorDia
      },
      dispositivos: {
        resumo: dispRes.rows,
        mobile_timeline: mobileTimelineRes.rows
      }
    };
  }
};

module.exports = relatoriosRepository;
