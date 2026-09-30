import json

with open("pedidos_db.json", encoding="utf-8") as f:
    orders = json.load(f)

check_values = [108.0, 63.0, 38.0, 27.0, 120.0, 70.0, 51.0, 48.0, 57.0, 72.0, 85.0]

print("=== PEDIDOS NO BANCO COM VALORES ESPECÍFICOS ===")
for o in orders:
    tot = float(o['total'])
    if tot in check_values:
        print(f"ID: {o['id']:4} | {o['codigo_identificador']:7} | {o['data_hora_local']} | Forma: {o['forma_pagamento']:8} | R$ {tot:6.2f} | Status: {o['status']}")
