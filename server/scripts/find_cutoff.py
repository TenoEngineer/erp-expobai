import json

with open("pedidos_db.json", encoding="utf-8") as f:
    orders = json.load(f)

# Test different cut-offs on 27/09 and 28/09 to see where Sicredi 299 sales / 5.927,02 matches!
card_orders = [o for o in orders if o['forma_pagamento'] in ('credito', 'debito')]

print(f"Total de vendas em cartão no banco: {len(card_orders)}")

# Let's sort by time
card_orders.sort(key=lambda x: x['data_hora_local'])

# Cumulative count and sum
running_count = 0
running_sum = 0.0
target_found = []

for i, o in enumerate(card_orders):
    running_count += 1
    running_sum += float(o['total'])
    if running_count == 299:
        print(f"Ao atingir 299 vendas: Data/Hora = {o['data_hora_local']} | Soma acumulada = R$ {running_sum:.2f} (Sicredi é R$ 5.927,02)")
    if running_sum >= 5900 and running_sum <= 6000:
        target_found.append((running_count, running_sum, o['data_hora_local'], o['codigo_identificador']))

print(f"\nPontos onde a soma acumulada chega perto de R$ 5.927,02:")
for t in target_found[:10]:
    print(f"  Vendas: {t[0]:3} | Soma: R$ {t[1]:7.2f} | Hora: {t[2]} | Pedido: {t[3]}")
