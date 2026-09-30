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

# Compare counts and sums by day
nu_day = defaultdict(lambda: {"count": 0, "sum": 0.0})
for e in nu_exp:
    nu_day[e['data_iso']]["count"] += 1
    nu_day[e['data_iso']]["sum"] += e['valor']

db_pix_day = defaultdict(lambda: {"count": 0, "sum": 0.0})
for o in db_pix:
    d = o['data_hora_local'][:10]
    db_pix_day[d]["count"] += 1
    db_pix_day[d]["sum"] += float(o['total'])

print(f"{'Data':10} | {'Nubank Pix':20} | {'ERP Pix':20} | {'Diferença (ERP - Nu)':20}")
print("-" * 75)
for d in sorted(set(list(nu_day.keys()) + list(db_pix_day.keys()))):
    n = nu_day[d]
    e = db_pix_day[d]
    diff_c = e['count'] - n['count']
    diff_s = e['sum'] - n['sum']
    print(f"{d:10} | {n['count']:2} tx  R$ {n['sum']:8.2f} | {e['count']:2} ped  R$ {e['sum']:8.2f} | {diff_c:+3} ped  R$ {diff_s:+8.2f}")
