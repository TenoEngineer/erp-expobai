const { query } = require('../db');

const categoriasRepository = {
  async listAll() {
    const res = await query(
      `SELECT * FROM expobai.categorias WHERE ativo = 1 ORDER BY ordem ASC, nome ASC`
    );
    return res.rows;
  },

  async listAllAdmin() {
    const res = await query(
      `SELECT * FROM expobai.categorias ORDER BY ordem ASC, id ASC`
    );
    return res.rows;
  },

  async getById(id) {
    const res = await query(
      `SELECT * FROM expobai.categorias WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async create({ nome, icone = 'utensils', cor = '#2D6A4F', ordem = 0 }) {
    const res = await query(
      `INSERT INTO expobai.categorias (nome, icone, cor, ordem)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nome, icone, cor, Number(ordem) || 0]
    );
    return res.rows[0];
  },

  async update(id, { nome, icone, cor, ordem, ativo }) {
    const res = await query(
      `UPDATE expobai.categorias
       SET nome = COALESCE($1, nome),
           icone = COALESCE($2, icone),
           cor = COALESCE($3, cor),
           ordem = COALESCE($4, ordem),
           ativo = COALESCE($5, ativo)
       WHERE id = $6
       RETURNING *`,
      [nome, icone, cor, ordem !== undefined ? Number(ordem) : null, ativo !== undefined ? Number(ativo) : null, id]
    );
    return res.rows[0] || null;
  },

  async delete(id) {
    const res = await query(
      `DELETE FROM expobai.categorias WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.rows[0] || null;
  }
};

module.exports = categoriasRepository;
