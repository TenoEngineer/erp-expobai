const express = require('express');
const router = express.Router();
const relatoriosRepo = require('../repositories/relatoriosRepository');

// Fechamento de caixa e resumo de vendas
router.get('/fechamento', async (req, res) => {
  try {
    const fechamento = await relatoriosRepo.getFechamentoCaixa();
    res.json(fechamento);
  } catch (err) {
    console.error('Erro ao gerar relatório de fechamento de caixa:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

module.exports = router;
