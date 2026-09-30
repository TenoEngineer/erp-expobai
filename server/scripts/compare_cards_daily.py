import json
from collections import defaultdict

with open("pedidos_db.json", encoding="utf-8") as f:
    orders = json.load(f)

# Sicredi daily data from screenshot (Lista de vendas aprovados)
sicredi_daily = {
    "2026-09-24": {"count": 4, "total": 99.00},
    "2026-09-25": {"count": 39, "total": 865.00},
    "2026-09-26": {"count": 89, "total": 1884.01},
    "2026-09-27": {"count": 168, "total": 3079.01},
    "2026-09-28": {"count": 59, "total": 951.00},
}

# DB Card (debito + credito) daily
db_card_daily = defaultdict(lambda: {"count": 0, "sum": 0.0, "debito_c": 0, "debito_s": 0.0, "credito_c": 0, "credito_s": 0.0})
for o in orders:
    if o['forma_pagamento'] in ('credito', 'debito'):
        d = o['data_hora_local'][:10]
        db_card_daily[d]["count"] += 1
        db_card_daily[d]["sum"] += float(o['total'])
        if o['forma_pagamento'] == 'debito':
            db_card_daily[d]["debito_c"] += 1
            db_card_daily[d]["debito_s"] += float(o['total'])
        else:
            db_card_daily[d]["credito_c"] += 1
            db_card_daily[d]["credito_s"] += float(o['total'])

print("=========================================================================================")
print("COMPARATIVO CARTÃO DIA A DIA: SICREDI (MAQUININHA) vs SISTEMA (ERP)")
print("=========================================================================================")
print(f"{'Data':10} | {'Sicredi Qtd':11} {'Sicredi R$':12} | {'ERP Qtd':8} {'ERP R$':10} | {'Dif Qtd':8} {'Dif R$':12}")
print("-" * 85)

total_sicredi_c = sum(v['count'] for v in sicredi_daily.values())
total_sicredi_s = sum(v['total'] for v in sicredi_daily.values())
total_erp_c = sum(v['count'] for v in db_card_daily.values())
total_erp_s = sum(v['sum'] for v in db_card_daily.values())

for d in sorted(sicredi_daily.keys()):
    s = sicredi_daily[d]
    e = db_card_daily[d]
    diff_c = e['count'] - s['count']
    diff_s = e['sum'] - s['total']
    print(f"{d:10} | {s['count']:11} R$ {s['total']:9.2f} | {e['count']:8} R$ {e['sum']:7.2f} | {diff_c:+8} R$ {diff_s:+10.2f}")

print("-" * 85)
diff_total_c = total_erp_c - total_sicredi_c
diff_total_s = total_erp_s - total_sicredi_s
print(f"{'TOTAL':10} | {total_sicredi_c:11} R$ {total_sicredi_s:9.2f} | {total_erp_c:8} R$ {total_erp_s:7.2f} | {diff_total_c:+8} R$ {diff_total_s:+10.2f}")
