import json
from datetime import datetime

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

# Exclude day 23 (pre-event)
nu_list = [e for e in nu_entradas if e['data_iso'] >= '2026-09-24']
db_pix_list = [o for o in db_orders if o['forma_pagamento'] == 'pix']

# We want to match each nu_list item with a db_pix_list item of identical value
# To be robust, sort both by date/time
db_unmatched = list(db_pix_list)
nu_unmatched = []
matched_pairs = []

# Group by value
from collections import defaultdict
db_by_val = defaultdict(list)
for o in db_pix_list:
    db_by_val[float(o['total'])].append(o)

nu_by_val = defaultdict(list)
for e in nu_list:
    nu_by_val[e['valor']].append(e)

all_values = sorted(set(list(db_by_val.keys()) + list(nu_by_val.keys())))

unmatched_in_db = [] # In DB as Pix, but not in Nubank!
unmatched_in_nu = [] # In Nubank, but not in DB as Pix!

for val in all_values:
    db_items = db_by_val[val]
    nu_items = nu_by_val[val]
    
    num_matches = min(len(db_items), len(nu_items))
    matched_pairs.extend(list(zip(db_items[:num_matches], nu_items[:num_matches])))
    
    if len(db_items) > len(nu_items):
        unmatched_in_db.extend(db_items[num_matches:])
    elif len(nu_items) > len(db_items):
        unmatched_in_nu.extend(nu_items[num_matches:])

print(f"Total casados perfeitamente (Pix Real = Pix ERP): {len(matched_pairs)} vendas | R$ {sum(float(p[0]['total']) for p in matched_pairs):.2f}")
print(f"Total no Nubank que NÃO tem Pix no ERP: {len(unmatched_in_nu)} recebimentos | R$ {sum(e['valor'] for e in unmatched_in_nu):.2f}")
print(f"Total no ERP marcado como Pix que NÃO caiu no Nubank: {len(unmatched_in_db)} pedidos | R$ {sum(float(o['total']) for o in unmatched_in_db):.2f}")

print("\n--- DETALHE DOS RECEBIMENTOS NUBANK SEM PEDIDO PIX NO ERP ---")
for e in unmatched_in_nu:
    print(f"  {e['data_iso']} | R$ {e['valor']:6.2f} | {e['descricao'][:60]}")

print(f"\n--- RESUMO DOS {len(unmatched_in_db)} PEDIDOS NO ERP LANÇADOS COMO PIX SEM ENTRADA NO NUBANK ---")
from collections import Counter
unm_c = Counter(float(o['total']) for o in unmatched_in_db)
for val, count in sorted(unm_c.items()):
    print(f"  R$ {val:6.2f}: {count:2} pedidos (Total: R$ {val*count:7.2f})")

with open("scripts/pix_sobrando_no_erp.json", "w", encoding="utf-8") as f:
    json.dump(unmatched_in_db, f, ensure_ascii=False, indent=2)
