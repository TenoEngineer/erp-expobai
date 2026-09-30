import json
from collections import defaultdict, Counter

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

# Filter only 24 to 28 for Expobai
nu_expobai = [e for e in nu_entradas if e['data_iso'] >= "2026-09-24"]
db_pix = [o for o in db_orders if o['forma_pagamento'] == 'pix']

print(f"Total Nubank Expobai (24-28): {len(nu_expobai)} | R$ {sum(e['valor'] for e in nu_expobai):.2f}")
print(f"Total DB Pix:               {len(db_pix)} | R$ {sum(float(o['total']) for o in db_pix):.2f}")

# Distribution of values in Nubank vs DB
nu_counter = Counter(e['valor'] for e in nu_expobai)
db_counter = Counter(float(o['total']) for o in db_pix)

all_vals = sorted(set(list(nu_counter.keys()) + list(db_counter.keys())))

print("\n--- DISTRIBUIÇÃO POR VALOR (VALOR DA VENDA / TRANSAÇÃO) ---")
print(f"{'Valor (R$)':12} | {'Nubank Qtd':10} | {'DB Pix Qtd':10} | {'Diferença':10} | {'Impacto (R$)':12}")
print("-" * 65)

total_diff_val = 0.0
for val in all_vals:
    n_q = nu_counter[val]
    d_q = db_counter[val]
    diff = d_q - n_q
    impact = diff * val
    total_diff_val += impact
    if diff != 0:
        print(f"R$ {val:9.2f} | {n_q:10} | {d_q:10} | {diff:+10} | R$ {impact:+10.2f}")

print("-" * 65)
print(f"Diferença Total: R$ {total_diff_val:+.2f}")
