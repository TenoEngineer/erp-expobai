import subprocess
import json
import re

# Query database via SSH with psql -t -A
cmd = [
    "ssh", "root@5.182.17.36",
    'docker exec -i postgres-main psql -U postgres -d expobai_db -t -A -c "SELECT json_agg(p) FROM (SELECT id, numero_pedido, codigo_identificador, total, forma_pagamento, valor_pago, troco, status, pagamentos, to_char(data_hora AT TIME ZONE \'America/Campo_Grande\', \'YYYY-MM-DD HH24:MI:SS\') as data_hora_local FROM expobai.pedidos ORDER BY id) p;"'
]

res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
if res.returncode != 0:
    print("Error querying db:", res.stderr)
else:
    raw = res.stdout.strip()
    data = json.loads(raw)
    with open("pedidos_db.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Sucesso! Total de pedidos no banco: {len(data)}")
