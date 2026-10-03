const { query, pool } = require('../db');

const tenantsRepository = {
  async listAll() {
    const res = await query(`
      SELECT t.*,
             (SELECT COUNT(*) FROM expobai.pedidos p WHERE p.tenant_id = t.id AND p.status != 'cancelado')::int as total_pedidos,
             (SELECT COALESCE(SUM(total), 0) FROM expobai.pedidos p WHERE p.tenant_id = t.id AND p.status != 'cancelado')::numeric as total_faturado,
             (SELECT COUNT(*) FROM expobai.produtos pr WHERE pr.tenant_id = t.id AND pr.ativo = 1)::int as total_produtos,
             (SELECT COUNT(*) FROM expobai.usuarios u WHERE u.tenant_id = t.id AND u.ativo = true)::int as total_usuarios
      FROM expobai.tenants t
      ORDER BY t.criado_em DESC
    `);
    return res.rows;
  },

  async listPublicActive() {
    const res = await query(`
      SELECT id, nome
      FROM expobai.tenants
      WHERE ativo = true
      ORDER BY nome ASC
    `);
    return res.rows;
  },

  async getById(id) {
    const res = await query(
      `SELECT * FROM expobai.tenants WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async create({ id, nome, responsavel, telefone = '', documento = '', plano = 'evento', valido_ate = null, modulos = null, valor_plano = 0 }) {
    // Normaliza id para slug seguro (ex: 'bar-central')
    const slugId = id ? id.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-') : nome.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
    const modulosJson = JSON.stringify(modulos || ['core_pos']);

    const res = await query(
      `INSERT INTO expobai.tenants (id, nome, responsavel, telefone, documento, plano, valido_ate, modulos, valor_plano)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       RETURNING *`,
      [slugId, nome, responsavel, telefone, documento, plano, valido_ate, modulosJson, valor_plano || 0]
    );
    return res.rows[0];
  },

  async update(id, { nome, responsavel, telefone, documento, plano, ativo, valido_ate, modulos, valor_plano }) {
    const modulosJson = modulos !== undefined ? JSON.stringify(modulos) : null;
    const res = await query(
      `UPDATE expobai.tenants
       SET nome = COALESCE($1, nome),
           responsavel = COALESCE($2, responsavel),
           telefone = COALESCE($3, telefone),
           documento = COALESCE($4, documento),
           plano = COALESCE($5, plano),
           ativo = COALESCE($6, ativo),
           valido_ate = COALESCE($7, valido_ate),
           modulos = COALESCE($8::jsonb, modulos),
           valor_plano = COALESCE($9, valor_plano)
       WHERE id = $10
       RETURNING *`,
      [
        nome || null, 
        responsavel || null, 
        telefone || null, 
        documento || null, 
        plano || null, 
        ativo !== undefined ? Boolean(ativo) : null, 
        valido_ate || null,
        modulosJson,
        valor_plano !== undefined ? valor_plano : null,
        id
      ]
    );
    return res.rows[0] || null;
  },

  /**
   * Clona categorias e produtos de um tenant modelo (ex: 'tenda-muller') para um novo tenant
   */
  async cloneCardapio(fromTenantId, toTenantId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Buscar categorias do modelo
      const catRes = await client.query(
        `SELECT * FROM expobai.categorias WHERE tenant_id = $1 AND ativo = 1 ORDER BY ordem ASC, id ASC`,
        [fromTenantId]
      );

      const catMap = {}; // oldId -> newId

      for (const cat of catRes.rows) {
        const newCatRes = await client.query(
          `INSERT INTO expobai.categorias (nome, icone, cor, ordem, ativo, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [cat.nome, cat.icone, cat.cor, cat.ordem, cat.ativo, toTenantId]
        );
        catMap[cat.id] = newCatRes.rows[0].id;
      }

      // 2. Buscar produtos do modelo
      const prodRes = await client.query(
        `SELECT * FROM expobai.produtos WHERE tenant_id = $1 AND ativo = 1 ORDER BY ordem ASC, id ASC`,
        [fromTenantId]
      );

      let totalClonados = 0;
      for (const p of prodRes.rows) {
        const novaCatId = catMap[p.categoria_id];
        if (novaCatId) {
          await client.query(
            `INSERT INTO expobai.produtos (categoria_id, nome, descricao, preco, preco_custo, foto_url, ativo, ordem, combos, is_combo, itens_combo, socio, gera_ficha, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              novaCatId,
              p.nome,
              p.descricao,
              p.preco,
              p.preco_custo,
              p.foto_url,
              p.ativo,
              p.ordem,
              JSON.stringify(p.combos || []),
              p.is_combo,
              JSON.stringify(p.itens_combo || []),
              p.socio || 'alex',
              p.gera_ficha !== false,
              toTenantId
            ]
          );
          totalClonados++;
        }
      }

      await client.query('COMMIT');
      return { success: true, totalCategorias: Object.keys(catMap).length, totalProdutos: totalClonados };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

module.exports = tenantsRepository;
