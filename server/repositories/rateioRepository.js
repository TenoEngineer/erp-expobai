const { query } = require('../db');
const configuracoesRepo = require('./configuracoesRepository');

async function getTenantTimezone(tenantId) {
  try {
    const tz = await configuracoesRepo.get('fuso_horario', tenantId);
    if (tz && (/^[A-Za-z_]+\/[A-Za-z_]+$/.test(tz))) {
      return tz;
    }
  } catch (err) {}
  return 'America/Campo_Grande';
}

const rateioRepository = {
  // 1. Obter todos os custos de exposição da feira
  async getCustos(tenant_id = 'tenda-muller') {
    const res = await query('SELECT * FROM expobai.custos_evento WHERE tenant_id = $1 ORDER BY id ASC', [tenant_id]);
    return res.rows;
  },

  // 2. Criar novo custo de exposição
  async createCusto({ descricao, valor, divisao = 'alex_heitor', pago_por = 'caixa', observacoes = null, tenant_id = 'tenda-muller' }) {
    const res = await query(`
      INSERT INTO expobai.custos_evento (descricao, valor, divisao, pago_por, observacoes, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [descricao, parseFloat(valor) || 0, divisao, pago_por, observacoes, tenant_id]);
    return res.rows[0];
  },

  // 3. Atualizar custo existente
  async updateCusto(id, { descricao, valor, divisao, pago_por, observacoes }) {
    const res = await query(`
      UPDATE expobai.custos_evento
      SET descricao = COALESCE($1, descricao),
          valor = COALESCE($2, valor),
          divisao = COALESCE($3, divisao),
          pago_por = COALESCE($4, pago_por),
          observacoes = COALESCE($5, observacoes)
      WHERE id = $6
      RETURNING *
    `, [descricao, valor !== undefined ? parseFloat(valor) : null, divisao, pago_por, observacoes, id]);
    return res.rows[0];
  },

  // 4. Excluir custo
  async deleteCusto(id) {
    const res = await query('DELETE FROM expobai.custos_evento WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  },

  // 4.1 Obter lista de sócios da tenda
  async getSociosLista(tenant_id = 'tenda-muller') {
    const raw = await configuracoesRepo.get('rateio_socios_lista', tenant_id);
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    if (tenant_id === 'tenda-muller') {
      return [
        { id: 'alex', nome: 'Alex (Espetinhos)', cor: '#a855f7', icone: 'beef' },
        { id: 'heitor', nome: 'Heitor (Bebidas/Pão)', cor: '#10b981', icone: 'cupsoda' },
        { id: 'pais', nome: 'Pais (Cookies)', cor: '#f59e0b', icone: 'cake' }
      ];
    }
    // Default para outros tenants: Sócios genéricos ou derivados dos produtos cadastrados
    const distinctSocios = await query(`
      SELECT DISTINCT socio FROM expobai.produtos 
      WHERE tenant_id = $1 AND socio IS NOT NULL AND TRIM(socio) != ''
    `, [tenant_id]);
    if (distinctSocios.rows.length > 0) {
      return distinctSocios.rows.map((r, idx) => ({
        id: r.socio,
        nome: r.socio.charAt(0).toUpperCase() + r.socio.slice(1),
        cor: idx % 3 === 0 ? '#a855f7' : idx % 3 === 1 ? '#10b981' : '#f59e0b',
        icone: 'users'
      }));
    }
    return [
      { id: 'socio_1', nome: 'Sócio 1', cor: '#a855f7', icone: 'users' },
      { id: 'socio_2', nome: 'Sócio 2', cor: '#10b981', icone: 'users' }
    ];
  },

  // 4.2 Salvar lista de sócios da tenda
  async saveSociosLista(socios, tenant_id = 'tenda-muller') {
    await configuracoesRepo.set('rateio_socios_lista', JSON.stringify(socios), tenant_id);
    return this.getSociosLista(tenant_id);
  },

  // 5. Listar todos os produtos e seus respectivos sócios
  async getProdutosSocios(tenant_id = 'tenda-muller') {
    const res = await query(`
      SELECT p.id, p.nome, p.preco, p.socio, p.categoria_id, c.nome as categoria_nome, c.icone as categoria_icone
      FROM expobai.produtos p
      LEFT JOIN expobai.categorias c ON p.categoria_id = c.id
      WHERE p.tenant_id = $1
      ORDER BY p.id ASC
    `, [tenant_id]);
    return res.rows;
  },

  // 6. Atualizar sócio de um produto
  async updateProductSocio(id, socio, tenant_id = 'tenda-muller') {
    const res = await query(`
      UPDATE expobai.produtos
      SET socio = $1
      WHERE id = $2 AND tenant_id = $3
      RETURNING id, nome, preco, socio
    `, [socio, id, tenant_id]);
    return res.rows[0];
  },

  // 7. Auto-classificação padrão
  async autoAtribuirSocios() {
    await query(`
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
    `);
    return this.getProdutosSocios();
  },

  // 8. CÁLCULO GERAL DO RATEIO E LIQUIDAÇÃO CONCILIADA
  async getRelatorioRateio({ data_inicio, data_fim, periodo, tenant_id = 'tenda-muller' } = {}) {
    const tz = await getTenantTimezone(tenant_id);
    let whereConditions = ["p.status = 'concluido'", "p.tenant_id = $1"];
    const params = [tenant_id];

    // Filtros de Data com Timezone configurável por tenant e corte às 06h
    if (data_inicio && data_fim) {
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
      }
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // 0. Buscar lista de sócios configurada para este tenant
    const sociosLista = await this.getSociosLista(tenant_id);
    const sociosMap = {};
    sociosLista.forEach(s => {
      sociosMap[s.id] = {
        id: s.id,
        nome: s.nome,
        papel: s.papel || s.nome,
        icone: s.icone || 'users',
        cor: s.cor || '#a855f7',
        recebe_por: s.recebe_por || (s.id === 'alex' ? 'cartao' : s.id === 'pais' ? 'pix' : 'nenhum'),
        vendas_brutas: 0,
        quantidade_itens: 0,
        custos_atribuidos: 0,
        adiantamentos: 0,
        posse_em_conta: 0,
        direito_liquido: 0,
        saldo_balanco: 0,
        status: 'quitado'
      };
    });

    // A. Buscar todos os custos de evento da tenda
    const custosRows = (await query('SELECT * FROM expobai.custos_evento WHERE tenant_id = $1 ORDER BY id ASC', [tenant_id])).rows;
    let custoTotalEvento = 0;
    let custosPagosDoCaixa = 0;

    custosRows.forEach(c => {
      const v = parseFloat(c.valor) || 0;
      custoTotalEvento += v;

      // Rateio do custo
      if (c.divisao === 'todos') {
        const count = sociosLista.length || 1;
        sociosLista.forEach(s => {
          if (sociosMap[s.id]) sociosMap[s.id].custos_atribuidos += v / count;
        });
      } else if (c.divisao === 'alex_heitor') {
        if (sociosMap['alex'] && sociosMap['heitor']) {
          sociosMap['alex'].custos_atribuidos += v * 0.5;
          sociosMap['heitor'].custos_atribuidos += v * 0.5;
        } else {
          const count = sociosLista.length || 1;
          sociosLista.forEach(s => {
            if (sociosMap[s.id]) sociosMap[s.id].custos_atribuidos += v / count;
          });
        }
      } else if (typeof c.divisao === 'string' && c.divisao.startsWith('somente_')) {
        const target = c.divisao.replace('somente_', '');
        if (sociosMap[target]) {
          sociosMap[target].custos_atribuidos += v;
        } else if (sociosLista[0]) {
          sociosMap[sociosLista[0].id].custos_atribuidos += v;
        }
      } else if (sociosMap[c.divisao]) {
        sociosMap[c.divisao].custos_atribuidos += v;
      } else {
        const count = sociosLista.length || 1;
        sociosLista.forEach(s => {
          if (sociosMap[s.id]) sociosMap[s.id].custos_atribuidos += v / count;
        });
      }

      // Quem pagou/adiantou o custo
      if (c.pago_por === 'caixa') {
        custosPagosDoCaixa += v;
      } else if (sociosMap[c.pago_por]) {
        sociosMap[c.pago_por].adiantamentos += v;
      }
    });

    // B. Buscar mapeamento atual de produtos e sócios da tenda
    const produtosList = (await query('SELECT id, nome, preco, socio FROM expobai.produtos WHERE tenant_id = $1', [tenant_id])).rows;
    const produtosMap = {};
    produtosList.forEach(p => {
      produtosMap[p.id] = p;
    });

    // C. Buscar totais financeiros por forma de pagamento no período
    const pagamentosQuery = `
      SELECT 
        p.id,
        p.numero_pedido,
        p.total,
        p.forma_pagamento,
        p.pagamentos
      FROM expobai.pedidos p
      ${whereClause}
    `;
    const pedidos = (await query(pagamentosQuery, params)).rows;

    let faturamentoTotal = 0;
    let totalPix = 0;
    let totalDinheiro = 0;
    let totalDebito = 0;
    let totalCredito = 0;
    let totalPedidosCount = pedidos.length;

    pedidos.forEach(p => {
      const tot = parseFloat(p.total) || 0;
      faturamentoTotal += tot;

      if (p.pagamentos && Array.isArray(p.pagamentos) && p.pagamentos.length > 0) {
        p.pagamentos.forEach(pg => {
          const v = parseFloat(pg.valor) || 0;
          if (pg.forma === 'pix') totalPix += v;
          else if (pg.forma === 'dinheiro') totalDinheiro += v;
          else if (pg.forma === 'debito') totalDebito += v;
          else if (pg.forma === 'credito') totalCredito += v;
        });
      } else {
        if (p.forma_pagamento === 'pix') totalPix += tot;
        else if (p.forma_pagamento === 'dinheiro') totalDinheiro += tot;
        else if (p.forma_pagamento === 'debito') totalDebito += tot;
        else if (p.forma_pagamento === 'credito') totalCredito += tot;
      }
    });

    const totalCartao = totalDebito + totalCredito;

    // D. Buscar todos os itens vendidos no período para calcular o faturamento real por sócio
    const itensQuery = `
      SELECT 
        pi.id,
        pi.pedido_id,
        pi.produto_id,
        pi.nome_produto,
        pi.quantidade,
        pi.preco_unitario,
        pi.subtotal,
        pi.combo_info
      FROM expobai.pedido_itens pi
      INNER JOIN expobai.pedidos p ON pi.pedido_id = p.id
      ${whereClause}
    `;
    const itens = (await query(itensQuery, params)).rows;

    const defaultSocioId = sociosLista[0]?.id || 'socio_1';
    const resolverSocio = (item) => {
      // 1. Verificar pelo produto_id cadastrado
      if (item.produto_id && produtosMap[item.produto_id]?.socio) {
        const s = produtosMap[item.produto_id].socio;
        if (sociosMap[s]) return s;
      }
      // 2. Análise inteligente por nome (para tenda-muller)
      if (tenant_id === 'tenda-muller') {
        const nome = (item.nome_produto || '').toLowerCase();
        if (nome.includes('espetinho') || nome.includes('carne') || nome.includes('coração') || nome.includes('coracao') || nome.includes('frango') || nome.includes('queijo coalho')) {
          return 'alex';
        }
        if (nome.includes('cookie')) {
          return 'pais';
        }
        if (nome.includes('pão') || nome.includes('pao') || nome.includes('agua') || nome.includes('água') || nome.includes('refri') || nome.includes('refrigerante') || nome.includes('amstel') || nome.includes('heineken') || nome.includes('cerveja') || nome.includes('chopp') || nome.includes('suco') || nome.includes('soda') || nome.includes('carregamento')) {
          return 'heitor';
        }
      }
      return defaultSocioId;
    };

    const detalhesPorProduto = {};

    itens.forEach(it => {
      const sub = parseFloat(it.subtotal) || 0;
      const qtd = parseInt(it.quantidade, 10) || 1;
      const socioId = resolverSocio(it);

      if (sociosMap[socioId]) {
        sociosMap[socioId].vendas_brutas += sub;
        sociosMap[socioId].quantidade_itens += qtd;
      }

      const key = `${socioId}_${it.nome_produto}`;
      if (!detalhesPorProduto[key]) {
        detalhesPorProduto[key] = {
          nome: it.nome_produto,
          socio: socioId,
          socio_nome: sociosMap[socioId]?.nome || socioId,
          quantidade: 0,
          total: 0
        };
      }
      detalhesPorProduto[key].quantidade += qtd;
      detalhesPorProduto[key].total += sub;
    });

    // E. MATEMÁTICA DA CONCILIAÇÃO & POSSE FINANCEIRA
    let cartaoAssigned = false;
    let pixAssigned = false;

    sociosLista.forEach(s => {
      const socio = sociosMap[s.id];
      if (socio.recebe_por === 'cartao') {
        socio.posse_em_conta += totalCartao;
        cartaoAssigned = true;
      } else if (socio.recebe_por === 'pix') {
        socio.posse_em_conta += totalPix;
        pixAssigned = true;
      } else if (socio.recebe_por === 'todos') {
        socio.posse_em_conta += (totalCartao + totalPix);
        cartaoAssigned = true;
        pixAssigned = true;
      }
    });

    if (!cartaoAssigned) {
      if (sociosMap['alex']) {
        sociosMap['alex'].posse_em_conta += totalCartao;
      } else if (sociosLista[0] && sociosMap[sociosLista[0].id]) {
        sociosMap[sociosLista[0].id].posse_em_conta += totalCartao;
      }
    }
    if (!pixAssigned) {
      if (sociosMap['pais']) {
        sociosMap['pais'].posse_em_conta += totalPix;
      } else if (sociosLista[1] && sociosMap[sociosLista[1].id]) {
        sociosMap[sociosLista[1].id].posse_em_conta += totalPix;
      }
    }

    const dinheiroGaveta = totalDinheiro;

    // Calcular Direito Líquido e Balanço para cada sócio
    sociosLista.forEach(s => {
      const socio = sociosMap[s.id];
      socio.direito_liquido = socio.vendas_brutas - socio.custos_atribuidos + socio.adiantamentos;
      socio.saldo_balanco = socio.posse_em_conta - socio.direito_liquido;
      if (socio.saldo_balanco > 0.05) {
        socio.status = 'deve_repassar';
      } else if (socio.saldo_balanco < -0.05) {
        socio.status = 'tem_a_receber';
      } else {
        socio.status = 'quitado';
      }
    });

    // F. ALGORITMO UNIVERSAL DE LIQUIDAÇÃO ÓTIMA (CLEARING HOUSE PASSO A PASSO)
    const passosLiquidacao = [];
    let gavetaDisponivel = dinheiroGaveta;

    const credores = [];
    const devedores = [];

    sociosLista.forEach(s => {
      const socio = sociosMap[s.id];
      if (socio.saldo_balanco < -0.05) {
        credores.push({ id: s.id, nome: socio.nome, valorDevido: Math.abs(socio.saldo_balanco) });
      } else if (socio.saldo_balanco > 0.05) {
        devedores.push({ id: s.id, nome: socio.nome, valorRepassar: socio.saldo_balanco });
      }
    });

    // 1. Abatimento com o Dinheiro da Gaveta
    for (const cred of credores) {
      if (gavetaDisponivel <= 0.01) break;
      if (cred.valorDevido > 0.01) {
        const valorPago = Math.min(gavetaDisponivel, cred.valorDevido);
        passosLiquidacao.push({
          tipo: 'dinheiro_gaveta',
          de: 'Gaveta do Caixa (Dinheiro Físico)',
          para: cred.nome,
          valor: valorPago,
          descricao: `Entregar ${valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em dinheiro da gaveta diretamente para ${cred.nome}.`
        });
        gavetaDisponivel -= valorPago;
        cred.valorDevido -= valorPago;
      }
    }

    // 2. Compensações Diretas entre Devedores e Credores via Transferência / PIX
    for (const dev of devedores) {
      for (const cred of credores) {
        if (dev.valorRepassar <= 0.01) break;
        if (cred.valorDevido <= 0.01) continue;

        const transfer = Math.min(dev.valorRepassar, cred.valorDevido);
        passosLiquidacao.push({
          tipo: 'transferencia_pix',
          de: dev.nome,
          para: cred.nome,
          valor: transfer,
          descricao: `${dev.nome} faz um PIX de ${transfer.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para ${cred.nome}.`
        });
        dev.valorRepassar -= transfer;
        cred.valorDevido -= transfer;
      }
    }

    // Se ainda restar dinheiro na gaveta após quitar todos os créditos
    if (gavetaDisponivel > 0.05) {
      passosLiquidacao.push({
        tipo: 'sobra_gaveta',
        de: 'Gaveta do Caixa',
        para: 'Divisão',
        valor: gavetaDisponivel,
        descricao: `Restante de ${gavetaDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} na gaveta já foi quitado integralmente contra as contas bancárias.`
      });
    }

    // Montar texto pronto para WhatsApp
    const formatCurrency = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let textoWhatsapp = `📊 *FECHAMENTO & RATEIO - ERP EXPOBAI*\n`;
    textoWhatsapp += `━━━━━━━━━━━━━━━━━━━━━\n`;
    textoWhatsapp += `💰 *Faturamento Total:* ${formatCurrency(faturamentoTotal)} (${totalPedidosCount} vendas)\n\n`;
    
    textoWhatsapp += `📈 *FATURAMENTO BRUTO POR SÓCIO:*\n`;
    sociosLista.forEach(s => {
      const sc = sociosMap[s.id];
      textoWhatsapp += `• ${sc.nome}: ${formatCurrency(sc.vendas_brutas)} (${sc.quantidade_itens} un)\n`;
    });
    textoWhatsapp += `\n`;

    textoWhatsapp += `🏢 *CUSTOS FIXOS DO EVENTO:* ${formatCurrency(custoTotalEvento)}\n`;
    custosRows.forEach(c => {
      textoWhatsapp += `• ${c.descricao}: ${formatCurrency(c.valor)}\n`;
    });
    textoWhatsapp += `\n`;

    textoWhatsapp += `💳 *ONDE ESTÁ O DINHEIRO AGORA:*\n`;
    textoWhatsapp += `• Cartão (Débito + Crédito): ${formatCurrency(totalCartao)}\n`;
    textoWhatsapp += `• PIX: ${formatCurrency(totalPix)}\n`;
    textoWhatsapp += `• Dinheiro na Gaveta: ${formatCurrency(totalDinheiro)}\n\n`;

    textoWhatsapp += `⚖️ *DIREITO LÍQUIDO FINAL (Para o bolso de cada um):*\n`;
    sociosLista.forEach(s => {
      const sc = sociosMap[s.id];
      textoWhatsapp += `• ${sc.nome}: *${formatCurrency(sc.direito_liquido)}*\n`;
    });
    textoWhatsapp += `\n`;

    textoWhatsapp += `⚡ *PASSO A PASSO PARA ACERTAR AS CONTAS:*\n`;
    if (passosLiquidacao.length === 0) {
      textoWhatsapp += `✅ Contas já estão perfeitamente equilibradas!\n`;
    } else {
      passosLiquidacao.forEach((p, idx) => {
        textoWhatsapp += `${idx + 1}. ${p.descricao}\n`;
      });
    }
    textoWhatsapp += `━━━━━━━━━━━━━━━━━━━━━\n`;
    textoWhatsapp += `🌾 _Relatório emitido pelo ERP Expobai_`;

    return {
      periodo_informado: periodo || 'customizado',
      data_inicio: data_inicio || null,
      data_fim: data_fim || null,
      totais_gerais: {
        total_pedidos: totalPedidosCount,
        faturamento_total: faturamentoTotal,
        total_pix: totalPix,
        total_dinheiro: totalDinheiro,
        total_debito: totalDebito,
        total_credito: totalCredito,
        total_cartao: totalCartao,
        custo_total_evento: custoTotalEvento,
        lucro_liquido_total: faturamentoTotal - custoTotalEvento
      },
      socios: sociosMap,
      socios_lista: Object.values(sociosMap),
      posse_caixa: {
        dinheiro_gaveta: dinheiroGaveta,
        custos_pagos_caixa: custosPagosDoCaixa
      },
      passos_liquidacao: passosLiquidacao,
      custos_evento: custosRows,
      itens_detalhados: Object.values(detalhesPorProduto),
      texto_whatsapp: textoWhatsapp
    };
  }
};

module.exports = rateioRepository;
