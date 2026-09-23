const express = require('express');
const router = express.Router();
const pedidosRepo = require('../repositories/pedidosRepository');
const configuracoesRepo = require('../repositories/configuracoesRepository');
const printerService = require('../services/printerService');

// Criar novo pedido / venda do caixa
router.post('/', async (req, res) => {
  try {
    const { itens, forma_pagamento, valor_pago, troco, observacoes } = req.body;
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'O pedido deve conter pelo menos um item' });
    }
    if (!forma_pagamento) {
      return res.status(400).json({ error: 'Forma de pagamento é obrigatória' });
    }

    const novoPedido = await pedidosRepo.createOrder({
      itens,
      forma_pagamento,
      valor_pago,
      troco,
      observacoes
    });

    // Impressão automática instantânea se configurado Rede ou USB
    try {
      const config = await configuracoesRepo.getAll();
      const autoImprimir = config.impressora_auto_imprimir !== 'false';
      const tipo = (config.impressora_tipo || 'usb').toLowerCase();

      if (autoImprimir && (tipo === 'rede' || tipo === 'usb')) {
        console.log(`🖨️ Disparando impressão automática do pedido #${novoPedido.numero_pedido} via ${tipo.toUpperCase()}...`);
        const printResult = await printerService.printOrder(novoPedido, config);
        novoPedido.impressao = printResult;
      } else {
        novoPedido.impressao = {
          success: true,
          mode: tipo,
          message: tipo === 'navegador' ? 'Impressão automática via navegador' : 'Impressão física inativa'
        };
      }
    } catch (printErr) {
      console.error(`⚠️ Falha na impressão automática do pedido #${novoPedido.numero_pedido}:`, printErr.message);
      novoPedido.impressao = {
        success: false,
        error: printErr.message
      };
    }

    res.status(201).json(novoPedido);
  } catch (err) {
    console.error('Erro ao finalizar pedido:', err);
    res.status(500).json({ error: 'Erro interno ao processar pedido' });
  }
});

// Listar últimos pedidos
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const pedidos = await pedidosRepo.listRecent(limit);
    res.json(pedidos);
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
});

// Obter detalhes de um pedido
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await pedidosRepo.getById(id);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    res.json(pedido);
  } catch (err) {
    console.error('Erro ao buscar pedido:', err);
    res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
});

// Cancelar pedido
router.patch('/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;
    const cancelado = await pedidosRepo.cancelOrder(id);
    if (!cancelado) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    res.json({ message: 'Pedido cancelado com sucesso', pedido: cancelado });
  } catch (err) {
    console.error('Erro ao cancelar pedido:', err);
    res.status(500).json({ error: 'Erro ao cancelar pedido' });
  }
});

module.exports = router;
