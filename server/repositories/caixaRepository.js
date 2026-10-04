const { query } = require('../db');

const caixaRepository = {
  // Obter sessão de caixa aberta atual com métricas em tempo real por tenant
  async getSessaoAberta(tenantId = 'tenda-muller') {
    let res = await query(`
      SELECT * FROM expobai.sessoes_caixa 
      WHERE status = 'aberto' AND tenant_id = $1
      ORDER BY id DESC 
      LIMIT 1
    `, [tenantId]);
    
    // Se não houver caixa aberto no momento, retorna null (caixa fechado)
    if (res.rows.length === 0) {
      return null;
    }

    const sessao = res.rows[0];
    
    // Obter totais de vendas realizadas desde a abertura desta sessão para o tenant
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
      WHERE p.status = 'concluido' AND p.data_hora >= $1 AND p.tenant_id = $2
    `, [sessao.aberto_em, tenantId]);

    const t = totaisRes.rows[0];
    const valorAbertura = parseFloat(sessao.valor_abertura) || 0;
    const totalDinheiro = parseFloat(t.total_dinheiro) || 0;
    const totalTroco = parseFloat(t.total_troco) || 0;
    const totalPix = parseFloat(t.total_pix) || 0;
    const totalDebito = parseFloat(t.total_debito) || 0;
    const totalCredito = parseFloat(t.total_credito) || 0;
    const faturamentoTotal = parseFloat(t.faturamento_total) || 0;
    const totalPedidos = parseInt(t.total_pedidos, 10) || 0;

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

  async abrirCaixa({ operador = 'Caixa Principal', valor_abertura = 0, observacoes = '', tenant_id = 'tenda-muller' }) {
    // Fecha qualquer caixa aberto anteriormente para este tenant
    await query(`
      UPDATE expobai.sessoes_caixa 
      SET status = 'fechado', fechado_em = CURRENT_TIMESTAMP 
      WHERE status = 'aberto' AND tenant_id = $1
    `, [tenant_id]);

    const res = await query(`
      INSERT INTO expobai.sessoes_caixa (operador, valor_abertura, status, aberto_em, observacoes, tenant_id)
      VALUES ($1, $2, 'aberto', CURRENT_TIMESTAMP, $3, $4)
      RETURNING *
    `, [operador, parseFloat(valor_abertura) || 0, observacoes || null, tenant_id]);

    return res.rows[0];
  },

  async fecharCaixa({ valor_fechamento_dinheiro = null, observacoes = '', tenant_id = 'tenda-muller' }) {
    const aberta = await this.getSessaoAberta(tenant_id);
    if (!aberta) {
      throw new Error('Nenhum caixa está aberto no momento');
    }

    const valorContado = valor_fechamento_dinheiro !== null ? parseFloat(valor_fechamento_dinheiro) : null;
    const saldoEsperado = aberta.totais.saldo_esperado_gaveta;
    const diferenca = valorContado !== null ? Math.round((valorContado - saldoEsperado) * 100) / 100 : 0;

    // Encerra o caixa atual e NÃO abre automaticamente outro. O caixa permanece fechado até abertura explícita.
    const res = await query(`
      UPDATE expobai.sessoes_caixa 
      SET 
        status = 'fechado', 
        fechado_em = CURRENT_TIMESTAMP, 
        valor_fechamento_dinheiro = $1,
        observacoes = COALESCE(observacoes, '') || ' ' || $2
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `, [valorContado, observacoes ? `[Fechamento: ${observacoes}]` : '', aberta.id, tenant_id]);

    return {
      sessao_fechada: res.rows[0],
      resumo: {
        ...aberta.totais,
        valor_contado: valorContado,
        diferenca_gaveta: diferenca
      }
    };
  },

  async listarHistorico(limit = 30, tenantId = 'tenda-muller') {
    const res = await query(`
      SELECT 
        s.*,
        to_char(s.aberto_em AT TIME ZONE 'America/Campo_Grande', 'DD/MM/YYYY HH24:MI') as aberto_em_ms,
        to_char(s.fechado_em AT TIME ZONE 'America/Campo_Grande', 'DD/MM/YYYY HH24:MI') as fechado_em_ms,
        COUNT(p.id) as total_pedidos,
        COALESCE(SUM(p.total), 0) as faturamento_total
      FROM expobai.sessoes_caixa s
      LEFT JOIN expobai.pedidos p ON p.status = 'concluido' 
        AND p.data_hora >= s.aberto_em 
        AND (s.fechado_em IS NULL OR p.data_hora <= s.fechado_em)
        AND p.tenant_id = s.tenant_id
      WHERE s.tenant_id = $2
      GROUP BY s.id
      ORDER BY s.id DESC 
      LIMIT $1
    `, [limit, tenantId]);
    return res.rows;
  }
};

module.exports = caixaRepository;
