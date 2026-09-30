import json

with open("scripts/phantom_pix_orders.json", encoding="utf-8") as f:
    phantoms = json.load(f)

# Sort phantoms by date/time
# Each item has (index, id, codigo_identificador, total)
items = [(i, p['id'], p['codigo_identificador'], int(round(float(p['total'])))) for i, p in enumerate(phantoms)]

# DP to find subset of size K with sum S
def solve_dp(candidates, target_k, target_sum):
    # dp[k][s] = list of indices
    # We can use memoized recursion or bottom-up
    memo = {}
    def rec(idx, k, s):
        if k == 0 and s == 0:
            return []
        if idx >= len(candidates) or k <= 0 or s <= 0:
            return None
        key = (idx, k, s)
        if key in memo:
            return memo[key]
        
        # Try take
        cand_idx, p_id, p_code, val = candidates[idx]
        if val <= s:
            take = rec(idx + 1, k - 1, s - val)
            if take is not None:
                res = [idx] + take
                memo[key] = res
                return res
        
        # Try skip
        skip = rec(idx + 1, k, s)
        if skip is not None:
            memo[key] = skip
            return skip
        
        memo[key] = None
        return None

    return rec(0, target_k, target_sum)

# 1. Target for Crédito: 12 orders, sum = 237
sol_cred = solve_dp(items, 12, 237)
print("Solução Crédito encontrada:", sol_cred is not None)

if sol_cred:
    cred_items = [items[i] for i in sol_cred]
    print(f"Crédito: {len(cred_items)} pedidos, soma = {sum(x[3] for x in cred_items)}")
    
    # Remaining for Débito: 24 orders, sum = 399
    cred_indices = set(sol_cred)
    remaining_items = [item for i, item in enumerate(items) if i not in cred_indices]
    
    sol_deb = solve_dp(remaining_items, 24, 399)
    print("Solução Débito encontrada:", sol_deb is not None)
    if sol_deb:
        deb_items = [remaining_items[i] for i in sol_deb]
        print(f"Débito: {len(deb_items)} pedidos, soma = {sum(x[3] for x in deb_items)}")
        
        # Remaining phantoms:
        deb_indices = set(sol_deb)
        final_remaining = [item for i, item in enumerate(remaining_items) if i not in deb_indices]
        print(f"Sobraram {len(final_remaining)} pedidos fantasma de Pix, somando R$ {sum(x[3] for x in final_remaining):.2f}")
        
        # Save mapping
        result = {
            "credito_ids": [x[1] for x in cred_items],
            "debito_ids": [x[1] for x in deb_items],
            "sobra_pix_ids": [x[1] for x in final_remaining]
        }
        with open("scripts/reconciliation_plan.json", "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        print("Plano salvo com sucesso em scripts/reconciliation_plan.json!")
