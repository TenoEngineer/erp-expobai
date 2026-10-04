const { query } = require('../db');
const configuracoesRepo = require('./configuracoesRepository');

const ALLOWED_TIMEZONES = [
  'America/Campo_Grande',
  'America/Cuiaba',
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/Bahia',
  'America/Noronha'
];

async function getTenantTimezone(tenantId) {
  try {
    const tz = await configuracoesRepo.get('fuso_horario', tenantId);
    if (tz && (ALLOWED_TIMEZONES.includes(tz) || /^[A-Za-z_]+\/[A-Za-z_]+$/.test(tz))) {
      return tz;
    }
  } catch (err) {
    // fallback
  }
  return 'America/Campo_Grande';
}

const relatoriosRepository = {
  async getFechamentoCaixa({ data_inicio, data_fim, periodo, sessao_id, tenant_id = 'tenda-muller' } = {}) {
    const tz = await getTenantTimezone(tenant_id);
    let whereConditions = ["p.status = 'concluido'", "p.tenant_id = $1"];
    const params = [tenant_id];

    // 1. Filtragem por Sessão de Caixa específica
    if (sessao_id) {
      const sessRes = await query('SELECT * FROM expobai.sessoes_caixa WHERE id = $1 AND tenant_id = $2', [sessao_id, tenant_id]);
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
    // 2. Filtragem por Período / Datas (Timezone configurável por tenant)
    else if (data_inicio && data_fim) {
      if (data_inicio.includes(':') || data_fim.includes(':')) {
        const start = data_inicio.includes(':') ? data_inicio.replace('T', ' ') : `${data_inicio} 00:00:00`;
        const end = data_fim.includes(':') ? data_fim.replace('T', ' ') : `${data_fim} 23:59:59.999`;
        params.push(start);
        params.push(end);
        whereConditions.push(`(p.data_hora AT TIME ZONE '${tz}') >= $${params.length - 1}::timestamp AND (p.data_hora AT TIME ZONE '${tz}') <= $${params.length}::timestamp`);
      } else {
        // Agrupamento por dia de evento (inclui vendas da noite e madrugada até 06h00)
        params.push(data_inicio);
        params.push(data_fim);
        whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date >= $${params.length - 1}::date AND ((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date <= $${params.length}::date`);
      }
    } else if (data_inicio) {
      if (data_inicio.includes(':')) {
        params.push(data_inicio.replace('T', ' '));
        whereConditions.push(`(p.data_hora AT TIME ZONE '${tz}') >= $${params.length}::timestamp`);
      } else {
        params.push(data_inicio);
        whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date = $${params.length}::date`);
      }
    } else if (periodo) {
      if (periodo === 'hoje') {
        // Agrupa as vendas da noite e madrugada atual sem quebrar à meia-noite (corte às 06h00)
        whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date = ((NOW() AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date`);
      } else if (periodo === 'ontem') {
        whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date = (((NOW() AT TIME ZONE '${tz}') - INTERVAL '6 hours') - INTERVAL '1 day')::date`);
      } else if (periodo === '7dias') {
        whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date >= (((NOW() AT TIME ZONE '${tz}') - INTERVAL '6 hours') - INTERVAL '7 days')::date`);
      } else if (periodo === 'mes') {
        whereConditions.push(`(p.data_hora AT TIME ZONE '${tz}') >= date_trunc('month', NOW() AT TIME ZONE '${tz}')`);
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
        to_char(p.data_hora AT TIME ZONE '${tz}', 'HH24:00') as hora,
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
        to_char(p.editado_em AT TIME ZONE '${tz}', 'DD/MM/YYYY HH24:MI') as editado_em_ms,
        p.motivo_edicao,
        p.data_hora,
        to_char(p.data_hora AT TIME ZONE '${tz}', 'DD/MM/YYYY HH24:MI:SS') as data_hora_ms,
        to_char(p.data_hora AT TIME ZONE '${tz}', 'HH24:MI:SS') as hora_ms,
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
  async getLancamentosPorPagamento({ forma_pagamento, data_inicio, data_fim, periodo, sessao_id, tenant_id = 'tenda-muller' } = {}) {
    const tz = await getTenantTimezone(tenant_id);
    let whereConditions = ["p.status = 'concluido'", "p.tenant_id = $1"];
    const params = [tenant_id];

    // 1. Filtragem por Sessão de Caixa específica
    if (sessao_id) {
      const sessRes = await query('SELECT * FROM expobai.sessoes_caixa WHERE id = $1 AND tenant_id = $2', [sessao_id, tenant_id]);
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
        whereConditions.push(`(p.data_hora AT TIME ZONE '${tz}') >= $${params.length - 1}::timestamp AND (p.data_hora AT TIME ZONE '${tz}') <= $${params.length}::timestamp`);
      } else {
        params.push(data_inicio);
        params.push(data_fim);
        whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date >= $${params.length - 1}::date AND ((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date <= $${params.length}::date`);
      }
    } else if (data_inicio) {
      if (data_inicio.includes(':')) {
        params.push(data_inicio.replace('T', ' '));
        whereConditions.push(`(p.data_hora AT TIME ZONE '${tz}') >= $${params.length}::timestamp`);
      } else {
        params.push(data_inicio);
        whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date = $${params.length}::date`);
      }
    } else if (periodo) {
      if (periodo === 'hoje') {
        whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date = ((NOW() AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date`);
      } else if (periodo === 'ontem') {
        whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date = (((NOW() AT TIME ZONE '${tz}') - INTERVAL '6 hours') - INTERVAL '1 day')::date`);
      } else if (periodo === '7dias') {
        whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date >= (((NOW() AT TIME ZONE '${tz}') - INTERVAL '6 hours') - INTERVAL '7 days')::date`);
      } else if (periodo === 'mes') {
        whereConditions.push(`(p.data_hora AT TIME ZONE '${tz}') >= date_trunc('month', NOW() AT TIME ZONE '${tz}')`);
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
        to_char(p.editado_em AT TIME ZONE '${tz}', 'DD/MM/YYYY HH24:MI') as editado_em_ms,
        p.motivo_edicao,
        p.data_hora,
        to_char(p.data_hora AT TIME ZONE '${tz}', 'DD/MM/YYYY HH24:MI:SS') as data_hora_ms,
        to_char(p.data_hora AT TIME ZONE '${tz}', 'HH24:MI:SS') as hora_ms,
        to_char(p.data_hora AT TIME ZONE '${tz}', 'DD/MM/YYYY') as data_ms,
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
  async getComparativoHorarios({ produto_id, origem, tenant_id = 'tenda-muller' } = {}) {
    const tz = await getTenantTimezone(tenant_id);
    const filterProd = produto_id && produto_id !== 'todos' ? String(produto_id) : null;
    const filterOrigem = origem && origem !== 'todos' ? String(origem).toLowerCase() : null;

    // 1. Obter os dias do evento
    const diasRes = await query(`
      SELECT 
        ((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date as data,
        EXTRACT(DOW FROM ((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date)::int as dow,
        COUNT(DISTINCT p.id) as total_pedidos,
        COALESCE(SUM(p.total), 0) as faturamento
      FROM expobai.pedidos p
      WHERE p.status = 'concluido' AND p.tenant_id = $1
      GROUP BY data, dow
      ORDER BY data ASC
    `, [tenant_id]);

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
      WHERE p.status = 'concluido' AND p.tenant_id = $1
      GROUP BY COALESCE(i.produto_id::text, i.nome_produto), i.nome_produto
      ORDER BY qtd_total DESC
    `, [tenant_id]);

    const produtos = prodsRes.rows.map(r => ({
      id: r.id,
      nome: r.nome,
      qtd_total: parseInt(r.qtd_total, 10),
      faturamento_total: parseFloat(r.faturamento_total)
    }));

    // 3. Matriz Hora x Dia com filtro opcional de produto e origem
    const matrizParams = [tenant_id, filterProd, filterOrigem];
    const matrizRes = await query(`
      SELECT 
        ((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date as dia_evento,
        EXTRACT(HOUR FROM (p.data_hora AT TIME ZONE '${tz}'))::int as hora,
        COUNT(DISTINCT p.id) as qtd_pedidos,
        COALESCE(SUM(i.quantidade), 0) as qtd_itens,
        COALESCE(SUM(i.subtotal), 0) as faturamento
      FROM expobai.pedidos p
      JOIN expobai.pedido_itens i ON i.pedido_id = p.id
      WHERE p.status = 'concluido'
        AND p.tenant_id = $1
        AND ($2::text IS NULL OR i.produto_id::text = $2 OR i.nome_produto = $2)
        AND ($3::text IS NULL OR p.origem = $3)
      GROUP BY dia_evento, hora
      ORDER BY dia_evento, hora
    `, matrizParams);

    // 4. Top 3 produtos mais vendidos por hora e dia
    const topItensRes = await query(`
      WITH RankedItens AS (
        SELECT 
          ((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date as dia_evento,
          EXTRACT(HOUR FROM (p.data_hora AT TIME ZONE '${tz}'))::int as hora,
          i.nome_produto,
          SUM(i.quantidade) as qtd,
          SUM(i.subtotal) as subtotal,
          ROW_NUMBER() OVER(
            PARTITION BY ((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date, 
                         EXTRACT(HOUR FROM (p.data_hora AT TIME ZONE '${tz}'))::int 
            ORDER BY SUM(i.quantidade) DESC
          ) as rnk
        FROM expobai.pedidos p
        JOIN expobai.pedido_itens i ON i.pedido_id = p.id
        WHERE p.status = 'concluido'
          AND p.tenant_id = $1
          AND ($2::text IS NULL OR p.origem = $2)
        GROUP BY dia_evento, hora, i.nome_produto
      )
      SELECT dia_evento, hora, rnk, nome_produto, qtd, subtotal
      FROM RankedItens
      WHERE rnk <= 3
      ORDER BY dia_evento, hora, rnk
    `, [tenant_id, filterOrigem]);

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
      WHERE status = 'concluido' AND tenant_id = $1
      GROUP BY origem
    `, [tenant_id]);

    // Linha do tempo das vendas mobile (para conferência e auditoria de saídas no parque)
    const mobileTimelineRes = await query(`
      SELECT 
        p.id,
        p.numero_pedido,
        p.total,
        p.forma_pagamento,
        TO_CHAR(p.data_hora AT TIME ZONE '${tz}', 'YYYY-MM-DD HH24:MI:SS') as horario_ms,
        EXTRACT(HOUR FROM p.data_hora AT TIME ZONE '${tz}')::int as hora,
        ((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date as dia_evento,
        (
          SELECT string_agg(i.quantidade || 'x ' || i.nome_produto, ', ')
          FROM expobai.pedido_itens i
          WHERE i.pedido_id = p.id
        ) as itens
      FROM expobai.pedidos p
      WHERE p.origem = 'mobile' AND p.status = 'concluido' AND p.tenant_id = $1
      ORDER BY p.data_hora ASC
    `, [tenant_id]);

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
  },

  /**
   * Análise Profunda da Cesta de Compras, Distribuição por SKUs e Cross-Selling
   */
  async getAnaliseCesta({ tenant_id = 'tenda-muller' } = {}) {
    // 1. Totais Gerais
    const totalGeralRes = await query(`
      SELECT 
        COUNT(*)::int as total_pedidos,
        COALESCE(SUM(total), 0)::numeric as total_faturamento
      FROM expobai.pedidos
      WHERE status = 'concluido' AND tenant_id = $1
    `, [tenant_id]);

    const totalPedidos = parseInt(totalGeralRes.rows[0]?.total_pedidos || 0, 10);
    const totalFaturamento = parseFloat(totalGeralRes.rows[0]?.total_faturamento || 0);

    // 2. Distribuição por Quantidade de SKUs Distintos
    const skuDistRes = await query(`
      WITH OrderSKUCount AS (
        SELECT 
          pi.pedido_id,
          COUNT(DISTINCT pi.nome_produto) as sku_count,
          SUM(pi.quantidade) as total_units,
          SUM(pi.subtotal) as order_total
        FROM expobai.pedido_itens pi
        JOIN expobai.pedidos p ON p.id = pi.pedido_id
        WHERE p.status = 'concluido' AND p.tenant_id = $1
        GROUP BY pi.pedido_id
      )
      SELECT 
        s.sku_count,
        COUNT(*)::int as total_orders,
        SUM(s.total_units)::numeric as total_units_sold,
        ROUND(AVG(s.total_units), 2) as avg_units_per_order,
        ROUND(AVG(s.order_total), 2) as avg_ticket,
        SUM(s.order_total)::numeric as total_revenue
      FROM OrderSKUCount s
      GROUP BY s.sku_count
      ORDER BY s.sku_count ASC;
    `, [tenant_id]);

    const distribuicaoSkus = skuDistRes.rows.map(r => ({
      sku_count: parseInt(r.sku_count, 10),
      total_orders: parseInt(r.total_orders, 10),
      pct_orders: totalPedidos > 0 ? Number(((parseInt(r.total_orders, 10) / totalPedidos) * 100).toFixed(2)) : 0,
      total_units_sold: parseFloat(r.total_units_sold) || 0,
      avg_units_per_order: parseFloat(r.avg_units_per_order) || 0,
      avg_ticket: parseFloat(r.avg_ticket) || 0,
      total_revenue: parseFloat(r.total_revenue) || 0,
      pct_revenue: totalFaturamento > 0 ? Number(((parseFloat(r.total_revenue) / totalFaturamento) * 100).toFixed(2)) : 0
    }));

    // 3. Top Pares de Produtos (Venda Casada / Cross-Selling)
    const paresRes = await query(`
      SELECT 
        LEAST(i1.nome_produto, i2.nome_produto) as produto_a,
        GREATEST(i1.nome_produto, i2.nome_produto) as produto_b,
        COUNT(DISTINCT i1.pedido_id)::int as frequencia_juntos
      FROM expobai.pedido_itens i1
      JOIN expobai.pedido_itens i2 ON i1.pedido_id = i2.pedido_id AND i1.nome_produto < i2.nome_produto
      JOIN expobai.pedidos p ON p.id = i1.pedido_id
      WHERE p.status = 'concluido' AND p.tenant_id = $1
      GROUP BY produto_a, produto_b
      ORDER BY frequencia_juntos DESC
      LIMIT 12;
    `, [tenant_id]);

    // 4. Top Itens Monoproduto (Apenas 1 tipo de produto no carrinho)
    const monoRes = await query(`
      WITH MonoprodutoPedidos AS (
        SELECT 
          pi.pedido_id,
          COUNT(DISTINCT pi.nome_produto) as tipos_produtos,
          SUM(pi.quantidade) as total_itens
        FROM expobai.pedido_itens pi
        JOIN expobai.pedidos p ON p.id = pi.pedido_id
        WHERE p.status = 'concluido' AND p.tenant_id = $1
        GROUP BY pi.pedido_id
        HAVING COUNT(DISTINCT pi.nome_produto) = 1
      )
      SELECT 
        pi.nome_produto,
        COUNT(DISTINCT p.id)::int as total_pedidos_exclusivos,
        SUM(pi.quantidade)::int as qtd_total_vendida,
        SUM(pi.subtotal)::numeric as faturamento_exclusivo
      FROM expobai.pedidos p
      JOIN MonoprodutoPedidos m ON m.pedido_id = p.id
      JOIN expobai.pedido_itens pi ON pi.pedido_id = p.id
      WHERE p.status = 'concluido' AND p.tenant_id = $1
      GROUP BY pi.nome_produto
      ORDER BY total_pedidos_exclusivos DESC
      LIMIT 8;
    `, [tenant_id]);

    const totalMonoprodutoPedidos = distribuicaoSkus.find(d => d.sku_count === 1)?.total_orders || 0;
    const topMonoproduto = monoRes.rows.map(r => ({
      produto: r.nome_produto,
      pedidos_exclusivos: parseInt(r.total_pedidos_exclusivos, 10),
      qtd_vendida: parseInt(r.qtd_total_vendida, 10),
      faturamento: parseFloat(r.faturamento_exclusivo),
      pct_dos_monoproduto: totalMonoprodutoPedidos > 0 
        ? Number(((parseInt(r.total_pedidos_exclusivos, 10) / totalMonoprodutoPedidos) * 100).toFixed(1)) 
        : 0
    }));

    // 5. Top Itens em Compra Única Estrita (Total de itens = 1)
    const unitariaRes = await query(`
      WITH PedidoStats AS (
        SELECT 
          pi.pedido_id,
          SUM(pi.quantidade) as total_itens
        FROM expobai.pedido_itens pi
        JOIN expobai.pedidos p ON p.id = pi.pedido_id
        WHERE p.status = 'concluido' AND p.tenant_id = $1
        GROUP BY pi.pedido_id
      )
      SELECT 
        pi.nome_produto,
        COUNT(*)::int as total_compras_unicas,
        SUM(pi.subtotal)::numeric as faturamento_compras_unicas
      FROM expobai.pedidos p
      JOIN PedidoStats s ON s.pedido_id = p.id
      JOIN expobai.pedido_itens pi ON pi.pedido_id = p.id
      WHERE p.status = 'concluido' AND p.tenant_id = $1 AND s.total_itens = 1
      GROUP BY pi.nome_produto
      ORDER BY total_compras_unicas DESC
      LIMIT 8;
    `, [tenant_id]);

    const totalUnitarias = unitariaRes.rows.reduce((a, b) => a + parseInt(b.total_compras_unicas, 10), 0);
    const topComprasUnitarias = unitariaRes.rows.map(r => ({
      produto: r.nome_produto,
      compras_solitarias: parseInt(r.total_compras_unicas, 10),
      faturamento: parseFloat(r.faturamento_compras_unicas),
      pct_das_unitarias: totalUnitarias > 0 
        ? Number(((parseInt(r.total_compras_unicas, 10) / totalUnitarias) * 100).toFixed(1)) 
        : 0
    }));

    // Multi-SKU (2 ou mais SKUs)
    const multiSkuOrders = distribuicaoSkus.filter(d => d.sku_count >= 2).reduce((a, b) => a + b.total_orders, 0);
    const multiSkuRevenue = distribuicaoSkus.filter(d => d.sku_count >= 2).reduce((a, b) => a + b.total_revenue, 0);

    return {
      totais: {
        total_pedidos: totalPedidos,
        total_faturamento: totalFaturamento,
        pedidos_1_sku: totalMonoprodutoPedidos,
        pct_1_sku: totalPedidos > 0 ? Number(((totalMonoprodutoPedidos / totalPedidos) * 100).toFixed(1)) : 0,
        pedidos_multi_sku: multiSkuOrders,
        pct_multi_sku: totalPedidos > 0 ? Number(((multiSkuOrders / totalPedidos) * 100).toFixed(1)) : 0,
        faturamento_multi_sku: multiSkuRevenue,
        pct_faturamento_multi_sku: totalFaturamento > 0 ? Number(((multiSkuRevenue / totalFaturamento) * 100).toFixed(1)) : 0
      },
      distribuicao_skus: distribuicaoSkus,
      top_pares_cross_selling: paresRes.rows,
      top_monoproduto: topMonoproduto,
      top_compras_unitarias: topComprasUnitarias
    };
  },

  /**
   * 2. Velocidade & Vazão do Caixa (Speed of Service / Throughput)
   */
  async getVazaoCaixa({ periodo, data_inicio, data_fim, sessao_id, tenant_id = 'tenda-muller' } = {}) {
    const tz = await getTenantTimezone(tenant_id);
    let whereConditions = ["p.status = 'concluido'", "p.tenant_id = $1"];
    const params = [tenant_id];

    if (sessao_id) {
      const sessRes = await query('SELECT * FROM expobai.sessoes_caixa WHERE id = $1 AND tenant_id = $2', [sessao_id, tenant_id]);
      if (sessRes.rows.length > 0) {
        const sessao = sessRes.rows[0];
        params.push(sessao.aberto_em);
        whereConditions.push(`p.data_hora >= $${params.length}`);
        if (sessao.fechado_em) {
          params.push(sessao.fechado_em);
          whereConditions.push(`p.data_hora <= $${params.length}`);
        }
      }
    } else if (data_inicio && data_fim) {
      params.push(data_inicio.includes(':') ? data_inicio.replace('T', ' ') : `${data_inicio} 00:00:00`);
      params.push(data_fim.includes(':') ? data_fim.replace('T', ' ') : `${data_fim} 23:59:59.999`);
      whereConditions.push(`(p.data_hora AT TIME ZONE '${tz}') >= $${params.length - 1}::timestamp AND (p.data_hora AT TIME ZONE '${tz}') <= $${params.length}::timestamp`);
    } else if (periodo === 'hoje') {
      whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date = ((NOW() AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date`);
    } else if (periodo === '7dias') {
      whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date >= (((NOW() AT TIME ZONE '${tz}') - INTERVAL '6 hours') - INTERVAL '7 days')::date`);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Busca pedidos ordenados no tempo
    const pedidosRes = await query(`
      SELECT 
        p.id,
        p.numero_pedido,
        p.total,
        p.data_hora,
        EXTRACT(EPOCH FROM p.data_hora) as epoch_sec,
        TO_CHAR(p.data_hora AT TIME ZONE '${tz}', 'HH24:MI:SS') as horario_fmt,
        EXTRACT(HOUR FROM p.data_hora AT TIME ZONE '${tz}')::int as hora,
        TO_CHAR((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours', 'YYYY-MM-DD') as dia_evento,
        (SELECT COALESCE(SUM(pi.quantidade), 1)::int FROM expobai.pedido_itens pi WHERE pi.pedido_id = p.id) as total_itens
      FROM expobai.pedidos p
      ${whereClause}
      ORDER BY p.data_hora ASC
    `, params);

    const rows = pedidosRes.rows;
    const totalPedidos = rows.length;
    let totalSegundosOperacao = 0;
    let intervalCount = 0;
    const hourlyMap = {};

    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = {
        hora: h,
        hora_label: `${String(h).padStart(2, '0')}:00`,
        total_pedidos: 0,
        total_itens: 0,
        faturamento: 0,
        delta_seconds_sum: 0,
        delta_count: 0
      };
    }

    let fastestBurst = { seconds: 999999, pedido_a: null, pedido_b: null };
    let maxThroughputHour = { hora: null, pedidos: 0, faturamento: 0 };

    for (let i = 0; i < rows.length; i++) {
      const cur = rows[i];
      const hora = cur.hora;
      const totalVal = parseFloat(cur.total) || 0;
      const itensCount = parseInt(cur.total_itens, 10) || 1;

      if (!hourlyMap[hora]) {
        hourlyMap[hora] = { hora, hora_label: `${String(hora).padStart(2, '0')}:00`, total_pedidos: 0, total_itens: 0, faturamento: 0, delta_seconds_sum: 0, delta_count: 0 };
      }

      hourlyMap[hora].total_pedidos++;
      hourlyMap[hora].total_itens += itensCount;
      hourlyMap[hora].faturamento += totalVal;

      if (i > 0) {
        const prev = rows[i - 1];
        if (prev.dia_evento === cur.dia_evento) {
          const deltaSec = cur.epoch_sec - prev.epoch_sec;
          if (deltaSec > 0 && deltaSec <= 600) {
            totalSegundosOperacao += deltaSec;
            intervalCount++;
            hourlyMap[hora].delta_seconds_sum += deltaSec;
            hourlyMap[hora].delta_count++;

            if (deltaSec < fastestBurst.seconds && deltaSec >= 5) {
              fastestBurst = {
                seconds: deltaSec,
                pedido_a: prev.numero_pedido,
                pedido_b: cur.numero_pedido
              };
            }
          }
        }
      }
    }

    const tempoMedioSegundosGeral = intervalCount > 0 ? Math.round(totalSegundosOperacao / intervalCount) : 0;
    const pedidosPorMinutoPico = tempoMedioSegundosGeral > 0 ? Number((60 / tempoMedioSegundosGeral).toFixed(1)) : 0;

    const cicloHoras = [16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4];
    const rankingHoras = cicloHoras.map(h => {
      const entry = hourlyMap[h] || { hora: h, hora_label: `${String(h).padStart(2, '0')}:00`, total_pedidos: 0, total_itens: 0, faturamento: 0, delta_seconds_sum: 0, delta_count: 0 };
      const avgSec = entry.delta_count > 0 ? Math.round(entry.delta_seconds_sum / entry.delta_count) : 0;
      
      let statusFila = 'calmo';
      let descricaoFila = 'Fluxo Tranquilo (Sem Fila)';
      if (entry.total_pedidos >= 50 || (avgSec > 0 && avgSec <= 45)) {
        statusFila = 'critico_gargalo';
        descricaoFila = 'Alta Pressão / Gargalo de Fila';
      } else if (entry.total_pedidos >= 25 || (avgSec > 0 && avgSec <= 90)) {
        statusFila = 'alta_demanda';
        descricaoFila = 'Fluxo Intenso / Ágil';
      } else if (entry.total_pedidos > 5) {
        statusFila = 'moderado';
        descricaoFila = 'Fluxo Contínuo';
      }

      if (entry.total_pedidos > maxThroughputHour.pedidos) {
        maxThroughputHour = {
          hora: h,
          hora_label: `${String(h).padStart(2, '0')}:00`,
          pedidos: entry.total_pedidos,
          faturamento: entry.faturamento
        };
      }

      return {
        ...entry,
        tempo_medio_segundos: avgSec,
        pedidos_por_minuto: avgSec > 0 ? Number((60 / avgSec).toFixed(1)) : 0,
        status_fila: statusFila,
        descricao_fila: descricaoFila
      };
    });

    return {
      indicadores: {
        total_pedidos: totalPedidos,
        tempo_medio_segundos_por_pedido: tempoMedioSegundosGeral,
        pedidos_por_minuto_medio: pedidosPorMinutoPico,
        capacidade_maxima_hora: tempoMedioSegundosGeral > 0 ? Math.round(3600 / tempoMedioSegundosGeral) : 0,
        venda_mais_rapida_segundos: fastestBurst.seconds === 999999 ? 0 : fastestBurst.seconds,
        pico_vazao: maxThroughputHour
      },
      ranking_horas: rankingHoras,
      diagnostico_fila: {
        nivel_estresse: tempoMedioSegundosGeral <= 45 ? 'alto' : tempoMedioSegundosGeral <= 90 ? 'moderado' : 'baixo',
        recomendacao: tempoMedioSegundosGeral <= 50
          ? 'Recomenda-se adicionar 1 operador volante ou totem para evitar abandono de fila nos horários de pico (22h às 01h).'
          : 'Tempo de atendimento dentro do padrão ótimo de fluidez.'
      }
    };
  },

  /**
   * 3. Dreno de Taxas por Meio de Pagamento & Economia PIX
   */
  async getDrenoTaxas({ taxa_debito = 1.99, taxa_credito = 3.49, periodo, data_inicio, data_fim, sessao_id, tenant_id = 'tenda-muller' } = {}) {
    const tz = await getTenantTimezone(tenant_id);
    let whereConditions = ["p.status = 'concluido'", "p.tenant_id = $1"];
    const params = [tenant_id];

    if (sessao_id) {
      const sessRes = await query('SELECT * FROM expobai.sessoes_caixa WHERE id = $1 AND tenant_id = $2', [sessao_id, tenant_id]);
      if (sessRes.rows.length > 0) {
        params.push(sessRes.rows[0].aberto_em);
        whereConditions.push(`p.data_hora >= $${params.length}`);
        if (sessRes.rows[0].fechado_em) {
          params.push(sessRes.rows[0].fechado_em);
          whereConditions.push(`p.data_hora <= $${params.length}`);
        }
      }
    } else if (data_inicio && data_fim) {
      params.push(data_inicio.includes(':') ? data_inicio.replace('T', ' ') : `${data_inicio} 00:00:00`);
      params.push(data_fim.includes(':') ? data_fim.replace('T', ' ') : `${data_fim} 23:59:59.999`);
      whereConditions.push(`(p.data_hora AT TIME ZONE '${tz}') >= $${params.length - 1}::timestamp AND (p.data_hora AT TIME ZONE '${tz}') <= $${params.length}::timestamp`);
    } else if (periodo === 'hoje') {
      whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date = ((NOW() AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date`);
    } else if (periodo === '7dias') {
      whereConditions.push(`((p.data_hora AT TIME ZONE '${tz}') - INTERVAL '6 hours')::date >= (((NOW() AT TIME ZONE '${tz}') - INTERVAL '6 hours') - INTERVAL '7 days')::date`);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const pagamentosRes = await query(`
      SELECT 
        COUNT(p.id)::int as total_pedidos,
        COALESCE(SUM(p.total), 0)::numeric as faturamento_total,
        COALESCE(SUM(
          CASE 
            WHEN p.pagamentos IS NOT NULL AND jsonb_typeof(p.pagamentos) = 'array'
            THEN COALESCE((SELECT SUM((elem->>'valor')::numeric) FROM jsonb_array_elements(p.pagamentos) elem WHERE elem->>'forma' = 'pix'), 0)
            WHEN p.forma_pagamento = 'pix' THEN p.total
            ELSE 0
          END
        ), 0)::numeric as total_pix,
        COALESCE(SUM(
          CASE 
            WHEN p.pagamentos IS NOT NULL AND jsonb_typeof(p.pagamentos) = 'array'
            THEN COALESCE((SELECT SUM((elem->>'valor')::numeric) FROM jsonb_array_elements(p.pagamentos) elem WHERE elem->>'forma' = 'dinheiro'), 0)
            WHEN p.forma_pagamento = 'dinheiro' THEN p.total
            ELSE 0
          END
        ), 0)::numeric as total_dinheiro,
        COALESCE(SUM(
          CASE 
            WHEN p.pagamentos IS NOT NULL AND jsonb_typeof(p.pagamentos) = 'array'
            THEN COALESCE((SELECT SUM((elem->>'valor')::numeric) FROM jsonb_array_elements(p.pagamentos) elem WHERE elem->>'forma' = 'debito'), 0)
            WHEN p.forma_pagamento = 'debito' THEN p.total
            ELSE 0
          END
        ), 0)::numeric as total_debito,
        COALESCE(SUM(
          CASE 
            WHEN p.pagamentos IS NOT NULL AND jsonb_typeof(p.pagamentos) = 'array'
            THEN COALESCE((SELECT SUM((elem->>'valor')::numeric) FROM jsonb_array_elements(p.pagamentos) elem WHERE elem->>'forma' = 'credito'), 0)
            WHEN p.forma_pagamento = 'credito' THEN p.total
            ELSE 0
          END
        ), 0)::numeric as total_credito
      FROM expobai.pedidos p
      ${whereClause}
    `, params);

    const r = pagamentosRes.rows[0];
    const totalFat = parseFloat(r.faturamento_total) || 0;
    const totalPix = parseFloat(r.total_pix) || 0;
    const totalDin = parseFloat(r.total_dinheiro) || 0;
    const totalDeb = parseFloat(r.total_debito) || 0;
    const totalCred = parseFloat(r.total_credito) || 0;

    const txDeb = parseFloat(taxa_debito) || 1.99;
    const txCred = parseFloat(taxa_credito) || 3.49;

    const custoDebito = Math.round(totalDeb * (txDeb / 100) * 100) / 100;
    const custoCredito = Math.round(totalCred * (txCred / 100) * 100) / 100;
    const drenoTotal = Math.round((custoDebito + custoCredito) * 100) / 100;
    const totalCartao = totalDeb + totalCred;
    const fatLiquido = Math.round((totalFat - drenoTotal) * 100) / 100;

    const pctDrenoFat = totalFat > 0 ? Number(((drenoTotal / totalFat) * 100).toFixed(2)) : 0;
    const pctCartaoFat = totalFat > 0 ? Number(((totalCartao / totalFat) * 100).toFixed(1)) : 0;

    const taxaMediaCartao = totalCartao > 0 ? (drenoTotal / totalCartao) : 0.025;
    const economia25 = Math.round((totalCartao * 0.25 * taxaMediaCartao) * 100) / 100;
    const economia50 = Math.round((totalCartao * 0.50 * taxaMediaCartao) * 100) / 100;
    const economia100 = drenoTotal;

    return {
      parametros: {
        taxa_debito_pct: txDeb,
        taxa_credito_pct: txCred
      },
      resumo: {
        faturamento_bruto: totalFat,
        faturamento_liquido: fatLiquido,
        dreno_total_taxas: drenoTotal,
        pct_dreno_sobre_faturamento: pctDrenoFat,
        total_volume_cartao: totalCartao,
        pct_volume_cartao: pctCartaoFat
      },
      formas: [
        { forma: 'PIX (0% Taxa)', faturado: totalPix, taxa_pct: 0, taxa_reais: 0, liquido: totalPix, cor: '#10B981' },
        { forma: 'Dinheiro Espécie', faturado: totalDin, taxa_pct: 0, taxa_reais: 0, liquido: totalDin, cor: '#059669' },
        { forma: 'Cartão de Débito', faturado: totalDeb, taxa_pct: txDeb, taxa_reais: custoDebito, liquido: totalDeb - custoDebito, cor: '#3B82F6' },
        { forma: 'Cartão de Crédito', faturado: totalCred, taxa_pct: txCred, taxa_reais: custoCredito, liquido: totalCred - custoCredito, cor: '#8B5CF6' }
      ],
      simulacao_pix: {
        conversao_25_pct: economia25,
        conversao_50_pct: economia50,
        conversao_total_cartao: economia100,
        pitch_roi: `Você gastou ${drenoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em taxas bancárias. Estimulando o PIX, você economiza até ${economia50.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} líquidos!`
      }
    };
  },

  /**
   * 4. Velocidade de Queima & Previsão de Esgotamento (Stockout & Burn-Rate Forecast)
   */
  async getPrevisaoEsgotamento({ tenant_id = 'tenda-muller' } = {}) {
    const tz = await getTenantTimezone(tenant_id);

    const prodsRes = await query(`
      SELECT 
        pr.id,
        pr.nome,
        c.nome as categoria,
        pr.preco,
        pr.preco_custo,
        COALESCE(SUM(pi.quantidade), 0)::int as total_vendido,
        COALESCE(SUM(pi.subtotal), 0)::numeric as faturamento_total
      FROM expobai.produtos pr
      JOIN expobai.categorias c ON c.id = pr.categoria_id
      LEFT JOIN expobai.pedido_itens pi ON pi.produto_id = pr.id
      LEFT JOIN expobai.pedidos p ON p.id = pi.pedido_id AND p.status = 'concluido' AND p.tenant_id = $1
      WHERE pr.ativo = 1 AND pr.tenant_id = $1
      GROUP BY pr.id, pr.nome, c.nome, pr.preco, pr.preco_custo
      ORDER BY total_vendido DESC
    `, [tenant_id]);

    const picoRes = await query(`
      SELECT 
        pi.produto_id,
        COALESCE(SUM(pi.quantidade), 0)::int as qtd_pico
      FROM expobai.pedido_itens pi
      JOIN expobai.pedidos p ON p.id = pi.pedido_id
      WHERE p.status = 'concluido' AND p.tenant_id = $1
        AND EXTRACT(HOUR FROM p.data_hora AT TIME ZONE '${tz}') IN (20, 21, 22, 23, 0, 1)
      GROUP BY pi.produto_id
    `, [tenant_id]);

    const picoMap = new Map();
    picoRes.rows.forEach(r => picoMap.set(Number(r.produto_id), parseInt(r.qtd_pico, 10)));

    const horasPicoReferencia = 6;

    const produtosAnalise = prodsRes.rows.map(p => {
      const id = Number(p.id);
      const totalVendido = parseInt(p.total_vendido, 10);
      const qtdPico = picoMap.get(id) || Math.round(totalVendido * 0.7);
      const velocidadeQueimaPico = Number((qtdPico / horasPicoReferencia).toFixed(1));
      const velocidadeMediaGeral = Number((totalVendido / 24).toFixed(1));

      return {
        id,
        nome: p.nome,
        categoria: p.categoria,
        preco: parseFloat(p.preco) || 0,
        preco_custo: parseFloat(p.preco_custo) || 0,
        total_vendido: totalVendido,
        faturamento_total: parseFloat(p.faturamento_total) || 0,
        velocidade_queima_pico_hora: velocidadeQueimaPico,
        velocidade_media_geral_hora: velocidadeMediaGeral,
        sugestao_estoque_minimo_noite: Math.ceil(velocidadeQueimaPico * 5)
      };
    });

    return {
      parametros: {
        janela_pico_horas: horasPicoReferencia,
        descricao: 'Calculado com base na cadência de consumo nos horários de pico (20h às 02h).'
      },
      produtos: produtosAnalise
    };
  },

  /**
   * 5. Auditoria de Cancelamentos & Prevenção de Perdas (Loss Prevention / Fraud & Anti-Theft)
   */
  async getAuditoriaPerdas({ periodo, data_inicio, data_fim, sessao_id, tenant_id = 'tenda-muller' } = {}) {
    const tz = await getTenantTimezone(tenant_id);

    // 1. Pedidos Cancelados
    const canceladosRes = await query(`
      SELECT 
        p.id,
        p.numero_pedido,
        p.codigo_identificador,
        p.total,
        p.forma_pagamento,
        p.observacoes,
        TO_CHAR(p.data_hora AT TIME ZONE '${tz}', 'DD/MM/YYYY HH24:MI:SS') as data_hora_fmt,
        (
          SELECT string_agg(i.quantidade || 'x ' || i.nome_produto, ', ')
          FROM expobai.pedido_itens i
          WHERE i.pedido_id = p.id
        ) as itens_cancelados
      FROM expobai.pedidos p
      WHERE p.status = 'cancelado' AND p.tenant_id = $1
      ORDER BY p.data_hora DESC
      LIMIT 50
    `, [tenant_id]);

    // 2. Pedidos Editados / Alterados Após Registro
    const editadosRes = await query(`
      SELECT 
        p.id,
        p.numero_pedido,
        p.codigo_identificador,
        p.total,
        p.forma_pagamento,
        p.motivo_edicao,
        TO_CHAR(p.data_hora AT TIME ZONE '${tz}', 'DD/MM/YYYY HH24:MI') as data_venda_fmt,
        TO_CHAR(p.editado_em AT TIME ZONE '${tz}', 'DD/MM/YYYY HH24:MI:SS') as editado_em_fmt,
        (
          SELECT string_agg(i.quantidade || 'x ' || i.nome_produto, ', ')
          FROM expobai.pedido_itens i
          WHERE i.pedido_id = p.id
        ) as itens_finais
      FROM expobai.pedidos p
      WHERE p.editado = TRUE AND p.tenant_id = $1
      ORDER BY p.editado_em DESC
      LIMIT 50
    `, [tenant_id]);

    // 3. Auditoria de Quebra de Caixa (Diferença entre dinheiro declarado vs registrado)
    const caixasRes = await query(`
      SELECT 
        s.id,
        s.operador,
        s.valor_abertura,
        s.valor_fechamento_dinheiro,
        s.status,
        TO_CHAR(s.aberto_em AT TIME ZONE '${tz}', 'DD/MM/YYYY HH24:MI') as aberto_em_fmt,
        TO_CHAR(s.fechado_em AT TIME ZONE '${tz}', 'DD/MM/YYYY HH24:MI') as fechado_em_fmt,
        COALESCE((
          SELECT SUM(p.total)
          FROM expobai.pedidos p
          WHERE p.status = 'concluido' AND p.tenant_id = $1
            AND p.data_hora >= s.aberto_em
            AND (s.fechado_em IS NULL OR p.data_hora <= s.fechado_em)
            AND (p.forma_pagamento = 'dinheiro' OR (p.pagamentos IS NOT NULL AND jsonb_path_exists(p.pagamentos, '$[*] ? (@.forma == "dinheiro")')))
        ), 0)::numeric as total_dinheiro_sistema
      FROM expobai.sessoes_caixa s
      WHERE s.tenant_id = $1
      ORDER BY s.id DESC
      LIMIT 15
    `, [tenant_id]);

    let totalQuebraGeral = 0;
    const auditoriaSessoes = caixasRes.rows.map(s => {
      const abertura = parseFloat(s.valor_abertura) || 0;
      const vendasDinheiro = parseFloat(s.total_dinheiro_sistema) || 0;
      const esperadoGaveta = Math.round((abertura + vendasDinheiro) * 100) / 100;
      const declarado = s.valor_fechamento_dinheiro !== null ? parseFloat(s.valor_fechamento_dinheiro) : null;
      const diferenca = declarado !== null ? Math.round((declarado - esperadoGaveta) * 100) / 100 : null;

      if (diferenca !== null && diferenca < 0) {
        totalQuebraGeral += Math.abs(diferenca);
      }

      return {
        id: s.id,
        operador: s.operador,
        status: s.status,
        aberto_em: s.aberto_em_fmt,
        fechado_em: s.fechado_em_fmt,
        valor_abertura: abertura,
        vendas_dinheiro: vendasDinheiro,
        saldo_esperado: esperadoGaveta,
        valor_declarado: declarado,
        diferenca_quebra: diferenca,
        status_auditoria: diferenca === null ? 'em_andamento' : diferenca === 0 ? 'perfeito' : diferenca > 0 ? 'sobra' : 'quebra'
      };
    });

    const totalCanceladoReais = canceladosRes.rows.reduce((acc, c) => acc + (parseFloat(c.total) || 0), 0);

    let score = 100;
    if (totalQuebraGeral > 50) score -= 15;
    if (totalQuebraGeral > 200) score -= 25;
    if (canceladosRes.rows.length > 5) score -= 10;
    if (editadosRes.rows.length > 5) score -= 10;
    score = Math.max(0, Math.min(100, score));

    return {
      indicadores: {
        score_seguranca: score,
        nivel_risco: score >= 90 ? 'baixo' : score >= 70 ? 'moderado' : 'alto',
        total_pedidos_cancelados: canceladosRes.rows.length,
        valor_total_cancelado: Math.round(totalCanceladoReais * 100) / 100,
        total_pedidos_editados: editadosRes.rows.length,
        total_quebra_caixa_dinheiro: Math.round(totalQuebraGeral * 100) / 100
      },
      pedidos_cancelados: canceladosRes.rows,
      pedidos_editados: editadosRes.rows,
      auditoria_caixas: auditoriaSessoes
    };
  }
};

module.exports = relatoriosRepository;
