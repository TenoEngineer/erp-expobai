import json
from collections import defaultdict

with open("pedidos_db.json", encoding="utf-8") as f:
    db_orders = json.load(f)

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

nu_expobai = [e for e in nu_entradas if e['data_iso'] >= "2026-09-24"]

# Let's inspect all high-value pix orders in DB (>= R$ 25) vs Nubank
db_pix_high = [o for o in db_orders if o['forma_pagamento'] == 'pix' and float(o['total']) >= 25.0]
nu_high = [e for e in nu_expobai if e['valor'] >= 25.0]

print("=== PIX NO BANCO >= R$ 25.00 ===")
for o in db_pix_high:
    print(f"ID: {o['id']:4} | {o['codigo_identificador']:7} | {o['data_hora_local']} | R$ {float(o['total']):6.2f}")

print("\n=== PIX NO NUBANK >= R$ 25.00 ===")
for e in nu_high:
    print(f"{e['data_iso']} | R$ {e['valor']:6.2f} | {e['descricao'][:50]}")
