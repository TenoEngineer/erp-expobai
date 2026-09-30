import json
from collections import defaultdict

with open("pedidos_db.json", encoding="utf-8") as f:
    orders = json.load(f)

with open("scripts/nubank_entradas_100pct.json", encoding="utf-8") as f:
    nu_entradas = json.load(f)

date_map = {
    "23 SET 2026": "2026-09-23",
    "24 SET 2026": "2026-09-24",
    "25 SET 2026": "2026-09-25",
    "26 SET 2026": "2026-09-26",
    "27 SET 2026": "2026-09-27",
    "28 SET 2026": "2026-09-28"
}
for e in nu_entradas:
    e['data_iso'] = date_map.get(e['data'], e['data'])

nu_exp = [e for e in nu_entradas if e['data_iso'] >= '2026-09-24']
db_pix = [o for o in orders if o['forma_pagamento'] == 'pix']

# Pair matching by value and timestamp
db_by_val = defaultdict(list)
for o in db_pix:
    db_by_val[float(o['total'])].append(o)

nu_by_val = defaultdict(list)
for e in nu_exp:
    nu_by_val[e['valor']].append(e)

matched_db_ids = set()
for val, nu_items in nu_by_val.items():
    db_items = db_by_val.get(val, [])
    # match up to len(nu_items)
    for o in db_items[:len(nu_items)]:
        matched_db_ids.add(o['id'])

phantom_pix_orders = [o for o in db_pix if o['id'] not in matched_db_ids]
print(f"Total pedidos marcados como Pix sem entrada no Nubank: {len(phantom_pix_orders)}")
print(f"Soma desses pedidos: R$ {sum(float(o['total']) for o in phantom_pix_orders):.2f}")

# Target to convert to Card:
# Sicredi Credito: +12 vendas | + R$ 237.00
# Sicredi Debito:  +24 vendas | + R$ 399.02
# Total Card:      +36 vendas | + R$ 636.02
# Remaining phantom pix: 57 - 36 = 21 vendas | R$ 1.114,00 - 636.02 = R$ 477.98 (or R$ 407.98 after EXP-1077)

with open("scripts/phantom_pix_orders.json", "w", encoding="utf-8") as f:
    json.dump(phantom_pix_orders, f, ensure_ascii=False, indent=2)
