import pypdf
import re
import json

reader = pypdf.PdfReader(r"C:\Users\heito\Downloads\644d6e47-38c6-47e5-8cf2-b8368328a477-2026-09-23-2026-09-29.pdf")

# Extract all lines preserving order across pages
raw_lines = []
for p in reader.pages:
    txt = p.extract_text()
    for l in txt.split('\n'):
        raw_lines.append(l.strip())

# Clean up headers and footers that repeat on each page
filtered_lines = []
for l in raw_lines:
    if not l:
        continue
    if any(h in l for h in [
        "KATIA LUCIANA MULLER", "CNPJ", "VALORES EM R$",
        "Tem alguma dúvida?", "Caso a solução", "Extrato gerado dia",
        "Nu Financeira S.A.", "Nu Pagamentos S.A.", "Asseguramos a autenticidade",
        "O saldo líquido", "Não nos responsabilizamos", "Movimentações",
        "Saldo final do período", "Rendimento líquido", "Saldo inicial", "34446746-2"
    ]):
        continue
    filtered_lines.append(l)

# Now iterate and parse entries
current_date = "23 SET 2026"
transactions = []
current_entry_lines = []

i = 0
while i < len(filtered_lines):
    line = filtered_lines[i]
    i += 1
    
    # Check date header
    m_date = re.match(r'^(\d{2}\s+[A-Z]{3}\s+\d{4})\s+Total de entradas', line)
    if m_date:
        current_date = m_date.group(1)
        continue
    
    if line.startswith("Saldo do dia") or line.startswith("Total de saídas") or line.startswith("Total de entradas"):
        continue

    # Look for transaction start
    is_start = any(line.startswith(prefix) for prefix in [
        "Transferência recebida pelo Pix",
        "Transferência Recebida",
        "Transferência enviada pelo Pix",
        "Compra no débito",
        "Pagamento de boleto efetuado"
    ])
    
    if is_start:
        current_entry_lines = [line]
        first_line = line
        # Collect until we find the amount
        while i < len(filtered_lines):
            sub_line = filtered_lines[i]
            
            # Check if this sub_line has an amount
            m_end_amt = re.search(r'(\d{1,3}(?:\.\d{3})*,\d{2})$', sub_line)
            
            # Check if new date header intervened
            m_date_sub = re.match(r'^(\d{2}\s+[A-Z]{3}\s+\d{4})\s+Total de entradas', sub_line)
            if m_date_sub:
                current_date = m_date_sub.group(1)
                i += 1
                continue
                
            if sub_line.startswith("Saldo do dia") or sub_line.startswith("Total de"):
                i += 1
                continue

            if m_end_amt:
                amt_str = m_end_amt.group(1)
                prefix_text = sub_line[:m_end_amt.start()].strip()
                if prefix_text:
                    current_entry_lines.append(prefix_text)
                full_desc = " ".join(current_entry_lines)
                val = float(amt_str.replace('.', '').replace(',', '.'))
                tipo = "entrada" if ("recebida" in first_line.lower()) else "saida"
                transactions.append({
                    "data": current_date,
                    "descricao": full_desc,
                    "valor": val,
                    "tipo": tipo
                })
                i += 1
                current_entry_lines = []
                break
            else:
                current_entry_lines.append(sub_line)
                i += 1

entradas = [t for t in transactions if t['tipo'] == 'entrada']
saidas = [t for t in transactions if t['tipo'] == 'saida']

print(f"Total de transações: {len(transactions)}")
print(f"Entradas: {len(entradas)} | Soma: R$ {sum(t['valor'] for t in entradas):.2f}")
print(f"Saídas: {len(saidas)} | Soma: R$ {sum(t['valor'] for t in saidas):.2f}")

from collections import defaultdict
by_date = defaultdict(lambda: {'count': 0, 'total': 0.0})
for t in entradas:
    by_date[t['data']]['count'] += 1
    by_date[t['data']]['total'] += t['valor']

for d, v in sorted(by_date.items()):
    print(f"  {d}: {v['count']} recebimentos | R$ {v['total']:.2f}")

with open("scripts/nubank_final_entradas.json", "w", encoding="utf-8") as f:
    json.dump(entradas, f, ensure_ascii=False, indent=2)
