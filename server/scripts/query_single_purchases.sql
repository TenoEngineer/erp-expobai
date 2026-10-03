-- 1. Pedidos com exatamente 1 item único (total_itens = 1)
WITH PedidoStats AS (
  SELECT 
    pedido_id,
    COUNT(*) as total_linhas,
    SUM(quantidade) as total_itens
  FROM expobai.pedido_itens
  GROUP BY pedido_id
)
SELECT 
  i.nome_produto,
  COUNT(*) as total_compras_unicas,
  SUM(i.subtotal) as faturamento_compras_unicas,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM PedidoStats WHERE total_itens = 1) * 100, 1) as pct_das_compras_unicas,
  (
    SELECT SUM(pi2.quantidade) 
    FROM expobai.pedido_itens pi2 
    JOIN expobai.pedidos p2 ON p2.id = pi2.pedido_id 
    WHERE p2.status = 'concluido' AND pi2.nome_produto = i.nome_produto
  ) as total_geral_vendido_produto
FROM expobai.pedidos p
JOIN PedidoStats s ON s.pedido_id = p.id
JOIN expobai.pedido_itens i ON i.pedido_id = p.id
WHERE p.status = 'concluido' AND s.total_itens = 1
GROUP BY i.nome_produto
ORDER BY total_compras_unicas DESC
LIMIT 10;

-- 2. Pedidos monoproduto (somente 1 tipo de produto, independente da quantidade)
WITH MonoprodutoPedidos AS (
  SELECT 
    pedido_id,
    COUNT(DISTINCT nome_produto) as tipos_produtos,
    SUM(quantidade) as total_itens
  FROM expobai.pedido_itens
  GROUP BY pedido_id
  HAVING COUNT(DISTINCT nome_produto) = 1
)
SELECT 
  i.nome_produto,
  COUNT(DISTINCT p.id) as total_pedidos_exclusivos,
  SUM(i.quantidade) as qtd_total_pedidos_exclusivos,
  SUM(i.subtotal) as faturamento_exclusivo
FROM expobai.pedidos p
JOIN MonoprodutoPedidos m ON m.pedido_id = p.id
JOIN expobai.pedido_itens i ON i.pedido_id = p.id
WHERE p.status = 'concluido'
GROUP BY i.nome_produto
ORDER BY total_pedidos_exclusivos DESC
LIMIT 10;

-- 3. Resumo geral de cestas
WITH CestaSize AS (
  SELECT 
    pedido_id,
    SUM(quantidade) as total_itens
  FROM expobai.pedido_itens
  GROUP BY pedido_id
)
SELECT 
  CASE 
    WHEN total_itens = 1 THEN '1 item (Compra Única Estrita)'
    WHEN total_itens = 2 THEN '2 itens'
    WHEN total_itens = 3 THEN '3 itens'
    WHEN total_itens >= 4 THEN '4+ itens'
  END as tamanho_cesta,
  COUNT(*) as total_pedidos,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM expobai.pedidos WHERE status = 'concluido') * 100, 1) as pct_pedidos
FROM expobai.pedidos p
JOIN CestaSize c ON c.pedido_id = p.id
WHERE p.status = 'concluido'
GROUP BY 
  CASE 
    WHEN total_itens = 1 THEN '1 item (Compra Única Estrita)'
    WHEN total_itens = 2 THEN '2 itens'
    WHEN total_itens = 3 THEN '3 itens'
    WHEN total_itens >= 4 THEN '4+ itens'
  END
ORDER BY total_pedidos DESC;
