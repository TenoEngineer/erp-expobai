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

    // Feature Gating: Se o estande não contratou mod_custos_cmv, sanitiza custos e lucros para evitar vazamento
    const tenantModulos = req.user?.modulos || [];
    const isSuperAdmin = req.user?.role === 'superadmin';
    const hasCustos = isSuperAdmin || tenantModulos.includes('mod_custos_cmv');

    if (!hasCustos && fechamento) {
      if (fechamento.indicadores) {
        delete fechamento.indicadores.custo_total_produtos;
        delete fechamento.indicadores.lucro_bruto_total;
        delete fechamento.indicadores.margem_lucro_media_pct;
      }
      if (Array.isArray(fechamento.rankingProdutos)) {
        fechamento.rankingProdutos = fechamento.rankingProdutos.map(p => {
          const { preco_custo, custo_total, lucro_bruto, margem_lucro_pct, ...rest } = p;
          return rest;
        });
      }
      if (Array.isArray(fechamento.mixCategorias)) {
        fechamento.mixCategorias = fechamento.mixCategorias.map(c => {
          const { custo_total, lucro_bruto, ...rest } = c;
          return rest;
        });
      }
    }

    res.json(fechamento);
  } catch (err) {
    console.error('Erro ao gerar relatório de fechamento de caixa:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// Relatório detalhado de todos os lançamentos por tipo de pagamento para conciliação (Exige mod_custos_cmv ou mod_rateio_socios)
router.get('/lancamentos-pagamento', requireModule('mod_custos_cmv', 'mod_rateio_socios'), async (req, res) => {
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
