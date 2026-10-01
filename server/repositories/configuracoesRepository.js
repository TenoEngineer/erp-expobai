const { query } = require('../db');

const configuracoesRepository = {
  async getAll(tenantId = 'tenda-muller') {
    const res = await query(
      `SELECT chave, valor FROM expobai.configuracoes WHERE tenant_id = $1`,
      [tenantId]
    );
    const config = {};
    res.rows.forEach(r => {
      config[r.chave] = r.valor;
    });
    return config;
  },

  async get(chave, tenantId = 'tenda-muller') {
    const res = await query(
      `SELECT valor FROM expobai.configuracoes WHERE chave = $1 AND tenant_id = $2`,
      [chave, tenantId]
    );
    return res.rows[0] ? res.rows[0].valor : null;
  },

  async set(chave, valor, tenantId = 'tenda-muller') {
    const res = await query(
      `INSERT INTO expobai.configuracoes (chave, valor, tenant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, chave) DO UPDATE SET valor = EXCLUDED.valor
       RETURNING *`,
      [chave, String(valor), tenantId]
    );
    return res.rows[0];
  },

  async setMany(objectMap, tenantId = 'tenda-muller') {
    for (const [chave, valor] of Object.entries(objectMap)) {
      await this.set(chave, valor, tenantId);
    }
    return this.getAll(tenantId);
  }
};

module.exports = configuracoesRepository;
