const express = require('express');
const router = express.Router();
const configuracoesRepo = require('../repositories/configuracoesRepository');

// Obter todas as configurações
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'tenda-muller';
    const config = await configuracoesRepo.getAll(tenantId);
    res.json(config);
  } catch (err) {
    console.error('Erro ao buscar configurações:', err);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Salvar configurações
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'tenda-muller';
    const config = await configuracoesRepo.setMany(req.body, tenantId);
    res.json(config);
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

module.exports = router;
