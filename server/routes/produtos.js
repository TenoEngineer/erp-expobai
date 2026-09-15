const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const produtosRepo = require('../repositories/produtosRepository');

// Configuração do Multer para upload de imagens
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'prod-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens (jpg, png, webp, gif) são permitidas!'));
  }
});

// Endpoint avulso para upload de imagem
router.post('/upload', upload.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// Listar produtos ativos (para o PDV)
router.get('/', async (req, res) => {
  try {
    const { categoria_id } = req.query;
    const produtos = await produtosRepo.listAll(categoria_id);
    res.json(produtos);
  } catch (err) {
    console.error('Erro ao listar produtos:', err);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

// Listar todos os produtos (para o Admin)
router.get('/admin', async (req, res) => {
  try {
    const produtos = await produtosRepo.listAllAdmin();
    res.json(produtos);
  } catch (err) {
    console.error('Erro ao listar produtos admin:', err);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

// Criar produto
router.post('/', async (req, res) => {
  try {
    const { categoria_id, nome, descricao, preco, foto_url, ordem } = req.body;
    if (!categoria_id || !nome || preco === undefined) {
      return res.status(400).json({ error: 'Categoria, nome e preço são obrigatórios' });
    }
    const novoProduto = await produtosRepo.create({
      categoria_id,
      nome,
      descricao,
      preco,
      foto_url,
      ordem
    });
    res.status(201).json(novoProduto);
  } catch (err) {
    console.error('Erro ao criar produto:', err);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// Atualizar produto completo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const atualizado = await produtosRepo.update(id, req.body);
    if (!atualizado) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// Atualizar apenas o preço
router.patch('/:id/preco', async (req, res) => {
  try {
    const { id } = req.params;
    const { preco } = req.body;
    if (preco === undefined) {
      return res.status(400).json({ error: 'Preço é obrigatório' });
    }
    const atualizado = await produtosRepo.updatePrice(id, preco);
    if (!atualizado) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar preço:', err);
    res.status(500).json({ error: 'Erro ao atualizar preço' });
  }
});

// Alternar status ativo/inativo
router.patch('/:id/toggle-ativo', async (req, res) => {
  try {
    const { id } = req.params;
    const atualizado = await produtosRepo.toggleAtivo(id);
    if (!atualizado) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(atualizado);
  } catch (err) {
    console.error('Erro ao alternar status do produto:', err);
    res.status(500).json({ error: 'Erro ao alternar status do produto' });
  }
});

// Excluir produto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const excluido = await produtosRepo.delete(id);
    if (!excluido) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json({ message: 'Produto excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir produto:', err);
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

module.exports = router;
