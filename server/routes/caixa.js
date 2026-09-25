const express = require('express');
const router = express.Router();
const caixaRepo = require('../repositories/caixaRepository');

// Status atual do caixa (sessão aberta e valores acumulados)
router.get('/status', async (req, res) => {
  try {
    const sessaoAberta = await caixaRepo.getSessaoAberta();
    res.json({
      is_aberto: Boolean(sessaoAberta),
      sessao: sessaoAberta
    });
  } catch (err) {
    console.error('Erro ao consultar status do caixa:', err);
    res.status(500).json({ error: 'Erro ao consultar status do caixa' });
  }
});

// Abertura de caixa (início de turno com fundo de troco)
router.post('/abrir', async (req, res) => {
  try {
    const { operador, valor_abertura, observacoes } = req.body;
    const novaSessao = await caixaRepo.abrirCaixa({
      operador: operador || 'Operador Caixa',
      valor_abertura: parseFloat(valor_abertura) || 0,
      observacoes: observacoes || ''
    });
    res.status(201).json({
      message: 'Caixa aberto com sucesso!',
      sessao: novaSessao
    });
  } catch (err) {
    console.error('Erro ao abrir caixa:', err);
    res.status(500).json({ error: err.message || 'Erro ao abrir caixa' });
  }
});

// Fechamento de caixa (conferência física e encerramento de turno)
router.post('/fechar', async (req, res) => {
  try {
    const { valor_fechamento_dinheiro, observacoes } = req.body;
    const resultado = await caixaRepo.fecharCaixa({
      valor_fechamento_dinheiro,
      observacoes
    });
    res.json({
      message: 'Caixa encerrado com sucesso!',
      resultado
    });
  } catch (err) {
    console.error('Erro ao fechar caixa:', err);
    res.status(400).json({ error: err.message || 'Erro ao fechar caixa' });
  }
});

// Histórico de turnos encerrados
router.get('/historico', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const historico = await caixaRepo.listarHistorico(limit);
    res.json(historico);
  } catch (err) {
    console.error('Erro ao listar histórico de caixas:', err);
    res.status(500).json({ error: 'Erro ao listar histórico de caixas' });
  }
});

module.exports = router;
