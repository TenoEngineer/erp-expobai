import json

with open("pedidos_db.json", encoding="utf-8") as f:
    orders = json.load(f)

print(f"Total pedidos no banco: {len(orders)}")
print(f"Primeiro pedido: {orders[0]['codigo_identificador']} - {orders[0]['data_hora_local']} - {orders[0]['forma_pagamento']} - R$ {orders[0]['total']}")
print(f"Último pedido: {orders[-1]['codigo_identificador']} - {orders[-1]['data_hora_local']} - {orders[-1]['forma_pagamento']} - R$ {orders[-1]['total']}")

# Totals in DB by payment method
from collections import defaultdict
db_totals = defaultdict(lambda: {"count": 0, "sum": 0.0})
for o in orders:
    db_totals[o['forma_pagamento']]['count'] += 1
    db_totals[o['forma_pagamento']]['sum'] += float(o['total'])

print("\n--- TOTAIS NO SISTEMA (ERP) ---")
for k, v in db_totals.items():
    print(f"  {k:10}: {v['count']:4} vendas | R$ {v['sum']:.2f}")

total_db_count = sum(v['count'] for v in db_totals.values())
total_db_sum = sum(v['sum'] for v in db_totals.values())
print(f"  TOTAL GERAL : {total_db_count:4} vendas | R$ {total_db_sum:.2f}")
