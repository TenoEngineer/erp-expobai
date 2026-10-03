const { query } = require('../db');

const usuariosRepository = {
  async findByEmail(email) {
    const res = await query(
      `SELECT u.*, t.nome as tenant_nome, t.ativo as tenant_ativo, t.plano as tenant_plano, 
              t.valido_ate as tenant_valido_ate, t.modulos as tenant_modulos, t.modulos as modulos, t.valor_plano as tenant_valor_plano
       FROM expobai.usuarios u
       JOIN expobai.tenants t ON u.tenant_id = t.id
       WHERE LOWER(u.email) = LOWER(TRIM($1)) AND u.ativo = true
       LIMIT 1`,
      [email]
    );
    return res.rows[0] || null;
  },

  async findByPinAndTenant(pin, tenantId) {
    const res = await query(
      `SELECT u.*, t.nome as tenant_nome, t.ativo as tenant_ativo, t.plano as tenant_plano, 
              t.valido_ate as tenant_valido_ate, t.modulos as tenant_modulos, t.modulos as modulos, t.valor_plano as tenant_valor_plano
       FROM expobai.usuarios u
       JOIN expobai.tenants t ON u.tenant_id = t.id
       WHERE u.pin_acesso_rapido = $1 AND u.tenant_id = $2 AND u.ativo = true
       LIMIT 1`,
      [pin, tenantId]
    );
    return res.rows[0] || null;
  },

  async findById(id) {
    const res = await query(
      `SELECT u.id, u.tenant_id, u.nome, u.email, u.pin_acesso_rapido, u.role, u.ativo, u.criado_em,
              t.nome as tenant_nome, t.ativo as tenant_ativo, t.plano as tenant_plano,
              t.modulos as tenant_modulos, t.modulos as modulos, t.valor_plano as tenant_valor_plano
       FROM expobai.usuarios u
       JOIN expobai.tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async updateLastLogin(id) {
    await query(
      `UPDATE expobai.usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  },

  async create({ tenant_id, nome, email, senha_hash, pin_acesso_rapido = null, role = 'caixa' }) {
    const res = await query(
      `INSERT INTO expobai.usuarios (tenant_id, nome, email, senha_hash, pin_acesso_rapido, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, tenant_id, nome, email, pin_acesso_rapido, role, ativo, criado_em`,
      [tenant_id, nome, email.toLowerCase().trim(), senha_hash, pin_acesso_rapido, role]
    );
    return res.rows[0];
  },

  async listByTenant(tenantId) {
    const res = await query(
      `SELECT id, tenant_id, nome, email, pin_acesso_rapido, role, ativo, ultimo_login, criado_em
       FROM expobai.usuarios
       WHERE tenant_id = $1
       ORDER BY role ASC, nome ASC`,
      [tenantId]
    );
    return res.rows;
  },

  async updatePassword(id, senha_hash) {
    const res = await query(
      `UPDATE expobai.usuarios SET senha_hash = $1 WHERE id = $2 RETURNING id, email`,
      [senha_hash, id]
    );
    return res.rows[0] || null;
  }
};

module.exports = usuariosRepository;
