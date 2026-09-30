import json

with open("pedidos_db.json", encoding="utf-8") as f:
    orders = json.load(f)

with open("scripts/reconciliation_plan.json", encoding="utf-8") as f:
    plan = json.load(f)

cred_ids = set(plan['credito_ids'])
deb_ids = set(plan['debito_ids'])
sobra_ids = plan['sobra_pix_ids']

print("Crédito IDs a atualizar:", len(cred_ids))
print("Débito IDs a atualizar:", len(deb_ids))
print("Sobra Pix IDs disponíveis:", len(sobra_ids))

# Let's see which sobra_pix_ids to change to 'dinheiro'
# We have 21 sobra_pix_ids.
# Let's inspect them:
sobra_orders = [o for o in orders if o['id'] in sobra_ids]
for o in sorted(sobra_orders, key=lambda x: float(x['total']), reverse=True):
    print(f"ID: {o['id']:4} | {o['codigo_identificador']:7} | {o['data_hora_local']} | R$ {float(o['total']):6.2f}")
