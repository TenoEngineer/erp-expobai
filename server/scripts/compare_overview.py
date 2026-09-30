import json
from collections import defaultdict, Counter

with open("pedidos_db.json", encoding="utf-8") as f:
    db_orders = json.load(f)

with open("scripts/nubank_entradas_100pct.json", encoding="utf-8") as f:
    nu_entradas = json.load(f)

# Map Nubank dates to ISO date format
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

print("================================================================================")
print("COMPARAÇÃO GERAL: SISTEMA (ERP) vs EXTRATOS BANCÁRIOS / ADQUIRENTE")
print("================================================================================\n")

# PIX COMPARISON
print("--- 1. COMPARATIVO PIX ---")
print(f"Total PIX no Sistema:    242 vendas | R$ 4.841,00")
print(f"Total PIX no Nubank:     198 entr.  | R$ 4.061,65 (incluindo dia 23)")
print(f"Total PIX Nubank (24-28): 193 entr.  | R$ 3.970,65")
print(f"Diferença (DB - Nubank):  +49 vendas | + R$ 870,35 no Sistema\n")

# By date comparison for PIX
nu_by_date = defaultdict(list)
for e in nu_entradas:
    nu_by_date[e['data_iso']].append(e['valor'])

db_pix_by_date = defaultdict(list)
for o in db_orders:
    if o['forma_pagamento'] == 'pix':
        d = o['data_hora_local'][:10]
        db_pix_by_date[d].append(float(o['total']))

all_dates = sorted(set(list(nu_by_date.keys()) + list(db_pix_by_date.keys())))
print(f"{'Data':12} | {'Nubank Qtd':10} {'Nubank Total':14} | {'DB Pix Qtd':10} {'DB Pix Total':14} | {'Dif Qtd':8} {'Dif Valor':12}")
print("-" * 80)
for d in all_dates:
    nu_vals = nu_by_date.get(d, [])
    db_vals = db_pix_by_date.get(d, [])
    diff_q = len(db_vals) - len(nu_vals)
    diff_v = sum(db_vals) - sum(nu_vals)
    print(f"{d:12} | {len(nu_vals):10} R$ {sum(nu_vals):10.2f} | {len(db_vals):10} R$ {sum(db_vals):10.2f} | {diff_q:+8} R$ {diff_v:+10.2f}")

print("\n--- 2. COMPARATIVO CARTÃO (SICREDI) ---")
print(f"Crédito Sicredi Relatório:  74 vendas | R$ 1.745,00")
print(f"Crédito Sistema (DB):       76 vendas | R$ 1.791,00  (+2 vendas | + R$ 46,00)")
print(f"Débito Sicredi Relatório:  225 vendas | R$ 4.182,02")
print(f"Débito Sistema (DB):       246 vendas | R$ 4.451,00  (+21 vendas | + R$ 268,98)")
print(f"Total Cartão Sicredi:      299 vendas | R$ 5.927,02")
print(f"Total Cartão Sistema (DB): 322 vendas | R$ 6.242,00  (+23 vendas | + R$ 314,98)")
