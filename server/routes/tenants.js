const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const tenantsRepo = require('../repositories/tenantsRepository');
const usuariosRepo = require('../repositories/usuariosRepository');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { MODULOS_CATALOGO } = require('../constants/modulos');

// Todas as rotas de gestão de tenants exigem SuperAdmin
router.use(authenticateToken);
router.use(requireRole('superadmin'));

// 0. Obter catálogo de módulos e preços
router.get('/catalogo-modulos', (req, res) => {
  res.json(MODULOS_CATALOGO);
});

// 1. Listar todas as tendas e métricas
router.get('/', async (req, res) => {
  try {
    const tenants = await tenantsRepo.listAll();
    res.json(tenants);
  } catch (err) {
    console.error('Erro ao listar tenants:', err);
    res.status(500).json({ error: 'Erro ao listar empresas' });
  }
});

// 2. Criar nova tenda + Administrador inicial + Opção de clonar cardápio
router.post('/', async (req, res) => {
  try {
    const { 
      id, 
      nome, 
      responsavel, 
      telefone, 
      documento, 
      plano, 
      valido_ate, 
      modulos,
      valor_plano = 0,
      admin_email, 
      admin_senha, 
      admin_pin = '1234',
      clonar_de = null 
    } = req.body;

    if (!nome || !responsavel || !admin_email || !admin_senha) {
      return res.status(400).json({ error: 'Nome, responsável, e-mail e senha do administrador são obrigatórios' });
    }

    // Cria o tenant com módulos contratados e valor do plano
    const novoTenant = await tenantsRepo.create({
      id,
      nome,
      responsavel,
      telefone,
      documento,
      plano: plano || 'evento',
      valido_ate,
      modulos: modulos || ['core_pos'],
      valor_plano: valor_plano || 0
    });

    // Cria o usuário administrador da tenda
    const senhaHash = await bcrypt.hash(admin_senha, 12);
    const usuarioAdmin = await usuariosRepo.create({
      tenant_id: novoTenant.id,
      nome: responsavel,
      email: admin_email,
      senha_hash: senhaHash,
      pin_acesso_rapido: admin_pin,
      role: 'admin'
    });

    // Opcional: Clona cardápio de uma tenda modelo (ex: 'tenda-muller')
    let cloneResultado = null;
    if (clonar_de) {
      cloneResultado = await tenantsRepo.cloneCardapio(clonar_de, novoTenant.id);
    }

    res.status(201).json({
      message: 'Tenda criada com sucesso!',
      tenant: novoTenant,
      admin: usuarioAdmin,
      clonagem: cloneResultado
    });
  } catch (err) {
    console.error('Erro ao criar tenant:', err);
    if (err.code === '23505') { // Chave única duplicada
      return res.status(409).json({ error: 'Identificador ou e-mail já cadastrado no sistema' });
    }
    res.status(500).json({ error: 'Erro ao cadastrar empresa/tenda' });
  }
});

// 3. Atualizar dados da tenda (status, plano, expiração)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const atualizado = await tenantsRepo.update(id, req.body);
    if (!atualizado) {
      return res.status(404).json({ error: 'Tenda não encontrada' });
    }
    res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar tenant:', err);
    res.status(500).json({ error: 'Erro ao atualizar dados da tenda' });
  }
});

// 4. Clonar cardápio manualmente para uma tenda
router.post('/:id/clonar-cardapio', async (req, res) => {
  try {
    const { id } = req.params;
    const { origem = 'tenda-muller' } = req.body;
    const resultado = await tenantsRepo.cloneCardapio(origem, id);
    res.json({ message: 'Cardápio clonado com sucesso!', ...resultado });
  } catch (err) {
    console.error('Erro ao clonar cardápio:', err);
    res.status(500).json({ error: 'Erro ao clonar cardápio' });
  }
});

// 5. Listar usuários de uma tenda específica
router.get('/:id/usuarios', async (req, res) => {
  try {
    const { id } = req.params;
    const usuarios = await usuariosRepo.listByTenant(id);
    res.json(usuarios);
  } catch (err) {
    console.error('Erro ao listar usuários do tenant:', err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// 6. Adicionar novo usuário/caixa a uma tenda
router.post('/:id/usuarios', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, senha, pin_acesso_rapido, role } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const novoUsuario = await usuariosRepo.create({
      tenant_id: id,
      nome,
      email,
      senha_hash: senhaHash,
      pin_acesso_rapido,
      role: role || 'caixa'
    });

    res.status(201).json(novoUsuario);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'E-mail já está em uso' });
    }
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

module.exports = router;
