const { pool, query } = require('../db');

const pedidosRepository = {
  async createOrder({ itens, forma_pagamento, valor_pago = null, troco = 0, observacoes = '' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obter o próximo número sequencial de pedido
      const numRes = await client.query(`
        SELECT COALESCE(MAX(numero_pedido), 0) + 1 as proximo_numero
        FROM expobai.pedidos
      `);
      const numeroPedido = parseInt(numRes.rows[0].proximo_numero, 10);
      const codigoIdentificador = `EXP-${String(numeroPedido).padStart(3, '0')}`;

      // 2. Calcular total dos itens
      let totalCalculado = 0;
      const itensValidados = itens.map(item => {
        const qtd = Math.max(1, parseInt(item.quantidade, 10) || 1);
        const precoUnit = parseFloat(item.preco_unitario || item.preco);
        const subtotal = qtd * precoUnit;
        totalCalculado += subtotal;
        return {
          produto_id: item.produto_id || item.id || null,
          nome_produto: item.nome_produto || item.nome,
          quantidade: qtd,
          preco_unitario: precoUnit,
          subtotal
        };
      });

      // 3. Inserir Pedido
      const pedidoRes = await client.query(
        `INSERT INTO expobai.pedidos (
          numero_pedido, codigo_identificador, total, forma_pagamento, valor_pago, troco, status, observacoes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          numeroPedido,
          codigoIdentificador,
          totalCalculado,
          forma_pagamento.toLowerCase(),
          valor_pago ? parseFloat(valor_pago) : null,
          parseFloat(troco) || 0,
          'concluido',
          observacoes || null
        ]
      );
      const novoPedido = pedidoRes.rows[0];

      // 4. Inserir Itens do Pedido
      const itensSalvos = [];
      for (const item of itensValidados) {
        const itemRes = await client.query(
          `INSERT INTO expobai.pedido_itens (
            pedido_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [
            novoPedido.id,
            item.produto_id,
            item.nome_produto,
            item.quantidade,
            item.preco_unitario,
            item.subtotal
          ]
        );
        itensSalvos.push(itemRes.rows[0]);
      }

      await client.query('COMMIT');
      novoPedido.itens = itensSalvos;
      return novoPedido;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async listRecent(limit = 50) {
    const res = await query(
      `SELECT p.*,
        COALESCE(json_agg(
          json_build_object(
            'id', i.id,
            'nome_produto', i.nome_produto,
            'quantidade', i.quantidade,
            'preco_unitario', i.preco_unitario,
            'subtotal', i.subtotal
          )
        ) FILTER (WHERE i.id IS NOT NULL), '[]') as itens
       FROM expobai.pedidos p
       LEFT JOIN expobai.pedido_itens i ON p.id = i.pedido_id
       GROUP BY p.id
       ORDER BY p.id DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  },

  async getById(id) {
    const res = await query(
      `SELECT p.*,
        COALESCE(json_agg(
          json_build_object(
            'id', i.id,
            'nome_produto', i.nome_produto,
            'quantidade', i.quantidade,
            'preco_unitario', i.preco_unitario,
            'subtotal', i.subtotal
          )
        ) FILTER (WHERE i.id IS NOT NULL), '[]') as itens
       FROM expobai.pedidos p
       LEFT JOIN expobai.pedido_itens i ON p.id = i.pedido_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );
    return res.rows[0] || null;
  },

  async cancelOrder(id) {
    const res = await query(
      `UPDATE expobai.pedidos SET status = 'cancelado' WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.rows[0] || null;
  },

  async deleteOrder(id) {
    const res = await query(
      `DELETE FROM expobai.pedidos WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.rows[0] || null;
  }
};

module.exports = pedidosRepository;
