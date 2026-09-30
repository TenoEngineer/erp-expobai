import json

with open("pedidos_db.json", encoding="utf-8") as f:
    orders = json.load(f)

# Orders up to 2026-09-27 23:59:59
orders_24_27 = [o for o in orders if o['data_hora_local'] <= '2026-09-27 23:59:59']
orders_28 = [o for o in orders if o['data_hora_local'] > '2026-09-27 23:59:59']

print("--- PEDIDOS NO BANCO ATÉ 27/09 23:59:59 ---")
from collections import defaultdict
t_24_27 = defaultdict(lambda: {'count': 0, 'sum': 0.0})
for o in orders_24_27:
    t_24_27[o['forma_pagamento']]['count'] += 1
    t_24_27[o['forma_pagamento']]['sum'] += float(o['total'])

for k, v in t_24_27.items():
    print(f"  {k:10}: {v['count']:4} vendas | R$ {v['sum']:.2f}")

print("\n--- PEDIDOS NO BANCO NA MADRUGADA DE 28/09 (00:00 a 03:30) ---")
t_28 = defaultdict(lambda: {'count': 0, 'sum': 0.0})
for o in orders_28:
    t_28[o['forma_pagamento']]['count'] += 1
    t_28[o['forma_pagamento']]['sum'] += float(o['total'])

for k, v in t_28.items():
    print(f"  {k:10}: {v['count']:4} vendas | R$ {v['sum']:.2f}")

print("\n--- TOTAL GERAL BANCO (24 A 28) ---")
t_all = defaultdict(lambda: {'count': 0, 'sum': 0.0})
for o in orders:
    t_all[o['forma_pagamento']]['count'] += 1
    t_all[o['forma_pagamento']]['sum'] += float(o['total'])

for k, v in t_all.items():
    print(f"  {k:10}: {v['count']:4} vendas | R$ {v['sum']:.2f}")
