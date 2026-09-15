const express = require('express');
const router = express.Router();
const categoriasRepo = require('../repositories/categoriasRepository');

// Listar categorias ativas (para o PDV)
router.get('/', async (req, res) => {
  try {
    const categorias = await categoriasRepo.listAll();
    res.json(categorias);
  } catch (err) {
    console.error('Erro ao listar categorias:', err);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

// Listar todas as categorias (para o Admin)
router.get('/admin', async (req, res) => {
  try {
    const categorias = await categoriasRepo.listAllAdmin();
    res.json(categorias);
  } catch (err) {
    console.error('Erro ao listar categorias admin:', err);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

// Criar nova categoria
router.post('/', async (req, res) => {
  try {
    const { nome, icone, cor, ordem } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
    }
    const nova = await categoriasRepo.create({ nome, icone, cor, ordem });
    res.status(201).json(nova);
  } catch (err) {
    console.error('Erro ao criar categoria:', err);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// Atualizar categoria
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const atualizada = await categoriasRepo.update(id, req.body);
    if (!atualizada) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    res.json(atualizada);
  } catch (err) {
    console.error('Erro ao atualizar categoria:', err);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// Excluir categoria
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const excluida = await categoriasRepo.delete(id);
    if (!excluida) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir categoria:', err);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

module.exports = router;
