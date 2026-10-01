const { query } = require('../db');

const categoriasRepository = {
  async listAll(tenantId = 'tenda-muller') {
    const res = await query(
      `SELECT * FROM expobai.categorias 
       WHERE ativo = 1 AND tenant_id = $1 
       ORDER BY ordem ASC, nome ASC`,
      [tenantId]
    );
    return res.rows;
  },

  async listAllAdmin(tenantId = 'tenda-muller') {
    const res = await query(
      `SELECT * FROM expobai.categorias 
       WHERE tenant_id = $1 
       ORDER BY ordem ASC, id ASC`,
      [tenantId]
    );
    return res.rows;
  },

  async getById(id, tenantId = null) {
    let sql = `SELECT * FROM expobai.categorias WHERE id = $1`;
    const params = [id];
    if (tenantId) {
      sql += ` AND tenant_id = $2`;
      params.push(tenantId);
    }
    const res = await query(sql, params);
    return res.rows[0] || null;
  },

  async create({ nome, icone = 'utensils', cor = '#2D6A4F', ordem = 0, tenant_id = 'tenda-muller' }) {
    const res = await query(
      `INSERT INTO expobai.categorias (nome, icone, cor, ordem, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nome, icone, cor, Number(ordem) || 0, tenant_id]
    );
    return res.rows[0];
  },

  async update(id, { nome, icone, cor, ordem, ativo }, tenantId = null) {
    let sql = `UPDATE expobai.categorias
       SET nome = COALESCE($1, nome),
           icone = COALESCE($2, icone),
           cor = COALESCE($3, cor),
           ordem = COALESCE($4, ordem),
           ativo = COALESCE($5, ativo)
       WHERE id = $6`;
    const params = [
      nome || null, 
      icone || null, 
      cor || null, 
      ordem !== undefined ? Number(ordem) : null, 
      ativo !== undefined ? Number(ativo) : null, 
      id
    ];
    if (tenantId) {
      sql += ` AND tenant_id = $7`;
      params.push(tenantId);
    }
    sql += ` RETURNING *`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  },

  async delete(id, tenantId = null) {
    let sql = `DELETE FROM expobai.categorias WHERE id = $1`;
    const params = [id];
    if (tenantId) {
      sql += ` AND tenant_id = $2`;
      params.push(tenantId);
    }
    sql += ` RETURNING *`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  }
};

module.exports = categoriasRepository;
