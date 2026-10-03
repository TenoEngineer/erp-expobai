WITH OrderSKUCount AS (
  SELECT 
    pedido_id,
    COUNT(DISTINCT nome_produto) as sku_count,
    SUM(quantidade) as total_units,
    SUM(subtotal) as order_total
  FROM expobai.pedido_itens
  GROUP BY pedido_id
)
SELECT 
  sku_count,
  COUNT(*) as total_orders,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM expobai.pedidos WHERE status = 'concluido') * 100, 2) as pct_orders,
  SUM(total_units) as total_units_sold,
  ROUND(AVG(total_units), 2) as avg_units_per_order,
  ROUND(AVG(order_total), 2) as avg_ticket,
  SUM(order_total) as total_revenue,
  ROUND(SUM(order_total)::numeric / (SELECT SUM(total) FROM expobai.pedidos WHERE status = 'concluido') * 100, 2) as pct_revenue
FROM expobai.pedidos p
JOIN OrderSKUCount s ON s.pedido_id = p.id
WHERE p.status = 'concluido'
GROUP BY sku_count
ORDER BY sku_count ASC;
