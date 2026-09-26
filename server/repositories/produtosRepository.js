const { query } = require('../db');

const produtosRepository = {
  async listAll(categoriaId = null) {
    let sql = `
      SELECT p.*, c.nome as categoria_nome, c.cor as categoria_cor, c.icone as categoria_icone
      FROM expobai.produtos p
      JOIN expobai.categorias c ON p.categoria_id = c.id
      WHERE p.ativo = 1 AND c.ativo = 1
    `;
    const params = [];
    if (categoriaId) {
      params.push(Number(categoriaId));
      sql += ` AND p.categoria_id = $1`;
    }
    sql += ` ORDER BY p.ordem ASC, p.nome ASC`;
    const res = await query(sql, params);
    return res.rows;
  },

  async listAllAdmin() {
    const sql = `
      SELECT p.*, c.nome as categoria_nome, c.cor as categoria_cor, c.icone as categoria_icone
      FROM expobai.produtos p
      LEFT JOIN expobai.categorias c ON p.categoria_id = c.id
      ORDER BY c.ordem ASC, p.ordem ASC, p.id ASC
    `;
    const res = await query(sql);
    return res.rows;
  },

  async getById(id) {
    const res = await query(
      `SELECT p.*, c.nome as categoria_nome, c.cor as categoria_cor
       FROM expobai.produtos p
       JOIN expobai.categorias c ON p.categoria_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async create({ categoria_id, nome, descricao = '', preco, preco_custo = 0, foto_url = '', ordem = 0 }) {
    const res = await query(
      `INSERT INTO expobai.produtos (categoria_id, nome, descricao, preco, preco_custo, foto_url, ordem)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [Number(categoria_id), nome, descricao, parseFloat(preco), parseFloat(preco_custo) || 0, foto_url, Number(ordem) || 0]
    );
    return res.rows[0];
  },

  async update(id, { categoria_id, nome, descricao, preco, preco_custo, foto_url, ativo, ordem }) {
    const res = await query(
      `UPDATE expobai.produtos
       SET categoria_id = COALESCE($1, categoria_id),
           nome = COALESCE($2, nome),
           descricao = COALESCE($3, descricao),
           preco = COALESCE($4, preco),
           preco_custo = COALESCE($5, preco_custo),
           foto_url = COALESCE($6, foto_url),
           ativo = COALESCE($7, ativo),
           ordem = COALESCE($8, ordem)
       WHERE id = $9
       RETURNING *`,
      [
        categoria_id !== undefined ? Number(categoria_id) : null,
        nome || null,
        descricao !== undefined ? descricao : null,
        preco !== undefined ? parseFloat(preco) : null,
        preco_custo !== undefined ? parseFloat(preco_custo) : null,
        foto_url !== undefined ? foto_url : null,
        ativo !== undefined ? Number(ativo) : null,
        ordem !== undefined ? Number(ordem) : null,
        id
      ]
    );
    return res.rows[0] || null;
  },

  async updatePrice(id, preco) {
    const res = await query(
      `UPDATE expobai.produtos SET preco = $1 WHERE id = $2 RETURNING *`,
      [parseFloat(preco), id]
    );
    return res.rows[0] || null;
  },

  async toggleAtivo(id) {
    const res = await query(
      `UPDATE expobai.produtos SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.rows[0] || null;
  },

  async delete(id) {
    const res = await query(
      `DELETE FROM expobai.produtos WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.rows[0] || null;
  }
};

module.exports = produtosRepository;
