import json
import subprocess
from collections import Counter, defaultdict
from itertools import combinations

cmd = [
    "ssh", "root@5.182.17.36",
    'docker exec -i postgres-main psql -U postgres -d expobai_db -t -A -c "SELECT json_agg(i) FROM (SELECT pi.pedido_id, pi.nome_produto, pi.quantidade, pi.preco_unitario, pi.subtotal, p.total, p.forma_pagamento, to_char(p.data_hora AT TIME ZONE \'America/Campo_Grande\', \'YYYY-MM-DD HH24:MI:SS\') as data_hora FROM expobai.pedido_itens pi JOIN expobai.pedidos p ON pi.pedido_id = p.id WHERE p.status = \'concluido\') i;"'
]
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
items = json.loads(res.stdout.strip())

# Helper to identify partner by product name
def get_partner(name):
    n = name.lower()
    if 'espetinho' in n or 'carne' in n or 'frango' in n or 'coração' in n or 'coracao' in n or 'queijo' in n and 'coalho' in n:
        return 'Alex (Espetinhos)'
    elif 'cookie' in n:
        return 'Pais (Cookies)'
    else:
        return 'Heitor (Bebidas/Outros)'

orders_dict = defaultdict(lambda: {"items": [], "total": 0.0, "formas": "", "partners": set(), "date": ""})
for it in items:
    pid = it['pedido_id']
    orders_dict[pid]["items"].append({
        "nome": it['nome_produto'],
        "qtd": it['quantidade'],
        "preco": float(it['preco_unitario']),
        "subtotal": float(it['subtotal']),
        "partner": get_partner(it['nome_produto'])
    })
    orders_dict[pid]["total"] = float(it['total'])
    orders_dict[pid]["partners"].add(get_partner(it['nome_produto']))
    orders_dict[pid]["date"] = it['data_hora']

print(f"Total pedidos analisados: {len(orders_dict)}")

# 1. Distribution by basket size
size_counter = Counter(len(o["items"]) for o in orders_dict.values())
qty_counter = Counter(sum(it["qtd"] for it in o["items"]) for o in orders_dict.values())

print("\n--- DISTRIBUIÇÃO POR NÚMERO DE ITENS DISTINTOS NO PEDIDO ---")
for sz, cnt in sorted(size_counter.items()):
    rev = sum(o["total"] for o in orders_dict.values() if len(o["items"]) == sz)
    print(f"{sz} item(ns) distinto(s): {cnt:4} pedidos ({cnt/len(orders_dict)*100:5.1f}%) | Faturamento: R$ {rev:8.2f} (Ticket Médio: R$ {rev/cnt:5.2f})")

# 2. Pair Combinations (Cross-sell)
pairs = Counter()
trios = Counter()
partner_combos = Counter()

for o in orders_dict.values():
    item_names = sorted(list(set(it["nome"] for it in o["items"])))
    parts = tuple(sorted(list(o["partners"])))
    partner_combos[parts] += 1
    
    # 2-combinations
    for p in combinations(item_names, 2):
        pairs[p] += 1
    # 3-combinations
    for t in combinations(item_names, 3):
        trios[t] += 1

print("\n--- COMBOS DE PRODUTOS MAIS VENDIDOS JUNTOS (CROSS-SELL) ---")
for p, c in pairs.most_common(15):
    print(f"  {p[0]:25} + {p[1]:25} : {c:3} vezes")

print("\n--- TRIOS MAIS FREQUENTES ---")
for t, c in trios.most_common(5):
    print(f"  {t[0]} + {t[1]} + {t[2]}: {c} vezes")

print("\n--- VENDA CRUZADA ENTRE SÓCIOS (TIE-IN SALES / MULTI-SÓCIO) ---")
for parts, c in partner_combos.most_common():
    rev = sum(o["total"] for o in orders_dict.values() if tuple(sorted(list(o["partners"]))) == parts)
    print(f"  {' + '.join(parts):50} : {c:4} pedidos ({c/len(orders_dict)*100:5.1f}%) | R$ {rev:8.2f}")

# 3. Tie-in Analysis:
# If customer bought Espetinho, what % also bought Drink?
orders_with_espetinho = [o for o in orders_dict.values() if any('Alex' in it['partner'] for it in o['items'])]
espetinho_and_drink = [o for o in orders_with_espetinho if any('Heitor' in it['partner'] for it in o['items'])]
espetinho_and_cookie = [o for o in orders_with_espetinho if any('Pais' in it['partner'] for it in o['items'])]

print(f"\n--- TAXA DE CONVERSÃO CRUZADA (ATTACH RATE) ---")
print(f"Pedidos com Espetinho (Alex): {len(orders_with_espetinho)}")
print(f"  -> Destes, também levaram Bebida (Heitor): {len(espetinho_and_drink)} ({len(espetinho_and_drink)/len(orders_with_espetinho)*100:.1f}%)")
print(f"  -> Destes, também levaram Cookie (Pais):  {len(espetinho_and_cookie)} ({len(espetinho_and_cookie)/len(orders_with_espetinho)*100:.1f}%)")

orders_with_cookie = [o for o in orders_dict.values() if any('Pais' in it['partner'] for it in o['items'])]
cookie_and_drink = [o for o in orders_with_cookie if any('Heitor' in it['partner'] for it in o['items'])]
print(f"Pedidos com Cookie (Pais): {len(orders_with_cookie)}")
print(f"  -> Destes, também levaram Bebida (Heitor): {len(cookie_and_drink)} ({len(cookie_and_drink)/len(orders_with_cookie)*100:.1f}%)")
