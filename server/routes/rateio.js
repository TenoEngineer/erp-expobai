const express = require('express');
const router = express.Router();
const rateioRepo = require('../repositories/rateioRepository');
const { requireRole, requireModule } = require('../middlewares/auth');

// Apenas Administrador da Tenda e SuperAdmin podem acessar custos e rateio de sócios
router.use(requireRole('admin', 'superadmin'));

// 1. Relatório consolidado de Rateio e Liquidação (Exige Módulo de Sócios)
router.get('/', requireModule('mod_rateio_socios'), async (req, res) => {
  try {
    const { data_inicio, data_fim, periodo } = req.query;
    const tenantId = req.tenantId || req.user?.tenant_id || 'tenda-muller';
    const relatorio = await rateioRepo.getRelatorioRateio({ data_inicio, data_fim, periodo, tenant_id: tenantId });
    res.json(relatorio);
  } catch (err) {
    console.error('Erro ao calcular relatório de rateio:', err);
    res.status(500).json({ error: 'Erro ao calcular relatório de rateio dos sócios' });
  }
});

// 2. Listar custos da feira
router.get('/custos', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id || 'tenda-muller';
    const custos = await rateioRepo.getCustos(tenantId);
    res.json(custos);
  } catch (err) {
    console.error('Erro ao buscar custos do evento:', err);
    res.status(500).json({ error: 'Erro ao buscar custos' });
  }
});

// 3. Adicionar novo custo da feira
router.post('/custos', async (req, res) => {
  try {
    const { descricao, valor, divisao, pago_por, observacoes } = req.body;
    if (!descricao || valor === undefined) {
      return res.status(400).json({ error: 'Descrição e valor são obrigatórios' });
    }
    const tenantId = req.tenantId || req.user?.tenant_id || 'tenda-muller';
    const novoCusto = await rateioRepo.createCusto({ descricao, valor, divisao, pago_por, observacoes, tenant_id: tenantId });
    res.status(201).json(novoCusto);
  } catch (err) {
    console.error('Erro ao cadastrar custo:', err);
    res.status(500).json({ error: 'Erro ao cadastrar custo' });
  }
});

// 4. Atualizar custo da feira
router.put('/custos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, valor, divisao, pago_por, observacoes } = req.body;
    const atualizado = await rateioRepo.updateCusto(id, { descricao, valor, divisao, pago_por, observacoes });
    if (!atualizado) {
      return res.status(404).json({ error: 'Custo não encontrado' });
    }
    res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar custo:', err);
    res.status(500).json({ error: 'Erro ao atualizar custo' });
  }
});

// 5. Excluir custo da feira
router.delete('/custos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletado = await rateioRepo.deleteCusto(id);
    if (!deletado) {
      return res.status(404).json({ error: 'Custo não encontrado' });
    }
    res.json({ message: 'Custo excluído com sucesso', custo: deletado });
  } catch (err) {
    console.error('Erro ao excluir custo:', err);
    res.status(500).json({ error: 'Erro ao excluir custo' });
  }
});

// 6. Listar produtos e sócios
router.get('/produtos-socios', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id || 'tenda-muller';
    const produtos = await rateioRepo.getProdutosSocios(tenantId);
    res.json(produtos);
  } catch (err) {
    console.error('Erro ao buscar produtos e sócios:', err);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// 7. Atualizar o sócio de um produto
router.put('/produtos-socios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { socio } = req.body;
    if (!socio || !['alex', 'heitor', 'pais'].includes(socio)) {
      return res.status(400).json({ error: 'Sócio inválido. Valores aceitos: alex, heitor, pais' });
    }
    const atualizado = await rateioRepo.updateProductSocio(id, socio);
    res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar sócio do produto:', err);
    res.status(500).json({ error: 'Erro ao atualizar sócio do produto' });
  }
});

// 8. Re-executar auto-atribuição de sócios
router.post('/auto-atribuir', async (req, res) => {
  try {
    const lista = await rateioRepo.autoAtribuirSocios();
    res.json({ message: 'Produtos atribuídos aos respectivos sócios com sucesso!', produtos: lista });
  } catch (err) {
    console.error('Erro na auto-atribuição de produtos:', err);
    res.status(500).json({ error: 'Erro na auto-atribuição' });
  }
});

module.exports = router;
