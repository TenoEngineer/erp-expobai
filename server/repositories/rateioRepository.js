const { query } = require('../db');

const rateioRepository = {
  // 1. Obter todos os custos de exposição da feira
  async getCustos() {
    const res = await query('SELECT * FROM expobai.custos_evento ORDER BY id ASC');
    return res.rows;
  },

  // 2. Criar novo custo de exposição
  async createCusto({ descricao, valor, divisao = 'alex_heitor', pago_por = 'caixa', observacoes = null }) {
    const res = await query(`
      INSERT INTO expobai.custos_evento (descricao, valor, divisao, pago_por, observacoes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [descricao, parseFloat(valor) || 0, divisao, pago_por, observacoes]);
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

  // 5. Listar todos os produtos e seus respectivos sócios
  async getProdutosSocios() {
    const res = await query(`
      SELECT p.id, p.nome, p.preco, p.socio, p.categoria_id, c.nome as categoria_nome, c.icone as categoria_icone
      FROM expobai.produtos p
      LEFT JOIN expobai.categorias c ON p.categoria_id = c.id
      ORDER BY p.id ASC
    `);
    return res.rows;
  },

  // 6. Atualizar sócio de um produto
  async updateProductSocio(id, socio) {
    const res = await query(`
      UPDATE expobai.produtos
      SET socio = $1
      WHERE id = $2
      RETURNING id, nome, preco, socio
    `, [socio, id]);
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
  async getRelatorioRateio({ data_inicio, data_fim, periodo } = {}) {
    let whereConditions = ["p.status = 'concluido'"];
    const params = [];

    // Filtros de Data com Timezone de Amambai/MS (America/Campo_Grande) e corte às 06h
    if (data_inicio && data_fim) {
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
      }
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // A. Buscar todos os custos de evento
    const custosRows = (await query('SELECT * FROM expobai.custos_evento ORDER BY id ASC')).rows;
    let custoTotalEvento = 0;
    let custoAlex = 0;
    let custoHeitor = 0;
    let custoPais = 0;
    let custosPagosDoCaixa = 0;
    let adiantamentos = { alex: 0, heitor: 0, pais: 0 };

    custosRows.forEach(c => {
      const v = parseFloat(c.valor) || 0;
      custoTotalEvento += v;

      // Rateio do custo
      if (c.divisao === 'alex_heitor') {
        custoAlex += v * 0.5;
        custoHeitor += v * 0.5;
      } else if (c.divisao === 'todos') {
        custoAlex += v / 3;
        custoHeitor += v / 3;
        custoPais += v / 3;
      } else if (c.divisao === 'somente_alex') {
        custoAlex += v;
      } else if (c.divisao === 'somente_heitor') {
        custoHeitor += v;
      } else if (c.divisao === 'somente_pais') {
        custoPais += v;
      } else {
        // default 50/50 entre Alex e Heitor
        custoAlex += v * 0.5;
        custoHeitor += v * 0.5;
      }

      // Quem pagou/adiantou o custo
      if (c.pago_por === 'caixa') {
        custosPagosDoCaixa += v;
      } else if (c.pago_por === 'alex') {
        adiantamentos.alex += v;
      } else if (c.pago_por === 'heitor') {
        adiantamentos.heitor += v;
      } else if (c.pago_por === 'pais') {
        adiantamentos.pais += v;
      }
    });

    // B. Buscar mapeamento atual de produtos e sócios
    const produtosList = (await query('SELECT id, nome, preco, socio FROM expobai.produtos')).rows;
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

    // Helper para determinar o sócio de um item
    const resolverSocio = (item) => {
      // 1. Verificar pelo produto_id cadastrado
      if (item.produto_id && produtosMap[item.produto_id]?.socio) {
        return produtosMap[item.produto_id].socio;
      }
      // 2. Análise inteligente por nome
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
      return 'heitor'; // Default Heitor
    };

    let vendasAlex = 0;
    let vendasHeitor = 0;
    let vendasPais = 0;
    let itensAlex = 0;
    let itensHeitor = 0;
    let itensPais = 0;

    const detalhesPorProduto = {};

    itens.forEach(it => {
      const sub = parseFloat(it.subtotal) || 0;
      const qtd = parseInt(it.quantidade, 10) || 1;
      const socio = resolverSocio(it);

      if (socio === 'alex') {
        vendasAlex += sub;
        itensAlex += qtd;
      } else if (socio === 'pais') {
        vendasPais += sub;
        itensPais += qtd;
      } else {
        vendasHeitor += sub;
        itensHeitor += qtd;
      }

      const key = `${socio}_${it.nome_produto}`;
      if (!detalhesPorProduto[key]) {
        detalhesPorProduto[key] = {
          nome: it.nome_produto,
          socio,
          quantidade: 0,
          total: 0
        };
      }
      detalhesPorProduto[key].quantidade += qtd;
      detalhesPorProduto[key].total += sub;
    });

    // E. MATEMÁTICA DA CONCILIAÇÃO & POSSE FINANCEIRA
    // Posse Atual: Onde está o dinheiro neste momento?
    // • Cartão (Débito + Crédito): Conta do Alex
    // • PIX: Conta dos Pais
    // • Dinheiro: Gaveta física do Caixa
    // • Heitor: R$ 0,00 em conta
    const posseAlex = totalCartao;
    const possePais = totalPix;
    const posseHeitor = 0;
    const dinheiroGaveta = totalDinheiro;

    // Direito Líquido: O que cada um deve receber de fato (Vendas menos custos)
    const direitoLiquidoAlex = vendasAlex - custoAlex + adiantamentos.alex;
    const direitoLiquidoHeitor = vendasHeitor - custoHeitor + adiantamentos.heitor;
    const direitoLiquidoPais = vendasPais - custoPais + adiantamentos.pais;

    // Balanço de Ajuste (Posse - DireitoLíquido)
    // • Positivo (+): Tem dinheiro a mais na conta -> Deve repassar
    // • Negativo (-): Tem dinheiro a menos na conta -> Tem a receber
    const balancoAlex = posseAlex - direitoLiquidoAlex;
    const balancoPais = possePais - direitoLiquidoPais;
    const balancoHeitor = posseHeitor - direitoLiquidoHeitor; // geralmente negativo (tem a receber)

    // F. ALGORITMO DE LIQUIDAÇÃO ÓTIMA (CLEARING HOUSE PASSO A PASSO)
    // Passo 1: Distribuir o dinheiro em espécie da gaveta para quem tem crédito a receber (prioridade Heitor)
    const passosLiquidacao = [];
    let gavetaDisponivel = dinheiroGaveta;
    let creditoHeitor = Math.max(0, -balancoHeitor);
    let creditoAlex = Math.max(0, -balancoAlex);
    let creditoPais = Math.max(0, -balancoPais);

    let devedorAlex = Math.max(0, balancoAlex);
    let devedorPais = Math.max(0, balancoPais);
    let devedorHeitor = Math.max(0, balancoHeitor);

    // 1. Abatimento com o Dinheiro da Gaveta
    if (gavetaDisponivel > 0) {
      if (creditoHeitor > 0) {
        const valorPagoHeitor = Math.min(gavetaDisponivel, creditoHeitor);
        passosLiquidacao.push({
          tipo: 'dinheiro_gaveta',
          de: 'Gaveta do Caixa (Dinheiro Físico)',
          para: 'Heitor',
          valor: valorPagoHeitor,
          descricao: `Entregar ${valorPagoHeitor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em dinheiro da gaveta diretamente para o Heitor.`
        });
        gavetaDisponivel -= valorPagoHeitor;
        creditoHeitor -= valorPagoHeitor;
      }

      if (gavetaDisponivel > 0 && creditoAlex > 0) {
        const valorPagoAlex = Math.min(gavetaDisponivel, creditoAlex);
        passosLiquidacao.push({
          tipo: 'dinheiro_gaveta',
          de: 'Gaveta do Caixa (Dinheiro Físico)',
          para: 'Alex',
          valor: valorPagoAlex,
          descricao: `Entregar ${valorPagoAlex.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em dinheiro da gaveta diretamente para o Alex.`
        });
        gavetaDisponivel -= valorPagoAlex;
        creditoAlex -= valorPagoAlex;
      }

      if (gavetaDisponivel > 0 && creditoPais > 0) {
        const valorPagoPais = Math.min(gavetaDisponivel, creditoPais);
        passosLiquidacao.push({
          tipo: 'dinheiro_gaveta',
          de: 'Gaveta do Caixa (Dinheiro Físico)',
          para: 'Pais',
          valor: valorPagoPais,
          descricao: `Entregar ${valorPagoPais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em dinheiro da gaveta diretamente para os Pais.`
        });
        gavetaDisponivel -= valorPagoPais;
        creditoPais -= valorPagoPais;
      }
    }

    // 2. Compensações Diretas entre os Sócios via Transferência / PIX
    // Caso 1: Alex é devedor e Heitor ainda tem crédito
    if (devedorAlex > 0 && creditoHeitor > 0) {
      const transfer = Math.min(devedorAlex, creditoHeitor);
      passosLiquidacao.push({
        tipo: 'transferencia_pix',
        de: 'Alex',
        para: 'Heitor',
        valor: transfer,
        descricao: `Alex faz um PIX de ${transfer.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para o Heitor (referente a bebidas/pão recebidos na maquininha).`
      });
      devedorAlex -= transfer;
      creditoHeitor -= transfer;
    }

    // Caso 2: Pais são devedores (excesso de PIX) e Heitor ainda tem crédito
    if (devedorPais > 0 && creditoHeitor > 0) {
      const transfer = Math.min(devedorPais, creditoHeitor);
      passosLiquidacao.push({
        tipo: 'transferencia_pix',
        de: 'Pais',
        para: 'Heitor',
        valor: transfer,
        descricao: `Pais fazem um PIX de ${transfer.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para o Heitor (referente a bebidas/pão recebidos via PIX).`
      });
      devedorPais -= transfer;
      creditoHeitor -= transfer;
    }

    // Caso 3: Pais são devedores (excesso de PIX) e Alex tem crédito
    if (devedorPais > 0 && creditoAlex > 0) {
      const transfer = Math.min(devedorPais, creditoAlex);
      passosLiquidacao.push({
        tipo: 'transferencia_pix',
        de: 'Pais',
        para: 'Alex',
        valor: transfer,
        descricao: `Pais fazem um PIX de ${transfer.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para o Alex (referente a espetinhos recebidos via PIX).`
      });
      devedorPais -= transfer;
      creditoAlex -= transfer;
    }

    // Caso 4: Alex é devedor e Pais têm crédito (caso raro onde cookies foram pagos no cartão)
    if (devedorAlex > 0 && creditoPais > 0) {
      const transfer = Math.min(devedorAlex, creditoPais);
      passosLiquidacao.push({
        tipo: 'transferencia_pix',
        de: 'Alex',
        para: 'Pais',
        valor: transfer,
        descricao: `Alex faz um PIX de ${transfer.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para os Pais (referente a cookies recebidos no cartão).`
      });
      devedorAlex -= transfer;
      creditoPais -= transfer;
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

    let textoWhatsapp = `📊 *FECHAMENTO & RATEIO - TENDA DOS MÜLLER (EXPOBAI)*\n`;
    textoWhatsapp += `━━━━━━━━━━━━━━━━━━━━━\n`;
    textoWhatsapp += `💰 *Faturamento Total:* ${formatCurrency(faturamentoTotal)} (${totalPedidosCount} vendas)\n\n`;
    
    textoWhatsapp += `📈 *FATURAMENTO BRUTO POR SÓCIO:*\n`;
    textoWhatsapp += `🥩 *Alex (Espetinhos):* ${formatCurrency(vendasAlex)} (${itensAlex} un)\n`;
    textoWhatsapp += `🥤 *Heitor (Bebidas/Pão):* ${formatCurrency(vendasHeitor)} (${itensHeitor} un)\n`;
    textoWhatsapp += `🍪 *Pais (Cookies):* ${formatCurrency(vendasPais)} (${itensPais} un)\n\n`;

    textoWhatsapp += `🏢 *CUSTOS FIXOS DA TENDA:* ${formatCurrency(custoTotalEvento)}\n`;
    custosRows.forEach(c => {
      textoWhatsapp += `• ${c.descricao}: ${formatCurrency(c.valor)}\n`;
    });
    textoWhatsapp += `Divisão dos Custos:\n`;
    textoWhatsapp += `• Alex (50%): -${formatCurrency(custoAlex)}\n`;
    textoWhatsapp += `• Heitor (50%): -${formatCurrency(custoHeitor)}\n`;
    textoWhatsapp += `• Pais: Isentos (${formatCurrency(0)})\n\n`;

    textoWhatsapp += `💳 *ONDE ESTÁ O DINHEIRO AGORA:*\n`;
    textoWhatsapp += `• Maquininha Alex (Débito + Crédito): ${formatCurrency(totalCartao)}\n`;
    textoWhatsapp += `• Conta PIX Pais: ${formatCurrency(totalPix)}\n`;
    textoWhatsapp += `• Dinheiro na Gaveta: ${formatCurrency(totalDinheiro)}\n\n`;

    textoWhatsapp += `⚖️ *DIREITO LÍQUIDO FINAL (Para o bolso de cada um):*\n`;
    textoWhatsapp += `• Alex: *${formatCurrency(direitoLiquidoAlex)}*\n`;
    textoWhatsapp += `• Heitor: *${formatCurrency(direitoLiquidoHeitor)}*\n`;
    textoWhatsapp += `• Pais: *${formatCurrency(direitoLiquidoPais)}*\n\n`;

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
      socios: {
        alex: {
          nome: 'Alex',
          papel: 'Espetinhos',
          icone: 'beef',
          vendas_brutas: vendasAlex,
          quantidade_itens: itensAlex,
          custos_atribuidos: custoAlex,
          adiantamentos: adiantamentos.alex,
          direito_liquido: direitoLiquidoAlex,
          posse_em_conta: posseAlex,
          saldo_balanco: balancoAlex, // > 0 deve repassar, < 0 tem a receber
          status: balancoAlex > 0.05 ? 'deve_repassar' : balancoAlex < -0.05 ? 'tem_a_receber' : 'quitado'
        },
        heitor: {
          nome: 'Heitor',
          papel: 'Bebidas & Pão de Queijo',
          icone: 'cup-soda',
          vendas_brutas: vendasHeitor,
          quantidade_itens: itensHeitor,
          custos_atribuidos: custoHeitor,
          adiantamentos: adiantamentos.heitor,
          direito_liquido: direitoLiquidoHeitor,
          posse_em_conta: posseHeitor,
          saldo_balanco: balancoHeitor,
          status: balancoHeitor > 0.05 ? 'deve_repassar' : balancoHeitor < -0.05 ? 'tem_a_receber' : 'quitado'
        },
        pais: {
          nome: 'Pais do Heitor',
          papel: 'Cookies',
          icone: 'cake',
          vendas_brutas: vendasPais,
          quantidade_itens: itensPais,
          custos_atribuidos: custoPais, // 0 por padrão
          adiantamentos: adiantamentos.pais,
          direito_liquido: direitoLiquidoPais,
          posse_em_conta: possePais,
          saldo_balanco: balancoPais,
          status: balancoPais > 0.05 ? 'deve_repassar' : balancoPais < -0.05 ? 'tem_a_receber' : 'quitado'
        }
      },
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
