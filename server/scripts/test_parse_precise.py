import pypdf
import re
import json

reader = pypdf.PdfReader(r"C:\Users\heito\Downloads\644d6e47-38c6-47e5-8cf2-b8368328a477-2026-09-23-2026-09-29.pdf")
full_text = ""
for page in reader.pages:
    full_text += page.extract_text() + "\n"

# Remove page markers and standard footers/headers
lines = full_text.split('\n')

current_date = None
transactions = []
current_type = None
current_desc_lines = []

# Keywords that start a transaction
TX_STARTS = [
    "Transferência recebida pelo Pix",
    "Transferência Recebida",
    "Transferência enviada pelo Pix",
    "Compra no débito",
    "Pagamento de boleto efetuado"
]

date_regex = re.compile(r'^(\d{2}\s+[A-Z]{3}\s+\d{4})')
amount_regex = re.compile(r'(\d{1,3}(?:\.\d{3})*,\d{2})$')

i = 0
while i < len(lines):
    line = lines[i].strip()
    i += 1
    if not line:
        continue

    # Date header check (e.g., "24 SET 2026 Total de entradas + 270,00" or just "24 SET 2026")
    m_date = date_regex.match(line)
    if m_date and any(kw in line for kw in ["Total de entradas", "Total de saídas", "Movimentações"]):
        current_date = m_date.group(1)
        continue

    # Check if this line starts a transaction
    matched_start = None
    for start_kw in TX_STARTS:
        if line.startswith(start_kw):
            matched_start = start_kw
            break

    if matched_start:
        # Start new transaction
        desc = [line]
        # Collect subsequent lines until we hit an amount line
        # Note: sometimes the amount is on the same line, e.g. "COOP 21,00"
        while i < len(lines):
            next_line = lines[i].strip()
            
            # Check if next_line is a new transaction start or date header or footer
            if any(next_line.startswith(s) for s in TX_STARTS) or (date_regex.match(next_line) and "Total" in next_line):
                break
            if "Saldo do dia" in next_line or "Total de" in next_line:
                i += 1
                break
            if any(ignore in next_line for ignore in ["KATIA LUCIANA", "CNPJ", "VALORES EM R$", "Extrato gerado", "Tem alguma dúvida?", "Caso a solução", "Nu Financeira"]):
                i += 1
                continue

            # Check if line ends with amount or IS amount
            amt_match = amount_regex.search(next_line)
            if amt_match:
                # Could be pure amount "15,00" or "text ... 15,00"
                full_val_str = amt_match.group(1)
                text_before = next_line[:amt_match.start()].strip()
                if text_before:
                    desc.append(text_before)
                i += 1
                val = float(full_val_str.replace('.', '').replace(',', '.'))
                tipo = "entrada" if ("recebida" in matched_start.lower() or "recebida" in " ".join(desc).lower()) else "saida"
                transactions.append({
                    "data": current_date,
                    "tipo": tipo,
                    "tipo_tx": matched_start,
                    "descricao": " ".join(desc),
                    "valor": val
                })
                break
            else:
                desc.append(next_line)
                i += 1

print(f"Total de transações identificadas: {len(transactions)}")
entradas = [t for t in transactions if t['tipo'] == 'entrada']
saidas = [t for t in transactions if t['tipo'] == 'saida']
print(f"Total entradas: {len(entradas)} | Soma: R$ {sum(t['valor'] for t in entradas):.2f}")
print(f"Total saídas: {len(saidas)} | Soma: R$ {sum(t['valor'] for t in saidas):.2f}")

from collections import defaultdict
by_date = defaultdict(lambda: {'count': 0, 'total': 0.0})
for t in entradas:
    by_date[t['data']]['count'] += 1
    by_date[t['data']]['total'] += t['valor']

for d in sorted(by_date.keys()):
    v = by_date[d]
    print(f"  {d}: {v['count']} recebimentos | R$ {v['total']:.2f}")

with open("nubank_entradas_parsed.json", "w", encoding="utf-8") as f:
    json.dump(entradas, f, ensure_ascii=False, indent=2)
