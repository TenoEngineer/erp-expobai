const express = require('express');
const router = express.Router();
const relatoriosRepo = require('../repositories/relatoriosRepository');

// Fechamento de caixa e resumo de vendas com suporte a filtros de data/período
router.get('/fechamento', async (req, res) => {
  try {
    const { data_inicio, data_fim, periodo } = req.query;
    const fechamento = await relatoriosRepo.getFechamentoCaixa({ data_inicio, data_fim, periodo });
    res.json(fechamento);
  } catch (err) {
    console.error('Erro ao gerar relatório de fechamento de caixa:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

module.exports = router;
