const express = require('express');
const router = express.Router();
const relatoriosRepo = require('../repositories/relatoriosRepository');

// Fechamento de caixa e resumo de vendas com suporte a filtros de data/período
router.get('/fechamento', async (req, res) => {
  try {
    const { data_inicio, data_fim, periodo, sessao_id } = req.query;
    const fechamento = await relatoriosRepo.getFechamentoCaixa({ data_inicio, data_fim, periodo, sessao_id });
    res.json(fechamento);
  } catch (err) {
    console.error('Erro ao gerar relatório de fechamento de caixa:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// Relatório detalhado de todos os lançamentos por tipo de pagamento para conciliação (Pix, Débito, Crédito, Dinheiro)
router.get('/lancamentos-pagamento', async (req, res) => {
  try {
    const { forma_pagamento, data_inicio, data_fim, periodo, sessao_id } = req.query;
    const dados = await relatoriosRepo.getLancamentosPorPagamento({
      forma_pagamento,
      data_inicio,
      data_fim,
      periodo,
      sessao_id
    });
    res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar lançamentos por pagamento:', err);
    res.status(500).json({ error: 'Erro ao buscar lançamentos por pagamento' });
  }
});

// Comparativo de produtos vendidos por hora em relação aos dias da exposição
router.get('/comparativo-horarios', async (req, res) => {
  try {
    const { produto_id, origem } = req.query;
    const dados = await relatoriosRepo.getComparativoHorarios({ produto_id, origem });
    res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar comparativo de horários:', err);
    res.status(500).json({ error: 'Erro ao gerar comparativo de horários' });
  }
});

module.exports = router;
