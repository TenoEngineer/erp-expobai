const { query } = require('../db');

const configuracoesRepository = {
  async getAll() {
    const res = await query(`SELECT chave, valor FROM expobai.configuracoes`);
    const config = {};
    res.rows.forEach(r => {
      config[r.chave] = r.valor;
    });
    return config;
  },

  async get(chave) {
    const res = await query(
      `SELECT valor FROM expobai.configuracoes WHERE chave = $1`,
      [chave]
    );
    return res.rows[0] ? res.rows[0].valor : null;
  },

  async set(chave, valor) {
    const res = await query(
      `INSERT INTO expobai.configuracoes (chave, valor)
       VALUES ($1, $2)
       ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
       RETURNING *`,
      [chave, String(valor)]
    );
    return res.rows[0];
  },

  async setMany(objectMap) {
    for (const [chave, valor] of Object.entries(objectMap)) {
      await this.set(chave, valor);
    }
    return this.getAll();
  }
};

module.exports = configuracoesRepository;
