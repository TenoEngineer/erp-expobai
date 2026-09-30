import json

with open("pedidos_db.json", encoding="utf-8") as f:
    orders = json.load(f)

# Let's inspect the 26th, 27th, and 28th orders launched as Pix
pix_orders_26_28 = [o for o in orders if o['forma_pagamento'] == 'pix' and o['data_hora_local'] >= '2026-09-26 00:00:00']

with open("scripts/nubank_entradas_100pct.json", encoding="utf-8") as f:
    nu_entradas = json.load(f)

# Unmatched Nubank entries vs DB Pix
# Let's do a greedy / bipartite matching by value and timestamp
print(f"Total pedidos Pix no ERP (26 a 28): {len(pix_orders_26_28)}")
print(f"Total Nubank entradas (26 a 28): {len([e for e in nu_entradas if e['data'] in ('26 SET 2026', '27 SET 2026', '28 SET 2026')])}")
