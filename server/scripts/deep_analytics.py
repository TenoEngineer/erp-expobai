import json
from collections import defaultdict, Counter

with open("pedidos_db.json", encoding="utf-8") as f:
    orders = json.load(f)

# Hourly distribution (using local hour)
hourly = defaultdict(lambda: {"count": 0, "sum": 0.0})
for o in orders:
    # data_hora_local: YYYY-MM-DD HH:MM:SS
    hour = o['data_hora_local'][11:13]
    hourly[hour]["count"] += 1
    hourly[hour]["sum"] += float(o['total'])

print("--- VENDAS POR HORA (AMAMBAI/MS) ---")
for h in sorted(hourly.keys()):
    v = hourly[h]
    print(f"Hora {h}h: {v['count']:3} pedidos | R$ {v['sum']:7.2f} (Ticket Médio: R$ {v['sum']/v['count']:.2f})")

# Daily evolution
daily = defaultdict(lambda: {"count": 0, "sum": 0.0})
for o in orders:
    d = o['data_hora_local'][:10]
    daily[d]["count"] += 1
    daily[d]["sum"] += float(o['total'])

print("\n--- EVOLUÇÃO DIÁRIA ---")
for d in sorted(daily.keys()):
    v = daily[d]
    print(f"{d}: {v['count']:3} pedidos | R$ {v['sum']:7.2f} (Ticket Médio: R$ {v['sum']/v['count']:.2f})")
