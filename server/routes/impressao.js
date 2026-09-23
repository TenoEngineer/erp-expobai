const express = require('express');
const router = express.Router();
const printerService = require('../services/printerService');
const configuracoesRepo = require('../repositories/configuracoesRepository');
const pedidosRepo = require('../repositories/pedidosRepository');

/**
 * Listar impressoras instaladas no sistema (Windows .NET ou Linux /dev/usb/lp* / CUPS)
 */
router.get('/printers', async (req, res) => {
  try {
    const printers = await printerService.getAvailablePrinters();
    res.json({ printers, platform: printerService.platform });
  } catch (err) {
    console.error('Erro ao listar impressoras:', err);
    res.status(500).json({ error: 'Erro ao listar impressoras do sistema' });
  }
});

/**
 * Testar impressão física (Rede ou USB)
 */
router.post('/teste', async (req, res) => {
  try {
    const storedConfig = await configuracoesRepo.getAll();
    const config = { ...storedConfig, ...req.body };

    const result = await printerService.testPrinter(config);
    res.json(result);
  } catch (err) {
    console.error('Erro no teste de impressão:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * Imprimir pedido sob demanda ou re-impressão
 */
router.post('/imprimir', async (req, res) => {
  try {
    const { pedidoId, pedido } = req.body;
    let order = pedido;

    if (!order && pedidoId) {
      order = await pedidosRepo.getById(pedidoId);
    }

    if (!order) {
      return res.status(404).json({ error: 'Pedido não informado ou não encontrado' });
    }

    const config = await configuracoesRepo.getAll();
    const result = await printerService.printOrder(order, config);

    res.json(result);
  } catch (err) {
    console.error('Erro ao imprimir pedido:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
