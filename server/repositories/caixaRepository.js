const { query } = require('../db');

const caixaRepository = {
  // Obter sessão de caixa aberta atual com métricas em tempo real
  async getSessaoAberta() {
    const res = await query(`
      SELECT * FROM expobai.sessoes_caixa 
      WHERE status = 'aberto' 
      ORDER BY id DESC 
      LIMIT 1
    `);
    if (res.rows.length === 0) return null;

    const sessao = res.rows[0];
    
    // Obter totais de vendas realizadas desde a abertura desta sessão
    const totaisRes = await query(`
      SELECT 
        COUNT(p.id) as total_pedidos,
        COALESCE(SUM(p.total), 0) as faturamento_total,
        COALESCE(SUM(p.troco), 0) as total_troco,
        COALESCE(SUM(CASE WHEN p.forma_pagamento = 'dinheiro' THEN p.total ELSE 0 END), 0) as total_dinheiro,
        COALESCE(SUM(CASE WHEN p.forma_pagamento = 'pix' THEN p.total ELSE 0 END), 0) as total_pix,
        COALESCE(SUM(CASE WHEN p.forma_pagamento = 'debito' THEN p.total ELSE 0 END), 0) as total_debito,
        COALESCE(SUM(CASE WHEN p.forma_pagamento = 'credito' THEN p.total ELSE 0 END), 0) as total_credito
      FROM expobai.pedidos p
      WHERE p.status = 'concluido' AND p.data_hora >= $1
    `, [sessao.aberto_em]);

    const t = totaisRes.rows[0];
    const valorAbertura = parseFloat(sessao.valor_abertura) || 0;
    const totalDinheiro = parseFloat(t.total_dinheiro) || 0;
    const totalTroco = parseFloat(t.total_troco) || 0;
    const totalPix = parseFloat(t.total_pix) || 0;
    const totalDebito = parseFloat(t.total_debito) || 0;
    const totalCredito = parseFloat(t.total_credito) || 0;
    const faturamentoTotal = parseFloat(t.faturamento_total) || 0;
    const totalPedidos = parseInt(t.total_pedidos, 10) || 0;

    // Dinheiro que deve estar fisicamente na gaveta:
    // Fundo de troco inicial + Total vendido em dinheiro
    const saldoEsperadoGaveta = valorAbertura + totalDinheiro;

    return {
      ...sessao,
      totais: {
        total_pedidos: totalPedidos,
        faturamento_total: faturamentoTotal,
        total_dinheiro: totalDinheiro,
        total_pix: totalPix,
        total_debito: totalDebito,
        total_credito: totalCredito,
        total_troco: totalTroco,
        saldo_esperado_gaveta: saldoEsperadoGaveta
      }
    };
  },

  async abrirCaixa({ operador = 'Operador Caixa', valor_abertura = 0, observacoes = '' }) {
    // Se já houver caixa aberto, fecha o anterior para evitar sessões órfãs
    await query(`
      UPDATE expobai.sessoes_caixa 
      SET status = 'fechado', fechado_em = CURRENT_TIMESTAMP 
      WHERE status = 'aberto'
    `);

    const res = await query(`
      INSERT INTO expobai.sessoes_caixa (operador, valor_abertura, status, observacoes)
      VALUES ($1, $2, 'aberto', $3)
      RETURNING *
    `, [operador, parseFloat(valor_abertura) || 0, observacoes || null]);

    return res.rows[0];
  },

  async fecharCaixa({ valor_fechamento_dinheiro = null, observacoes = '' }) {
    const aberta = await this.getSessaoAberta();
    if (!aberta) {
      throw new Error('Nenhum caixa está aberto no momento');
    }

    const valorContado = valor_fechamento_dinheiro !== null ? parseFloat(valor_fechamento_dinheiro) : null;
    const saldoEsperado = aberta.totais.saldo_esperado_gaveta;
    const diferenca = valorContado !== null ? (valorContado - saldoEsperado) : 0;

    const res = await query(`
      UPDATE expobai.sessoes_caixa 
      SET 
        status = 'fechado', 
        fechado_em = CURRENT_TIMESTAMP, 
        valor_fechamento_dinheiro = $1,
        observacoes = COALESCE(observacoes, '') || ' ' || $2
      WHERE id = $3
      RETURNING *
    `, [valorContado, observacoes ? `[Fechamento: ${observacoes}]` : '', aberta.id]);

    return {
      sessao: res.rows[0],
      resumo: {
        ...aberta.totais,
        valor_contado: valorContado,
        diferenca_gaveta: diferenca
      }
    };
  },

  async listarHistorico(limit = 10) {
    const res = await query(`
      SELECT * FROM expobai.sessoes_caixa 
      ORDER BY id DESC 
      LIMIT $1
    `, [limit]);
    return res.rows;
  }
};

module.exports = caixaRepository;
