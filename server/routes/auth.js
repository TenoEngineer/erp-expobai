const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuariosRepo = require('../repositories/usuariosRepository');
const tenantsRepo = require('../repositories/tenantsRepository');
const { authenticateToken, JWT_SECRET } = require('../middlewares/auth');

// 1. Login com E-mail e Senha (Administradores e Caixas)
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const usuario = await usuariosRepo.findByEmail(email);
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas: e-mail ou senha incorretos' });
    }

    if (!usuario.tenant_ativo) {
      return res.status(403).json({ error: 'Esta tenda/empresa está inativa ou com licença expirada. Contate o suporte ExpoERP.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas: e-mail ou senha incorretos' });
    }

    // Atualiza último login
    await usuariosRepo.updateLastLogin(usuario.id);

    // Gera token JWT assinado (válido por 12 horas de feira)
    const modulosAtivos = usuario.tenant_modulos || ['core_pos', 'mod_fichas', 'mod_bi_horarios', 'mod_rateio_socios', 'mod_custos_cmv', 'mod_mobile_track'];

    const tokenPayload = {
      id: usuario.id,
      tenant_id: usuario.tenant_id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      tenant_nome: usuario.tenant_nome,
      modulos: modulosAtivos
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      token,
      user: {
        id: usuario.id,
        tenant_id: usuario.tenant_id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        tenant_nome: usuario.tenant_nome,
        tenant_plano: usuario.tenant_plano,
        modulos: modulosAtivos,
        valor_plano: usuario.tenant_valor_plano || 0
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno ao realizar autenticação' });
  }
});

// 2. Login Rápido por PIN do Caixa (Para tablets e celulares de balcão)
router.post('/login-pin', async (req, res) => {
  try {
    const { tenant_id, pin } = req.body;
    if (!tenant_id || !pin) {
      return res.status(400).json({ error: 'Identificador da tenda e PIN são obrigatórios' });
    }

    const usuario = await usuariosRepo.findByPinAndTenant(pin, tenant_id);
    if (!usuario) {
      return res.status(401).json({ error: 'PIN incorreto para esta tenda' });
    }

    if (!usuario.tenant_ativo) {
      return res.status(403).json({ error: 'Esta tenda está suspensa ou inativa' });
    }

    await usuariosRepo.updateLastLogin(usuario.id);

    const modulosAtivos = usuario.tenant_modulos || ['core_pos', 'mod_fichas', 'mod_bi_horarios', 'mod_rateio_socios', 'mod_custos_cmv', 'mod_mobile_track'];

    const tokenPayload = {
      id: usuario.id,
      tenant_id: usuario.tenant_id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      tenant_nome: usuario.tenant_nome,
      modulos: modulosAtivos
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      token,
      user: {
        id: usuario.id,
        tenant_id: usuario.tenant_id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        tenant_nome: usuario.tenant_nome,
        tenant_plano: usuario.tenant_plano,
        modulos: modulosAtivos,
        valor_plano: usuario.tenant_valor_plano || 0
      }
    });
  } catch (err) {
    console.error('Erro no login por PIN:', err);
    res.status(500).json({ error: 'Erro interno ao processar PIN' });
  }
});

// 3. Obter perfil do usuário atual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const usuario = await usuariosRepo.findById(req.user.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const modulosAtivos = usuario.modulos || usuario.tenant_modulos || [];
    res.json({
      ...usuario,
      modulos: modulosAtivos,
      tenant_modulos: modulosAtivos
    });
  } catch (err) {
    console.error('Erro ao obter usuário atual:', err);
    res.status(500).json({ error: 'Erro ao obter dados do usuário' });
  }
});

// 4. Lista pública de tendas ativas (para seletor na tela de login)
router.get('/tenants-public', async (req, res) => {
  try {
    const tenants = await tenantsRepo.listPublicActive();
    res.json(tenants);
  } catch (err) {
    console.error('Erro ao listar tendas públicas:', err);
    res.status(500).json({ error: 'Erro ao listar tendas' });
  }
});

// 5. Alterar própria senha
router.post('/alterar-senha', authenticateToken, async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    if (!senha_atual || !nova_senha) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }
    if (nova_senha.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    }

    const usuario = await usuariosRepo.findByEmail(req.user.email);
    const senhaValida = await bcrypt.compare(senha_atual, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(400).json({ error: 'A senha atual está incorreta' });
    }

    const novaHash = await bcrypt.hash(nova_senha, 12);
    await usuariosRepo.updatePassword(req.user.id, novaHash);

    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).json({ error: 'Erro ao atualizar senha' });
  }
});

module.exports = router;
