const { query } = require('../db');

const caixaRepository = {
  // Obter sessão de caixa aberta atual com métricas em tempo real
  async getSessaoAberta() {
    let res = await query(`
      SELECT * FROM expobai.sessoes_caixa 
      WHERE status = 'aberto' 
      ORDER BY id DESC 
      LIMIT 1
    `);
    
    // Se não houver caixa aberto, cria um automaticamente desde o primeiro pedido (ou NOW)
    if (res.rows.length === 0) {
      const minPedidoRes = await query('SELECT MIN(data_hora) as primeiro_pedido FROM expobai.pedidos');
      const dataInicio = minPedidoRes.rows[0]?.primeiro_pedido || new Date();
      
      const newSessao = await query(`
        INSERT INTO expobai.sessoes_caixa (operador, valor_abertura, status, aberto_em, observacoes)
        VALUES ('Caixa Principal', 0, 'aberto', $1, 'Abertura inicial do caixa')
        RETURNING *
      `, [dataInicio]);
      res = newSessao;
    }

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

  async abrirCaixa({ operador = 'Caixa Principal', valor_abertura = 0, observacoes = '' }) {
    // Fecha qualquer caixa aberto anteriormente para manter integridade
    await query(`
      UPDATE expobai.sessoes_caixa 
      SET status = 'fechado', fechado_em = CURRENT_TIMESTAMP 
      WHERE status = 'aberto'
    `);

    const res = await query(`
      INSERT INTO expobai.sessoes_caixa (operador, valor_abertura, status, aberto_em, observacoes)
      VALUES ($1, $2, 'aberto', CURRENT_TIMESTAMP, $3)
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

    // 1. Encerra o caixa atual
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

    // 2. Abre imediatamente um novo caixa para as próximas vendas continuarem livremente
    const novoCaixa = await query(`
      INSERT INTO expobai.sessoes_caixa (operador, valor_abertura, status, aberto_em, observacoes)
      VALUES ($1, 0, 'aberto', CURRENT_TIMESTAMP, 'Aberto automaticamente após fechamento do Caixa #' || $2)
      RETURNING *
    `, [aberta.operador || 'Caixa Principal', aberta.id]);

    return {
      sessao_fechada: res.rows[0],
      nova_sessao: novoCaixa.rows[0],
      resumo: {
        ...aberta.totais,
        valor_contado: valorContado,
        diferenca_gaveta: diferenca
      }
    };
  },

  async listarHistorico(limit = 30) {
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
      GROUP BY s.id
      ORDER BY s.id DESC 
      LIMIT $1
    `, [limit]);
    return res.rows;
  }
};

module.exports = caixaRepository;
