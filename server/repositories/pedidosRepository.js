const { pool, query } = require('../db');

const pedidosRepository = {
  async createOrder({ itens, forma_pagamento, valor_pago = null, troco = 0, observacoes = '', pagamentos = null, origem = 'desktop', data_hora = null, tenant_id = 'tenda-muller' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obter o próximo número sequencial atômico via SEQUENCE (Concorrência 100% segura entre múltiplos dispositivos)
      const numRes = await client.query(`
        SELECT nextval('expobai.pedidos_numero_seq') as proximo_numero
      `);
      const numeroPedido = parseInt(numRes.rows[0].proximo_numero, 10);
      const codigoIdentificador = `EXP-${String(numeroPedido).padStart(3, '0')}`;

      // 2. Calcular total dos itens
      let totalCalculado = 0;
      const itensValidados = itens.map(item => {
        const qtd = Math.max(1, parseInt(item.quantidade, 10) || 1);
        const precoUnit = parseFloat(item.preco_unitario || item.preco);
        const subtotal = qtd * precoUnit;
        const precoCusto = parseFloat(item.preco_custo) || 0;
        totalCalculado += subtotal;
        return {
          produto_id: item.produto_id || item.id || null,
          nome_produto: item.nome_produto || item.nome,
          quantidade: qtd,
          preco_unitario: precoUnit,
          subtotal,
          preco_custo: precoCusto,
          combo_info: item.combo_info ? JSON.stringify(item.combo_info) : null
        };
      });

      // Preparar pagamentos (se misto ou único)
      let jsonPagamentos = null;
      if (Array.isArray(pagamentos) && pagamentos.length > 0) {
        jsonPagamentos = JSON.stringify(pagamentos);
      } else {
        jsonPagamentos = JSON.stringify([{ forma: forma_pagamento.toLowerCase(), valor: totalCalculado }]);
      }

      // 3. Inserir Pedido com identificação de Origem, Tenant e Data/Hora (permite retroativo)
      const insertParams = [
        numeroPedido,
        codigoIdentificador,
        totalCalculado,
        forma_pagamento.toLowerCase(),
        valor_pago ? parseFloat(valor_pago) : null,
        parseFloat(troco) || 0,
        'concluido',
        observacoes || null,
        jsonPagamentos,
        origem || 'desktop',
        tenant_id || 'tenda-muller'
      ];

      let dataHoraFragment = 'CURRENT_TIMESTAMP';
      if (data_hora) {
        insertParams.push(new Date(data_hora).toISOString());
        dataHoraFragment = `$${insertParams.length}`;
      }

      const pedidoRes = await client.query(
        `INSERT INTO expobai.pedidos (
          numero_pedido, codigo_identificador, total, forma_pagamento, valor_pago, troco, status, observacoes, pagamentos, origem, tenant_id, data_hora
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ${dataHoraFragment})
        RETURNING *`,
        insertParams
      );
      const novoPedido = pedidoRes.rows[0];

      // 4. Inserir Itens do Pedido
      const itensSalvos = [];
      for (const item of itensValidados) {
        const itemRes = await client.query(
          `INSERT INTO expobai.pedido_itens (
            pedido_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal, preco_custo, combo_info
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            novoPedido.id,
            item.produto_id,
            item.nome_produto,
            item.quantidade,
            item.preco_unitario,
            item.subtotal,
            item.preco_custo,
            item.combo_info
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

  async updateOrder(id, { itens, forma_pagamento, valor_pago = null, troco = 0, observacoes = '', pagamentos = null, motivo_edicao = 'Alteração manual de lançamento', data_hora = null }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingRes = await client.query('SELECT * FROM expobai.pedidos WHERE id = $1 FOR UPDATE', [id]);
      if (existingRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const existing = existingRes.rows[0];

      // 1. Validar e recalcular itens se fornecidos
      let totalCalculado = parseFloat(existing.total);
      let itensValidados = null;

      if (Array.isArray(itens) && itens.length > 0) {
        totalCalculado = 0;
        itensValidados = [];

        for (const item of itens) {
          const qtd = Math.max(1, parseInt(item.quantidade, 10) || 1);
          const precoUnit = parseFloat(item.preco_unitario || item.preco || 0);
          const subtotal = qtd * precoUnit;
          const precoCusto = parseFloat(item.preco_custo || 0);
          totalCalculado += subtotal;

          let validProdId = null;
          // Se produto_id foi explicitamente fornecido, verificar se existe na tabela produtos
          if (item.produto_id && !isNaN(Number(item.produto_id))) {
            const check = await client.query('SELECT id FROM expobai.produtos WHERE id = $1', [Number(item.produto_id)]);
            if (check.rows.length > 0) {
              validProdId = check.rows[0].id;
            }
          }

          // Se não encontrado por id, tentar encontrar por nome do produto
          if (!validProdId && item.nome_produto) {
            const checkNome = await client.query('SELECT id FROM expobai.produtos WHERE LOWER(TRIM(nome)) = LOWER(TRIM($1)) LIMIT 1', [item.nome_produto]);
            if (checkNome.rows.length > 0) {
              validProdId = checkNome.rows[0].id;
            }
          }

          itensValidados.push({
            produto_id: validProdId, // NUNCA usa item.id (que seria o ID da tabela pedido_itens)
            nome_produto: item.nome_produto || item.nome || 'Item',
            quantidade: qtd,
            preco_unitario: precoUnit,
            subtotal,
            preco_custo: precoCusto,
            combo_info: item.combo_info ? (typeof item.combo_info === 'string' ? item.combo_info : JSON.stringify(item.combo_info)) : null
          });
        }
      }

      const formaFinal = (forma_pagamento || existing.forma_pagamento).toLowerCase();

      // 2. Preparar pagamentos
      let jsonPagamentos = null;
      if (Array.isArray(pagamentos) && pagamentos.length > 0) {
        jsonPagamentos = JSON.stringify(pagamentos);
      } else if (forma_pagamento) {
        jsonPagamentos = JSON.stringify([{ forma: formaFinal, valor: totalCalculado }]);
      } else {
        jsonPagamentos = existing.pagamentos ? JSON.stringify(existing.pagamentos) : JSON.stringify([{ forma: formaFinal, valor: totalCalculado }]);
      }

      // 3. Atualizar Pedido com tag editado e data/hora opcional
      const updateRes = await client.query(
        `UPDATE expobai.pedidos
         SET total = $1,
             forma_pagamento = $2,
             valor_pago = $3,
             troco = $4,
             observacoes = $5,
             pagamentos = $6,
             data_hora = COALESCE($7, data_hora),
             editado = TRUE,
             editado_em = NOW(),
             motivo_edicao = $8
         WHERE id = $9
         RETURNING *`,
        [
          totalCalculado,
          formaFinal,
          valor_pago !== undefined && valor_pago !== null ? parseFloat(valor_pago) : totalCalculado,
          parseFloat(troco) || 0,
          observacoes !== undefined ? observacoes : existing.observacoes,
          jsonPagamentos,
          data_hora ? new Date(data_hora).toISOString() : null,
          motivo_edicao || 'Alteração manual de lançamento',
          id
        ]
      );
      const pedidoAtualizado = updateRes.rows[0];

      // 4. Substituir itens se fornecidos
      if (itensValidados) {
        await client.query('DELETE FROM expobai.pedido_itens WHERE pedido_id = $1', [id]);
        const itensSalvos = [];
        for (const item of itensValidados) {
          const itemRes = await client.query(
            `INSERT INTO expobai.pedido_itens (
              pedido_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal, preco_custo, combo_info
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
              id,
              item.produto_id,
              item.nome_produto,
              item.quantidade,
              item.preco_unitario,
              item.subtotal,
              item.preco_custo,
              item.combo_info
            ]
          );
          itensSalvos.push(itemRes.rows[0]);
        }
        pedidoAtualizado.itens = itensSalvos;
      } else {
        const itensExistentes = await client.query('SELECT * FROM expobai.pedido_itens WHERE pedido_id = $1 ORDER BY id', [id]);
        pedidoAtualizado.itens = itensExistentes.rows;
      }

      await client.query('COMMIT');
      return pedidoAtualizado;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async listRecent(limit = 50, tenantId = 'tenda-muller') {
    const res = await query(
      `SELECT p.*,
        COALESCE(json_agg(
          json_build_object(
            'id', i.id,
            'produto_id', i.produto_id,
            'nome_produto', i.nome_produto,
            'quantidade', i.quantidade,
            'preco_unitario', i.preco_unitario,
            'subtotal', i.subtotal,
            'preco_custo', i.preco_custo,
            'combo_info', i.combo_info
          )
        ) FILTER (WHERE i.id IS NOT NULL), '[]') as itens
       FROM expobai.pedidos p
       LEFT JOIN expobai.pedido_itens i ON p.id = i.pedido_id
       WHERE p.tenant_id = $2
       GROUP BY p.id
       ORDER BY p.id DESC
       LIMIT $1`,
      [limit, tenantId]
    );
    return res.rows;
  },

  async getById(id, tenantId = null) {
    let sql = `
      SELECT p.*,
        COALESCE(json_agg(
          json_build_object(
            'id', i.id,
            'produto_id', i.produto_id,
            'nome_produto', i.nome_produto,
            'quantidade', i.quantidade,
            'preco_unitario', i.preco_unitario,
            'subtotal', i.subtotal,
            'preco_custo', i.preco_custo,
            'combo_info', i.combo_info
          )
        ) FILTER (WHERE i.id IS NOT NULL), '[]') as itens
       FROM expobai.pedidos p
       LEFT JOIN expobai.pedido_itens i ON p.id = i.pedido_id
       WHERE p.id = $1`;
    const params = [id];
    if (tenantId) {
      sql += ` AND p.tenant_id = $2`;
      params.push(tenantId);
    }
    sql += ` GROUP BY p.id`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  },

  async cancelOrder(id, tenantId = null) {
    let sql = `UPDATE expobai.pedidos SET status = 'cancelado' WHERE id = $1`;
    const params = [id];
    if (tenantId) {
      sql += ` AND tenant_id = $2`;
      params.push(tenantId);
    }
    sql += ` RETURNING *`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  },

  async deleteOrder(id, tenantId = null) {
    let sql = `DELETE FROM expobai.pedidos WHERE id = $1`;
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

module.exports = pedidosRepository;
