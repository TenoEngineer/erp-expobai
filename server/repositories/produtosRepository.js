const { query } = require('../db');

const produtosRepository = {
  async listAll(categoriaId = null, tenantId = 'tenda-muller') {
    let sql = `
      SELECT p.*, c.nome as categoria_nome, c.cor as categoria_cor, c.icone as categoria_icone
      FROM expobai.produtos p
      JOIN expobai.categorias c ON p.categoria_id = c.id
      WHERE p.ativo = 1 AND c.ativo = 1 AND p.tenant_id = $1
    `;
    const params = [tenantId];
    if (categoriaId) {
      params.push(Number(categoriaId));
      sql += ` AND p.categoria_id = $2`;
    }
    sql += ` ORDER BY p.ordem ASC, p.nome ASC`;
    const res = await query(sql, params);
    return res.rows;
  },

  async listAllAdmin(tenantId = 'tenda-muller') {
    const sql = `
      SELECT p.*, c.nome as categoria_nome, c.cor as categoria_cor, c.icone as categoria_icone
      FROM expobai.produtos p
      LEFT JOIN expobai.categorias c ON p.categoria_id = c.id
      WHERE p.tenant_id = $1
      ORDER BY c.ordem ASC, p.ordem ASC, p.id ASC
    `;
    const res = await query(sql, [tenantId]);
    return res.rows;
  },

  async getById(id, tenantId = null) {
    let sql = `
      SELECT p.*, c.nome as categoria_nome, c.cor as categoria_cor
      FROM expobai.produtos p
      JOIN expobai.categorias c ON p.categoria_id = c.id
      WHERE p.id = $1
    `;
    const params = [id];
    if (tenantId) {
      sql += ` AND p.tenant_id = $2`;
      params.push(tenantId);
    }
    const res = await query(sql, params);
    return res.rows[0] || null;
  },

  async create({ categoria_id, nome, descricao = '', preco, preco_custo = 0, foto_url = '', ordem = 0, combos = [], is_combo = false, itens_combo = [], socio = 'alex', gera_ficha = true, tenant_id = 'tenda-muller' }) {
    const res = await query(
      `INSERT INTO expobai.produtos (categoria_id, nome, descricao, preco, preco_custo, foto_url, ordem, combos, is_combo, itens_combo, socio, gera_ficha, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        Number(categoria_id), 
        nome, 
        descricao, 
        parseFloat(preco), 
        parseFloat(preco_custo) || 0, 
        foto_url, 
        Number(ordem) || 0,
        JSON.stringify(combos || []),
        Boolean(is_combo),
        JSON.stringify(itens_combo || []),
        socio || 'alex',
        gera_ficha !== undefined ? Boolean(gera_ficha) : true,
        tenant_id || 'tenda-muller'
      ]
    );
    return res.rows[0];
  },

  async update(id, { categoria_id, nome, descricao, preco, preco_custo, foto_url, ativo, ordem, combos, is_combo, itens_combo, socio, gera_ficha }, tenantId = null) {
    let sql = `UPDATE expobai.produtos
       SET categoria_id = COALESCE($1, categoria_id),
           nome = COALESCE($2, nome),
           descricao = COALESCE($3, descricao),
           preco = COALESCE($4, preco),
           preco_custo = COALESCE($5, preco_custo),
           foto_url = COALESCE($6, foto_url),
           ativo = COALESCE($7, ativo),
           ordem = COALESCE($8, ordem),
           combos = COALESCE($9, combos),
           is_combo = COALESCE($10, is_combo),
           itens_combo = COALESCE($11, itens_combo),
           socio = COALESCE($12, socio),
           gera_ficha = COALESCE($13, gera_ficha)
       WHERE id = $14`;

    const params = [
      categoria_id !== undefined ? Number(categoria_id) : null,
      nome || null,
      descricao !== undefined ? descricao : null,
      preco !== undefined ? parseFloat(preco) : null,
      preco_custo !== undefined ? parseFloat(preco_custo) : null,
      foto_url !== undefined ? foto_url : null,
      ativo !== undefined ? Number(ativo) : null,
      ordem !== undefined ? Number(ordem) : null,
      combos !== undefined ? JSON.stringify(combos) : null,
      is_combo !== undefined ? Boolean(is_combo) : null,
      itens_combo !== undefined ? JSON.stringify(itens_combo) : null,
      socio !== undefined ? socio : null,
      gera_ficha !== undefined ? Boolean(gera_ficha) : null,
      id
    ];

    if (tenantId) {
      sql += ` AND tenant_id = $15`;
      params.push(tenantId);
    }
    sql += ` RETURNING *`;

    const res = await query(sql, params);

    // Propaga o novo custo fixo para todo o histórico de vendas deste produto
    if (preco_custo !== undefined && preco_custo !== null) {
      await query(
        `UPDATE expobai.pedido_itens SET preco_custo = $1 WHERE produto_id = $2`,
        [parseFloat(preco_custo) || 0, id]
      );
    }

    return res.rows[0] || null;
  },

  async updatePrice(id, preco, tenantId = null) {
    let sql = `UPDATE expobai.produtos SET preco = $1 WHERE id = $2`;
    const params = [parseFloat(preco), id];
    if (tenantId) {
      sql += ` AND tenant_id = $3`;
      params.push(tenantId);
    }
    sql += ` RETURNING *`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  },

  async toggleAtivo(id, tenantId = null) {
    let sql = `UPDATE expobai.produtos SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END WHERE id = $1`;
    const params = [id];
    if (tenantId) {
      sql += ` AND tenant_id = $2`;
      params.push(tenantId);
    }
    sql += ` RETURNING *`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  },

  async delete(id, tenantId = null) {
    let sql = `DELETE FROM expobai.produtos WHERE id = $1`;
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

module.exports = produtosRepository;
