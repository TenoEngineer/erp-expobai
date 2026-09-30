import json
from itertools import combinations

with open("scripts/phantom_pix_orders.json", encoding="utf-8") as f:
    phantoms = json.load(f)

# Sort phantoms by date/time (most on 26, 27, 28)
print(f"Total phantoms: {len(phantoms)}")

# We want:
# 12 orders summing to 237.00 (credito)
# 24 orders summing to 399.00 (debito)
# Let's search for subsets!

# Helper to find subset
def find_k_subset(items, k, target_sum):
    vals = [(i, float(x['total'])) for i, x in enumerate(items)]
    for comb in combinations(vals, k):
        if abs(sum(c[1] for c in comb) - target_sum) < 0.01:
            return [c[0] for c in comb]
    return None

cred_indices = find_k_subset(phantoms, 12, 237.0)
if cred_indices:
    print(f"Encontrado subset para Crédito: 12 pedidos somando R$ 237.00!")
    cred_set = set(cred_indices)
    remaining_phantoms = [p for i, p in enumerate(phantoms) if i not in cred_set]
    deb_indices = find_k_subset(remaining_phantoms, 24, 399.0)
    if deb_indices:
        print(f"Encontrado subset para Débito: 24 pedidos somando R$ 399.00!")
    else:
        # Check closest
        print("Buscando melhor aproximação para débito...")
else:
    print("Tentando busca combinada...")
