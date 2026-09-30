import json
import subprocess

cmd = [
    "ssh", "root@5.182.17.36",
    'docker exec -i postgres-main psql -U postgres -d expobai_db -t -A -c "SELECT json_agg(i) FROM (SELECT pi.pedido_id, pi.nome_produto, pi.quantidade, pi.preco_unitario, pi.subtotal, p.total FROM expobai.pedido_itens pi JOIN expobai.pedidos p ON pi.pedido_id = p.id WHERE p.status = \'concluido\') i;"'
]
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
items = json.loads(res.stdout.strip())

from collections import Counter, defaultdict

# Product sales ranking
prod_qty = Counter()
prod_rev = Counter()
order_items = defaultdict(list)

for it in items:
    name = it['nome_produto']
    q = it['quantidade']
    sub = float(it['subtotal'])
    prod_qty[name] += q
    prod_rev[name] += sub
    order_items[it['pedido_id']].append(name)

print("--- TOP PRODUTOS POR FATURAMENTO ---")
for name, rev in prod_rev.most_common():
    q = prod_qty[name]
    print(f"{name:25}: {q:4} un | R$ {rev:8.2f} (Preço Médio: R$ {rev/q:.2f})")

# Cross-selling analysis: What is bought together?
pair_counts = Counter()
for pid, prods in order_items.items():
    uniq = sorted(set(prods))
    for i in range(len(uniq)):
        for j in range(i+1, len(uniq)):
            pair_counts[(uniq[i], uniq[j])] += 1

print("\n--- COMBINAÇÕES MAIS FREQUENTES NO MESMO PEDIDO ---")
for pair, count in pair_counts.most_common(10):
    print(f"{pair[0]} + {pair[1]}: {count} vezes")

# Orders with single item vs multi item
single_item_orders = sum(1 for p, prods in order_items.items() if len(prods) == 1)
multi_item_orders = sum(1 for p, prods in order_items.items() if len(prods) > 1)
print(f"\nPedidos de 1 único item: {single_item_orders} ({single_item_orders/len(order_items)*100:.1f}%)")
print(f"Pedidos de 2+ itens:      {multi_item_orders} ({multi_item_orders/len(order_items)*100:.1f}%)")
