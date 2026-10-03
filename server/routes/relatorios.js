const express = require('express');
const router = express.Router();
const relatoriosRepo = require('../repositories/relatoriosRepository');
const { requireModule } = require('../middlewares/auth');

// Fechamento de caixa e resumo de vendas com suporte a filtros de data/período
router.get('/fechamento', async (req, res) => {
  try {
    const { data_inicio, data_fim, periodo, sessao_id } = req.query;
    const tenantId = req.tenantId || 'tenda-muller';
    const fechamento = await relatoriosRepo.getFechamentoCaixa({ 
      data_inicio, 
      data_fim, 
      periodo, 
      sessao_id, 
      tenant_id: tenantId 
    });
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
    const tenantId = req.tenantId || 'tenda-muller';
    const dados = await relatoriosRepo.getLancamentosPorPagamento({
      forma_pagamento,
      data_inicio,
      data_fim,
      periodo,
      sessao_id,
      tenant_id: tenantId
    });
    res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar lançamentos por pagamento:', err);
    res.status(500).json({ error: 'Erro ao buscar lançamentos por pagamento' });
  }
});

// Comparativo de produtos vendidos por hora em relação aos dias da exposição (Exige Módulo BI)
router.get('/comparativo-horarios', requireModule('mod_bi_horarios'), async (req, res) => {
  try {
    const { produto_id, origem } = req.query;
    const tenantId = req.tenantId || 'tenda-muller';
    const dados = await relatoriosRepo.getComparativoHorarios({ 
      produto_id, 
      origem, 
      tenant_id: tenantId 
    });
    res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar comparativo de horários:', err);
    res.status(500).json({ error: 'Erro ao gerar comparativo de horários' });
  }
});

// Análise profunda da cesta de compras, distribuição de SKUs e Cross-Selling (Exige Módulo BI)
router.get('/analise-cesta', requireModule('mod_bi_horarios'), async (req, res) => {
  try {
    const tenantId = req.tenantId || 'tenda-muller';
    const dados = await relatoriosRepo.getAnaliseCesta({ tenant_id: tenantId });
    res.json(dados);
  } catch (err) {
    console.error('Erro ao buscar análise da cesta:', err);
    res.status(500).json({ error: 'Erro ao gerar análise da cesta' });
  }
});

module.exports = router;
